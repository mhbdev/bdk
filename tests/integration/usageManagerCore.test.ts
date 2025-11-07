import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';

describe('Integration: BillingCore with usage manager', () => {
  it('records usage and emits event with provider forwarding', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    let forwarded = false;
    const provider: BillingProvider = {
      async createCustomer() { return 'x'; }, async createSubscription(s) { return s; }, async cancelSubscription() {}, async generateInvoice(inv) { return inv; }, async handleWebhook(e) { return { id: 'e', type: 'usage.recorded', provider: 'mock', createdAt: new Date(), payload: e }; },
      async recordUsage() { forwarded = true; },
    };
    core.use('mock', provider);
    core.setProvider('mock');

    let seen = false;
    core.on((evt) => { if (evt.type === 'usage.recorded') seen = true; });
    await core.recordUsage({ id: 'u', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 2, timestamp: new Date() });
    const usage = await storage.listUsage('c', 'm');
    expect(usage.length).toBe(1);
    expect(forwarded).toBe(true);
    expect(seen).toBe(true);
  });
});