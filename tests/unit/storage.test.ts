import { describe, it, expect } from 'vitest';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('InMemoryStorage', () => {
  it('saves and retrieves customers, subscriptions, invoices, usage, entitlements', async () => {
    const s = new InMemoryStorage();
    await s.saveCustomer({ id: 'c1', email: 'user@example.com' } as any);
    expect(await s.getCustomer('c1')).toMatchObject({ email: 'user@example.com' });

    await s.saveSubscription({ id: 'sub1', customerId: 'c1', planId: 'p', status: 'active', startDate: new Date() } as any);
    expect(await s.getSubscription('sub1')).toMatchObject({ customerId: 'c1' });

    await s.saveUsageRecord({ id: 'u1', customerId: 'c1', subscriptionId: 'sub1', metric: 'api_calls', quantity: 5, timestamp: new Date() });
    const usage = await s.listUsage('c1', 'api_calls');
    expect(usage.length).toBe(1);

    const invoice = { id: 'i1', customerId: 'c1', currency: 'USD', items: [], total: 0, status: 'draft', issuedAt: new Date() } as any;
    await s.recordInvoice(invoice);
    expect(await s.getInvoice('i1')).toMatchObject({ customerId: 'c1' });

    await s.saveEntitlements('c1', [{ featureKey: 'feature_x', limit: 10 }]);
    const ents = await s.getEntitlements('c1');
    expect(ents[0].featureKey).toBe('feature_x');
  });
});