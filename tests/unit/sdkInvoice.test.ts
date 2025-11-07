import { describe, it, expect } from 'vitest';
import * as sdkInvoice from '../../src/sdk/invoice';
import { BillingCore } from '../../src/index';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { Plan, UsageRecord } from '../../src/core/models/types';
import { BillingProvider } from '../../src/core/interfaces';

const mockProvider = (): BillingProvider => ({
  async createCustomer() { return 'prov_cust'; },
  async createSubscription(sub) { return { ...sub }; },
  async cancelSubscription() { /* noop */ },
  async recordUsage() { /* noop */ },
  async generateInvoice(inv) { return { ...inv, externalId: 'prov_inv' }; },
  async handleWebhook(event: any) { return { id: 'e', type: 'invoice.generated', provider: 'mock', createdAt: new Date(), payload: event }; },
});

const usagePlan: Plan = {
  id: 'p_usage', productId: 'prod_usage', name: 'Usage', currency: 'USD',
  pricing: [ { id: 'price_u', type: 'usage', currency: 'USD', unitAmount: 100, metric: 'units' } ],
  strategy: 'usage',
};

describe('SDK invoice helpers', () => {
  it('generateUsage uses provided metric and clamps quantity', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('mock', mockProvider());
    core.setProvider('mock');
    const inv = await sdkInvoice.generateUsage(core, {
      customerId: 'c', plan: usagePlan, quantity: -5, metric: 'api_calls', periodStart: new Date(), periodEnd: new Date(), subscriptionId: 'sub1'
    });
    expect(inv.total).toBe(0); // negative clamped to 0 -> no usage charge
    expect(inv.currency).toBe('USD');
  });

  it('generateUsage falls back to plan metric or default', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    // Plan without usage metric (flat strategy), should default to 'units'
    const flatPlan: Plan = {
      id: 'p_flat', productId: 'prod_flat', name: 'Flat', currency: 'USD',
      pricing: [ { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 500 } ],
      strategy: 'flat', basePriceId: 'price_base'
    };
    const inv = await sdkInvoice.generateUsage(core, {
      customerId: 'c', plan: flatPlan, quantity: 3, periodStart: new Date(), periodEnd: new Date(), subscriptionId: 'sub2'
    });
    expect(inv.items.length).toBe(1);
    expect(inv.total).toBe(500);
    expect(inv.currency).toBe('USD');
  });

  it('generateHybrid delegates to generateUsage', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    const inv1 = await sdkInvoice.generateUsage(core, {
      customerId: 'c', plan: usagePlan, quantity: 2, periodStart: new Date(), periodEnd: new Date(), subscriptionId: 'sub3'
    });
    const inv2 = await sdkInvoice.generateHybrid(core, {
      customerId: 'c', plan: usagePlan, quantity: 2, periodStart: new Date(), periodEnd: new Date(), subscriptionId: 'sub3'
    });
    expect(inv2.total).toBe(inv1.total);
  });

  it('recordUsage delegates to core', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    const rec: UsageRecord = { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'units', quantity: 4, timestamp: new Date() };
    await sdkInvoice.recordUsage(core, rec);
    const list = await storage.listUsage('c');
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('u1');
  });

  it('finalizeInvoice delegates to provider', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('mock', mockProvider());
    core.setProvider('mock');
    const inv = await core.generateInvoiceFromStrategy('c', usagePlan, { periodStart: new Date(), periodEnd: new Date(), usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'units', quantity: 1, timestamp: new Date() } ] });
    const finalized = await sdkInvoice.finalizeInvoice(core, inv);
    expect(finalized.externalId).toBe('prov_inv');
  });
});