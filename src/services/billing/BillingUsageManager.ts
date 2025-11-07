import { BillingProvider, BillingStorage } from '../../core/interfaces';
import { UsageRecord } from '../../core/models/types';
import { Logger } from '../logging/Logger';
import { FeatureFlagProvider } from '../feature/FeatureFlagService';
import { EntitlementChecker } from '../entitlement/EntitlementChecker';
import { UsagePolicyService, UsageLimitPolicy } from '../usage/UsagePolicyService';

export interface RecordUsageOptions {
  featureFlagKey?: string; // optional feature flag to gate usage
  entitlementKey?: string; // optional entitlement required to record usage
  policy?: UsageLimitPolicy; // optional usage limits to enforce
}

export class BillingUsageManager {
  constructor(
    private storage: BillingStorage,
    private logger: Logger,
    private flags: FeatureFlagProvider,
    private entitlements: EntitlementChecker,
    private policies: UsagePolicyService,
  ) {}

  async recordUsage(
    record: UsageRecord,
    provider?: BillingProvider,
    opts: RecordUsageOptions = {},
  ): Promise<void> {
    // Feature flag evaluation
    if (opts.featureFlagKey) {
      const enabled = await this.flags.isEnabled(opts.featureFlagKey, { customerId: record.customerId });
      if (!enabled) {
        this.logger.warn('Feature flag disabled; usage rejected', { flag: opts.featureFlagKey, customerId: record.customerId });
        throw new Error('Usage rejected: feature flag disabled');
      }
    }

    // Entitlement verification
    if (opts.entitlementKey) {
      const ent = await this.entitlements.hasEntitlement(record.customerId, opts.entitlementKey);
      if (!ent.granted) {
        this.logger.warn('Entitlement missing; usage rejected', { entitlement: opts.entitlementKey, customerId: record.customerId });
        throw new Error('Usage rejected: entitlement not granted');
      }
    }

    // Rate limiting / usage limits
    if (opts.policy) {
      const check = await this.policies.validateWithinLimits(record.customerId, record.metric, Math.max(0, record.quantity || 0), opts.policy);
      if (!check.allowed) {
        this.logger.warn('Usage limit exceeded', { reason: check.reason, current: check.currentQuantity, attempted: check.attemptedQuantity, limit: check.limit, metric: record.metric, customerId: record.customerId });
        throw new Error(`Usage rejected: ${check.reason}`);
      }
    }

    // Local tracking first
    await this.storage.saveUsageRecord(record);

    // Forward to provider if present
    if (provider?.recordUsage) {
      try {
        await provider.recordUsage(record);
      } catch (err: any) {
        // Do not fail local recording; log the provider error for observability
        this.logger.error('Provider.recordUsage failed', { error: String(err?.message ?? err), customerId: record.customerId, metric: record.metric });
      }
    }
  }
}