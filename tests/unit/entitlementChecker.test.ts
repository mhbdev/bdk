import { describe, it, expect } from 'vitest';
import { EntitlementChecker } from '../../src/services/entitlement/EntitlementChecker';
import { InMemoryStorage } from '../../src/storage/inMemory';

describe('EntitlementChecker', () => {
  it('returns granted with limit when entitlement exists', async () => {
    const storage = new InMemoryStorage();
    await storage.saveEntitlements('c1', [{ featureKey: 'feature_x', limit: 100 }]);
    const checker = new EntitlementChecker(storage);
    const res = await checker.hasEntitlement('c1', 'feature_x');
    expect(res.granted).toBe(true);
    expect(res.limit).toBe(100);
  });

  it('returns not granted when entitlement missing', async () => {
    const storage = new InMemoryStorage();
    const checker = new EntitlementChecker(storage);
    const res = await checker.hasEntitlement('c1', 'feature_y');
    expect(res.granted).toBe(false);
    expect(res.limit).toBeUndefined();
  });
});