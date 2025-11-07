import { describe, it, expect } from 'vitest';
import { InMemoryFeatureFlagProvider } from '../../src/services/feature/FeatureFlagService';

describe('FeatureFlagService', () => {
  it('defaults to enabled when flag not present', async () => {
    const flags = new InMemoryFeatureFlagProvider({});
    expect(await flags.isEnabled('unknown', { customerId: 'c1' })).toBe(true);
  });

  it('respects disabled flag', async () => {
    const flags = new InMemoryFeatureFlagProvider({ feature_x: false });
    expect(await flags.isEnabled('feature_x', { customerId: 'c1' })).toBe(false);
  });
});