import { describe, it, expect } from 'vitest';
import { BillingBuilder } from '../../src/sdk/BillingBuilder';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Plan, Subscription, Invoice } from '../../src/core/models/types';

const mockProvider = (): BillingProvider => ({
  async createCustomer() { return 'prov_cust'; },
  async createSubscription(sub: Subscription) { return { ...sub, externalId: 'prov_sub' }; },
  async cancelSubscription() { /* noop */ },
  async recordUsage() { /* noop */ },
  async generateInvoice(inv: Invoice) { return { ...inv, externalId: 'prov_inv' }; },
  async handleWebhook(event: any) {
    return { id: 'e', type: 'invoice.generated', provider: 'mock', createdAt: new Date(), payload: event };
  },
});

const flatPlan: Plan = {
  id: 'p_flat', productId: 'prod_flat', name: 'Flat', currency: 'USD',
  pricing: [ { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' } ],
  strategy: 'flat', basePriceId: 'price_base',
};

describe('BillingBuilder', () => {
  it('builds with default storage and no provider', async () => {
    const builder = BillingBuilder.inMemory();
    const core = builder.build();
    const inv = await core.generateInvoiceFromStrategy('c', flatPlan, { periodStart: new Date(), periodEnd: new Date(), usage: [] });
    expect(inv.total).toBe(1000);
    await expect(core.createSubscription({ id: 's1', customerId: 'c', planId: flatPlan.id, status: 'active', startDate: new Date() }, flatPlan)).rejects.toThrow(/No provider selected/);
  });

  it('registers provider and sets default when setDefault=true', async () => {
    const core = new BillingBuilder()
      .withProvider('mock', mockProvider(), true)
      .build();
    const created = await core.createSubscription({ id: 's2', customerId: 'c', planId: flatPlan.id, status: 'active', startDate: new Date() }, flatPlan);
    expect(created.externalId).toBe('prov_sub');
  });

  it('allows setting default later when setDefault=false', async () => {
    const builder = new BillingBuilder().withProvider('mock', mockProvider(), false);
    const core = builder.setDefaultProvider('mock').build();
    const created = await core.createSubscription({ id: 's3', customerId: 'c', planId: flatPlan.id, status: 'active', startDate: new Date() }, flatPlan);
    expect(created.externalId).toBe('prov_sub');
  });

  it('supports custom storage via withStorage', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingBuilder()
      .withStorage(storage)
      .withProvider('mock', mockProvider(), true)
      .build();
    const inv = await core.generateInvoiceFromStrategy('c', flatPlan, { periodStart: new Date(), periodEnd: new Date(), usage: [] });
    // Ensure invoice is recorded in provided storage
    const fetched = await storage.getInvoice(inv.id);
    expect(fetched?.id).toBe(inv.id);
  });

  it('supports withStripe without invoking provider methods', () => {
    const core = new BillingBuilder().withStripe({ apiKey: 'sk_test_key' }, true).build();
    // Avoid calling provider methods; just ensure core exists
    expect(core).toBeTruthy();
  });
});