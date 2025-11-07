import { describe, it, expect } from 'vitest';
import { EntitlementService } from '../../src/services/entitlement/EntitlementService';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { Entitlement } from '../../src/core/models/types';

describe('EntitlementService', () => {
  it('sets and gets entitlements for a customer', async () => {
    const storage = new InMemoryStorage();
    const svc = new EntitlementService(storage);
    const ents: Entitlement[] = [
      { featureKey: 'premium', limit: 10 },
      { featureKey: 'beta-access' },
    ];
    await svc.setEntitlements('c1', ents);
    const out = await svc.getEntitlements('c1');
    expect(out).toEqual(ents);
  });

  it('overwrites existing entitlements on subsequent set', async () => {
    const storage = new InMemoryStorage();
    const svc = new EntitlementService(storage);
    await svc.setEntitlements('c1', [ { featureKey: 'premium', limit: 10 } ]);
    await svc.setEntitlements('c1', [ { featureKey: 'basic' } ]);
    const out = await svc.getEntitlements('c1');
    expect(out).toEqual([ { featureKey: 'basic' } ]);
  });

  it('returns empty array for unknown customer', async () => {
    const storage = new InMemoryStorage();
    const svc = new EntitlementService(storage);
    const out = await svc.getEntitlements('does-not-exist');
    expect(out).toEqual([]);
  });

  it('supports clearing entitlements by setting empty array', async () => {
    const storage = new InMemoryStorage();
    const svc = new EntitlementService(storage);
    await svc.setEntitlements('c1', [ { featureKey: 'premium', limit: 10 } ]);
    await svc.setEntitlements('c1', []);
    const out = await svc.getEntitlements('c1');
    expect(out).toEqual([]);
  });

  it('stores duplicates as provided (no deduplication)', async () => {
    const storage = new InMemoryStorage();
    const svc = new EntitlementService(storage);
    const ents: Entitlement[] = [ { featureKey: 'dup' }, { featureKey: 'dup' } ];
    await svc.setEntitlements('c1', ents);
    const out = await svc.getEntitlements('c1');
    expect(out.length).toBe(2);
    expect(out[0].featureKey).toBe('dup');
    expect(out[1].featureKey).toBe('dup');
  });
});