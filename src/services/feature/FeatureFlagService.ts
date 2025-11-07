export interface FeatureContext {
  customerId: string;
  planId?: string;
  metadata?: Record<string, any>;
}

export interface FeatureFlagProvider {
  isEnabled(flagKey: string, context: FeatureContext): Promise<boolean>;
}

/** Simple in-memory feature flag provider for tests and defaults */
export class InMemoryFeatureFlagProvider implements FeatureFlagProvider {
  constructor(private flags: Record<string, boolean> = {}) {}

  async isEnabled(flagKey: string, _context: FeatureContext): Promise<boolean> {
    return this.flags[flagKey] ?? true;
  }
}