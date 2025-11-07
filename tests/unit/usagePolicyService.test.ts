import { describe, it, expect } from 'vitest';
import { UsagePolicyService } from '../../src/services/usage/UsagePolicyService';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('UsagePolicyService', () => {
  it('validates within per-period limit', async () => {
    const storage = new InMemoryStorage();
    const svc = new UsagePolicyService(storage);
    // current usage 10
    await storage.saveUsageRecord({ id: 'u1', customerId: 'c1', subscriptionId: 's1', metric: 'api', quantity: 10, timestamp: new Date() });
    const res = await svc.validateWithinLimits('c1', 'api', 5, { metric: 'api', maxPerPeriod: 20 });
    expect(res.allowed).toBe(true);
  });

  it('rejects when exceeding per-period limit', async () => {
    const storage = new InMemoryStorage();
    const svc = new UsagePolicyService(storage);
    await storage.saveUsageRecord({ id: 'u1', customerId: 'c1', subscriptionId: 's1', metric: 'api', quantity: 15, timestamp: new Date() });
    const res = await svc.validateWithinLimits('c1', 'api', 10, { metric: 'api', maxPerPeriod: 20 });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('maxPerPeriod_exceeded');
  });

  it('validates maxTotal limits', async () => {
    const storage = new InMemoryStorage();
    const svc = new UsagePolicyService(storage);
    await storage.saveUsageRecord({ id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 5, timestamp: new Date() });
    const ok = await svc.validateWithinLimits('c', 'm', 4, { metric: 'm', maxTotal: 20 });
    expect(ok.allowed).toBe(true);
    const bad = await svc.validateWithinLimits('c', 'm', 30, { metric: 'm', maxTotal: 20 });
    expect(bad.allowed).toBe(false);
    expect(bad.reason).toBe('maxTotal_exceeded');
  });

  it('allows when no limits specified', async () => {
    const storage = new InMemoryStorage();
    const svc = new UsagePolicyService(storage);
    const res = await svc.validateWithinLimits('c', 'm', 10, { metric: 'm' });
    expect(res.allowed).toBe(true);
    expect(res.attemptedQuantity).toBe(10);
  });
});