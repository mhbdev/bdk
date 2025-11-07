import { describe, it, expect } from 'vitest';
import { start } from '../../src/sdk/subscription';
import { BillingCore } from '../../src/index';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Plan } from '../../src/core/models/types';

const mockProvider = (): BillingProvider => ({
  async createCustomer() { return 'prov_cust'; },
  async createSubscription(sub) { return { ...sub, externalId: 'prov_sub' }; },
  async cancelSubscription() { /* noop */ },
  async recordUsage() { /* noop */ },
  async generateInvoice(inv) { return { ...inv, externalId: 'prov_inv' }; },
  async handleWebhook(event: any) { return { id: 'e', type: 'invoice.generated', provider: 'mock', createdAt: new Date(), payload: event }; },
});

const hybridPlan: Plan = {
  id: 'p1', productId: 'prod1', name: 'Hybrid', currency: 'USD',
  pricing: [
    { id: 'p1_base', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' },
    { id: 'p1_usage', type: 'usage', currency: 'USD', unitAmount: 100, metric: 'units' },
  ],
  strategy: 'hybrid', basePriceId: 'p1_base',
};

describe('SDK subscription.start', () => {
  it('creates subscription and finalizes invoice with default id', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('mock', mockProvider());
    core.setProvider('mock');
    const { subscription, invoice } = await start(core, {
      customerId: 'c', plan: hybridPlan, periodStart: new Date(), periodEnd: new Date(), seats: 2, metadata: { tag: 'x' }
    });
    expect(subscription.id).toMatch(/^sub_/);
    expect(subscription.externalId).toBe('prov_sub');
    expect(subscription.metadata?.tag).toBe('x');
    expect(invoice.externalId).toBe('prov_inv');
  });

  it('respects provided subscriptionId', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('mock', mockProvider());
    core.setProvider('mock');
    const { subscription } = await start(core, {
      customerId: 'c', plan: hybridPlan, periodStart: new Date(), periodEnd: new Date(), subscriptionId: 'sub_fixed'
    });
    expect(subscription.id).toBe('sub_fixed');
  });
});