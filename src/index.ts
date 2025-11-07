import EventEmitter from 'eventemitter3';
import { InMemoryStorage } from './storage/inMemory';
import {
  BillingConfig,
  BillingProvider,
  BillingStrategy,
  BillingStrategyInput,
} from './core/interfaces';
import {
  BillingEvent,
  Customer,
  Invoice,
  Plan,
  Subscription,
  UsageRecord,
} from './core/models/types';
import { FlatRateStrategy } from './core/strategies/flatRate';
import { UsageBasedStrategy } from './core/strategies/usageBased';
import { HybridStrategy } from './core/strategies/hybrid';
import { InvoiceService } from './services/invoice/InvoiceService';
import { SeatStrategy } from './core/strategies/seat';
import { PrepaidStrategy } from './core/strategies/prepaid';
import { ProrationService, ProrationInput } from './services/invoice/ProrationService';
import { DefaultLogger } from './services/logging/Logger';
import { InMemoryFeatureFlagProvider } from './services/feature/FeatureFlagService';
import { EntitlementChecker } from './services/entitlement/EntitlementChecker';
import { BillingUsageManager } from './services/billing/BillingUsageManager';
import { PlanRegistry } from './core/registry/PlanRegistry';
import { UsagePolicyService } from './services/usage/UsagePolicyService';

export class BillingCore {
  private providers: Record<string, BillingProvider> = {};
  private currentProvider?: BillingProvider;
  private storage: BillingConfig['storage'];
  private strategies: Record<string, BillingStrategy>;
  private events = new EventEmitter<{ event: BillingEvent }>();
  private invoiceService = new InvoiceService();
  private prorationService = new ProrationService();
  private usageManager: BillingUsageManager;
  private usagePolicy: UsagePolicyService;
  private planRegistry?: PlanRegistry;

  constructor(config: BillingConfig) {
    this.storage = config.storage ?? new InMemoryStorage();
    this.strategies = {
      flat: new FlatRateStrategy(),
      usage: new UsageBasedStrategy(),
      hybrid: new HybridStrategy(),
      seat: new SeatStrategy(),
      prepaid: new PrepaidStrategy(),
      ...(config.strategies ?? {}),
    };

    // Initialize services for usage handling abstraction
    const logger = new DefaultLogger();
    const flags = new InMemoryFeatureFlagProvider();
    const entChecker = new EntitlementChecker(this.storage);
    this.usagePolicy = new UsagePolicyService(this.storage);
    this.usageManager = new BillingUsageManager(this.storage, logger, flags, entChecker, this.usagePolicy);
  }

  use(name: string, provider: BillingProvider) {
    this.providers[name] = provider;
  }

  setProvider(name: string) {
    const p = this.providers[name];
    if (!p) throw new Error(`Provider '${name}' not registered`);
    this.currentProvider = p;
  }

  on(handler: (event: BillingEvent) => void) {
    this.events.on('event', handler);
  }

  off(handler: (event: BillingEvent) => void) {
    this.events.off('event', handler);
  }

  private emit(event: BillingEvent) {
    // Emitting a single channel to simplify consumers
    this.events.emit('event', event);
  }

  /** Accept an externally normalized event and emit to subscribers */
  receiveEvent(event: BillingEvent): void {
    this.emit(event);
  }

  async createCustomer(customer: Customer): Promise<string> {
    if (!this.currentProvider) throw new Error('No provider selected');
    const providerId = await this.currentProvider.createCustomer(customer);
    await this.storage.saveCustomer({ ...customer, externalId: providerId });
    return providerId;
  }

  async createSubscription(sub: Subscription, plan: Plan): Promise<Subscription> {
    if (!this.currentProvider) throw new Error('No provider selected');
    const created = await this.currentProvider.createSubscription(sub, plan);
    await this.storage.saveSubscription(created);
    this.emit({
      id: created.id,
      type: 'subscription.created',
      provider: 'core',
      createdAt: new Date(),
      payload: created,
    });
    return created;
  }

  async cancelSubscription(id: string): Promise<void> {
    if (!this.currentProvider) throw new Error('No provider selected');
    await this.currentProvider.cancelSubscription(id);
    this.emit({ id, type: 'subscription.canceled', provider: 'core', createdAt: new Date(), payload: {} });
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    await this.usageManager.recordUsage(record, this.currentProvider);
    this.emit({ id: record.id, type: 'usage.recorded', provider: 'core', createdAt: new Date(), payload: record });
  }

  async generateInvoiceFromStrategy(customerId: string, plan: Plan, input: Omit<BillingStrategyInput, 'plan'>): Promise<Invoice> {
    const strategy = this.strategies[plan.strategy];
    if (!strategy) throw new Error(`Unknown strategy '${plan.strategy}'`);
    const output = await strategy.computeCharge({ ...input, plan });
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      customerId,
      currency: output.total.currency,
      items: output.items,
      total: output.total.amount,
      status: 'open',
      issuedAt: new Date(),
    };
    await this.storage.recordInvoice(invoice);
    this.emit({ id: invoice.id, type: 'invoice.generated', provider: 'core', createdAt: new Date(), payload: invoice });
    return invoice;
  }

  async finalizeInvoiceWithProvider(inv: Invoice): Promise<Invoice> {
    if (!this.currentProvider) throw new Error('No provider selected');
    const finalized = await this.currentProvider.generateInvoice(inv);
    await this.storage.recordInvoice(finalized);
    this.emit({ id: finalized.id, type: 'invoice.generated', provider: 'core', createdAt: new Date(), payload: finalized });
    return finalized;
  }

  

  /** Shortcut: finalize invoice using the currently selected provider */
  async finalizeInvoice(inv: Invoice): Promise<Invoice> {
    return this.finalizeInvoiceWithProvider(inv);
  }

  async generateInvoicePdf(inv: Invoice): Promise<Buffer> {
    return this.invoiceService.generatePdf(inv);
  }

  async generateProrationInvoice(input: ProrationInput): Promise<Invoice> {
    const invoice = this.prorationService.generateInvoice(input);
    await this.storage.recordInvoice(invoice);
    this.emit({ id: invoice.id, type: 'invoice.generated', provider: 'core', createdAt: new Date(), payload: invoice });
    return invoice;
  }

  async generateProrationInvoiceForPlanChange(params: {
    oldPlan: Plan;
    newPlan: Plan;
    seats?: number;
    periodStart: Date;
    periodEnd: Date;
    changeDate: Date;
    customerId: string;
    subscriptionId?: string;
  }): Promise<Invoice> {
    const invoice = this.prorationService.generateInvoiceFromPlans(params);
    await this.storage.recordInvoice(invoice);
    this.emit({ id: invoice.id, type: 'invoice.generated', provider: 'core', createdAt: new Date(), payload: invoice });
    return invoice;
  }

  async savePlan(plan: Plan): Promise<void> {
    await this.storage.savePlan(plan);
    this.emit({ id: plan.id, type: 'plan.updated', provider: 'core', createdAt: new Date(), payload: plan });
  }

  // Plans
  async getPlanById(planId: string): Promise<Plan | null> {
    if (this.planRegistry) return this.planRegistry.getPlan(planId);
    return this.storage.getPlanById(planId);
  }

  async listPlans(): Promise<Plan[]> {
    if (this.planRegistry) return this.planRegistry.listPlans();
    return this.storage.listPlans();
  }

  async recordUsageWithPlanPolicy(params: { subscriptionId: string; metric: string; quantity: number; timestamp?: Date }): Promise<void> {
    const sub = await this.storage.getSubscription(params.subscriptionId);
    if (!sub) throw new Error(`Subscription not found: ${params.subscriptionId}`);
    const plan = await this.getPlanById(sub.planId);
    if (!plan) throw new Error(`Plan not found: ${sub.planId}`);
    const policy = this.usagePolicy.derivePolicyFromPlan(plan, params.metric);
    const record: UsageRecord = {
      id: `u_${Date.now()}`,
      customerId: sub.customerId,
      subscriptionId: sub.id,
      metric: params.metric,
      quantity: Math.max(0, Number(params.quantity ?? 0)),
      timestamp: params.timestamp ?? new Date(),
    };
    await this.usageManager.recordUsage(record, this.currentProvider, policy ? { policy } : {});
    this.emit({ id: record.id, type: 'usage.recorded', provider: 'core', createdAt: new Date(), payload: record });
  }

  // Registry integration
  setPlanRegistry(registry: PlanRegistry): void {
    this.planRegistry = registry;
    registry.attachToEvents(this.on.bind(this));
  }
}

export * from './core/models/types';
export * from './core/interfaces';
export * from './core/strategies/flatRate';
export * from './core/strategies/usageBased';
export * from './core/strategies/hybrid';
export * from './core/strategies/seat';
export * from './providers/stripe/StripeAdapter';
export * from './storage/inMemory';
export * from './sdk/index';