import { BillingStorage } from '../core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord, Entitlement, Plan } from '../core/models/types';

export class InMemoryStorage implements BillingStorage {
  private customers = new Map<string, Customer>();
  private subscriptions = new Map<string, Subscription>();
  private invoices = new Map<string, Invoice>();
  private usage = new Map<string, UsageRecord[]>(); // key: customerId
  private entitlements = new Map<string, Entitlement[]>();
  private plans = new Map<string, Plan>();

  async saveCustomer(c: Customer): Promise<void> {
    this.customers.set(c.id, c);
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.customers.get(id) ?? null;
  }

  async saveSubscription(s: Subscription): Promise<void> {
    this.subscriptions.set(s.id, s);
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    return this.subscriptions.get(id) ?? null;
  }

  async saveUsageRecord(r: UsageRecord): Promise<void> {
    const list = this.usage.get(r.customerId) ?? [];
    list.push(r);
    this.usage.set(r.customerId, list);
  }

  async listUsage(customerId: string, metric?: string): Promise<UsageRecord[]> {
    const list = this.usage.get(customerId) ?? [];
    return metric ? list.filter((u) => u.metric === metric) : list;
  }

  async recordInvoice(inv: Invoice): Promise<void> {
    this.invoices.set(inv.id, inv);
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) ?? null;
  }

  async saveEntitlements(customerId: string, entries: Entitlement[]): Promise<void> {
    this.entitlements.set(customerId, entries);
  }

  async getEntitlements(customerId: string): Promise<Entitlement[]> {
    return this.entitlements.get(customerId) ?? [];
  }

  // Plans
  async savePlan(plan: Plan): Promise<void> {
    this.plans.set(plan.id, plan);
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.plans.get(id) ?? null;
  }

  async listPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }
}