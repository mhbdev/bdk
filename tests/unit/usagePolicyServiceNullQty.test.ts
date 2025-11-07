import { describe, it, expect } from 'vitest';
import { UsagePolicyService } from '../../src/services/usage/UsagePolicyService';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('UsagePolicyService null/undefined quantity branch', () => {
  it('treats undefined quantities as zero in aggregation', async () => {
    const storage = new InMemoryStorage();
    // Save a record without quantity to hit r.quantity || 0 path
    await storage.saveUsageRecord({ id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: undefined as any, timestamp: new Date() });
    const svc = new UsagePolicyService(storage);
    const res = await svc.validateWithinLimits('c', 'm', 3, { metric: 'm', maxPerPeriod: 10 });
    expect(res.allowed).toBe(true);
    expect(res.currentQuantity).toBe(0);
    expect(res.attemptedQuantity).toBe(3);
  });
});