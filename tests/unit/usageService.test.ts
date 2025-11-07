import { describe, it, expect } from 'vitest';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { UsageService } from '../../src/services/usage/UsageService';

describe('UsageService', () => {
  it('records and lists usage', async () => {
    const storage = new InMemoryStorage();
    const svc = new UsageService(storage);
    await svc.recordUsage({ id: 'u1', customerId: 'c1', subscriptionId: 's1', metric: 'api_calls', quantity: 3, timestamp: new Date() });
    await svc.recordUsage({ id: 'u2', customerId: 'c1', subscriptionId: 's1', metric: 'api_calls', quantity: 7, timestamp: new Date() });
    const list = await svc.listUsage('c1', 'api_calls');
    expect(list.length).toBe(2);
    expect(list[0].metric).toBe('api_calls');
    expect(list[1].quantity).toBe(7);
  });
});