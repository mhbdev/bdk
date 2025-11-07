import { describe, it, expect } from 'vitest';
import { UsagePolicyService } from '../../src/services/usage/UsagePolicyService';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('UsagePolicyService boundary branches', () => {
  it('allows exactly-at-limit for maxPerPeriod and maxTotal', async () => {
    const storage = new InMemoryStorage();
    // seed current usage of 5 units
    await storage.saveUsageRecord({ id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 5, timestamp: new Date() });
    const svc = new UsagePolicyService(storage);
    const res = await svc.validateWithinLimits('c', 'm', 5, { metric: 'm', maxPerPeriod: 10, maxTotal: 10 });
    expect(res.allowed).toBe(true);
    expect(res.currentQuantity).toBe(5);
    expect(res.attemptedQuantity).toBe(5);
  });
});