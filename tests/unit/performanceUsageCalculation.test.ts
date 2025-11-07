import { describe, it, expect } from 'vitest';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { UsagePolicyService } from '../../src/services/usage/UsagePolicyService';

describe('Performance: usage aggregation', () => {
  it('aggregates 5000 records quickly', async () => {
    const storage = new InMemoryStorage();
    const svc = new UsagePolicyService(storage);
    const N = 5000;
    const now = new Date();
    for (let i = 0; i < N; i++) {
      await storage.saveUsageRecord({ id: `u${i}`, customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 1, timestamp: now });
    }
    const start = Date.now();
    const res = await svc.validateWithinLimits('c', 'm', 10, { metric: 'm', maxPerPeriod: 10000 });
    const duration = Date.now() - start;
    expect(res.allowed).toBe(true);
    // Aim for sub-200ms on typical dev machines; adjust if needed
    expect(duration).toBeLessThan(200);
  });
});