import { describe, it, expect } from 'vitest';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('InMemoryStorage branch paths', () => {
  it('returns null for missing customer/subscription/invoice', async () => {
    const s = new InMemoryStorage();
    expect(await s.getCustomer('none')).toBeNull();
    expect(await s.getSubscription('none')).toBeNull();
    expect(await s.getInvoice('none')).toBeNull();
  });

  it('filters usage by metric in listUsage', async () => {
    const s = new InMemoryStorage();
    const now = new Date();
    await s.saveUsageRecord({ id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'api_calls', quantity: 3, timestamp: now });
    await s.saveUsageRecord({ id: 'u2', customerId: 'c', subscriptionId: 's', metric: 'storage_gb', quantity: 5, timestamp: now });
    const api = await s.listUsage('c', 'api_calls');
    expect(api.length).toBe(1);
    expect(api[0].metric).toBe('api_calls');
  });
});