import { BillingEvent, Customer, Invoice, Subscription, UsageRecord } from '../models/types';
import { InvoiceItem, Money, Plan, Entitlement } from '../models/types';

export interface BillingProvider {
  createCustomer(data: Customer): Promise<string>; // returns provider customer id
  createSubscription(sub: Subscription, plan: Plan): Promise<Subscription>;
  cancelSubscription(id: string): Promise<void>;
  recordUsage(record: UsageRecord): Promise<void>;
  generateInvoice(inv: Invoice): Promise<Invoice>;
  handleWebhook(event: any, headers?: Record<string, string>): Promise<BillingEvent>;
}

export interface BillingStrategyInput {
  plan: Plan;
  usage?: UsageRecord[];
  periodStart: Date;
  periodEnd: Date;
  seats?: number;
}

export interface BillingStrategyOutput {
  total: Money;
  items: InvoiceItem[];
}

export interface BillingStrategy {
  computeCharge(input: BillingStrategyInput): Promise<BillingStrategyOutput>;
}

export interface BillingStorage {
  saveCustomer(c: Customer): Promise<void>;
  getCustomer(id: string): Promise<Customer | null>;

  saveSubscription(s: Subscription): Promise<void>;
  getSubscription(id: string): Promise<Subscription | null>;

  saveUsageRecord(r: UsageRecord): Promise<void>;
  listUsage(customerId: string, metric?: string): Promise<UsageRecord[]>;

  recordInvoice(inv: Invoice): Promise<void>;
  getInvoice(id: string): Promise<Invoice | null>;

  saveEntitlements(customerId: string, entries: Entitlement[]): Promise<void>;
  getEntitlements(customerId: string): Promise<Entitlement[]>;

  // Plans
  savePlan(plan: Plan): Promise<void>;
  getPlanById(id: string): Promise<Plan | null>;
  listPlans(): Promise<Plan[]>;
}

export interface BillingConfig {
  provider?: string;
  storage: BillingStorage;
  strategies?: Record<string, BillingStrategy>;
}

// Entitlement type is defined in models/types and imported above