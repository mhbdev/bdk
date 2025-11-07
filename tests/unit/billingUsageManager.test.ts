import { describe, it, expect } from 'vitest';
import { BillingUsageManager } from '../../src/services/billing/BillingUsageManager';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { Logger } from '../../src/services/logging/Logger';
import { FeatureFlagProvider } from '../../src/services/feature/FeatureFlagService';
import { EntitlementChecker } from '../../src/services/entitlement/EntitlementChecker';
import { UsagePolicyService } from '../../src/services/usage/UsagePolicyService';
import { BillingProvider } from '../../src/core/interfaces';

class MockLogger implements Logger {
  logs: { level: string; message: string }[] = [];
  info(message: string): void { this.logs.push({ level: 'info', message }); }
  warn(message: string): void { this.logs.push({ level: 'warn', message }); }
  error(message: string): void { this.logs.push({ level: 'error', message }); }
}

class MockFlags implements FeatureFlagProvider {
  constructor(private enabled: boolean) {}
  async isEnabled(): Promise<boolean> { return this.enabled; }
}

describe('BillingUsageManager', () => {
  it('rejects when feature flag disabled', async () => {
    const storage = new InMemoryStorage();
    const logger = new MockLogger();
    const manager = new BillingUsageManager(
      storage,
      logger,
      new MockFlags(false),
      new EntitlementChecker(storage),
      new UsagePolicyService(storage),
    );
    await expect(manager.recordUsage({ id: 'u', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 1, timestamp: new Date() }, undefined, { featureFlagKey: 'm' }))
      .rejects.toThrow(/feature flag disabled/);
    expect(logger.logs.some((l) => l.level === 'warn')).toBe(true);
  });

  it('rejects when entitlement missing', async () => {
    const storage = new InMemoryStorage();
    const logger = new MockLogger();
    const manager = new BillingUsageManager(storage, logger, new MockFlags(true), new EntitlementChecker(storage), new UsagePolicyService(storage));
    await expect(manager.recordUsage({ id: 'u', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 1, timestamp: new Date() }, undefined, { entitlementKey: 'feature_x' }))
      .rejects.toThrow(/entitlement not granted/);
  });

  it('rejects when usage limit exceeded', async () => {
    const storage = new InMemoryStorage();
    const logger = new MockLogger();
    const manager = new BillingUsageManager(storage, logger, new MockFlags(true), new EntitlementChecker(storage), new UsagePolicyService(storage));
    await storage.saveUsageRecord({ id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 10, timestamp: new Date() });
    await expect(manager.recordUsage({ id: 'u2', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 15, timestamp: new Date() }, undefined, { policy: { metric: 'm', maxPerPeriod: 20 } }))
      .rejects.toThrow(/maxPerPeriod_exceeded/);
  });

  it('logs provider error but still records locally', async () => {
    const storage = new InMemoryStorage();
    const logger = new MockLogger();
    const manager = new BillingUsageManager(storage, logger, new MockFlags(true), new EntitlementChecker(storage), new UsagePolicyService(storage));
    const provider: BillingProvider = {
      async createCustomer() { return 'x'; }, async createSubscription(s) { return s; }, async cancelSubscription() {}, async generateInvoice(inv) { return inv; }, async handleWebhook(e) { return { id: 'e', type: 'usage.recorded', provider: 'mock', createdAt: new Date(), payload: e }; },
      async recordUsage() { throw new Error('provider down'); },
    };
    await manager.recordUsage({ id: 'u', customerId: 'c', subscriptionId: 's', metric: 'm', quantity: 1, timestamp: new Date() }, provider);
    const usage = await storage.listUsage('c', 'm');
    expect(usage.length).toBe(1);
    expect(logger.logs.some((l) => l.level === 'error')).toBe(true);
  });
});