import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src/index';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('BillingCore events', () => {
  it('emits invoice.generated when generating invoice from strategy', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    let seen = false;
    core.on((evt) => {
      if (evt.type === 'invoice.generated') seen = true;
    });
    const plan = {
      id: 'p', productId: 'prod', name: 'Hybrid', currency: 'USD', strategy: 'hybrid',
      pricing: [
        { id: 'flat', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' },
        { id: 'usage', type: 'usage', currency: 'USD', unitAmount: 5, metric: 'events' },
      ],
    } as any;
    await core.generateInvoiceFromStrategy('c', plan, {
      periodStart: new Date(), periodEnd: new Date(),
      usage: [{ id: 'u', customerId: 'c', subscriptionId: 's', metric: 'events', quantity: 2, timestamp: new Date() }],
    });
    expect(seen).toBe(true);
  });
});