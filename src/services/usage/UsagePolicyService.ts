import { BillingStorage } from '../../core/interfaces';
import { UsageRecord, Plan } from '../../core/models/types';

export interface UsageLimitPolicy {
  metric: string;
  maxPerPeriod?: number; // optional cap for a billing period
  maxTotal?: number; // optional lifetime cap
}

export interface UsagePolicyCheck {
  allowed: boolean;
  reason?: string;
  currentQuantity?: number;
  attemptedQuantity?: number;
  limit?: number;
}

export class UsagePolicyService {
  constructor(private storage: BillingStorage) {}

  async getCurrentUsage(customerId: string, metric?: string): Promise<UsageRecord[]> {
    return this.storage.listUsage(customerId, metric);
  }

  async validateWithinLimits(
    customerId: string,
    metric: string,
    attemptedQuantity: number,
    policy: UsageLimitPolicy,
  ): Promise<UsagePolicyCheck> {
    const current = await this.getCurrentUsage(customerId, metric);
    const currentQty = current.reduce((sum, r) => sum + Math.max(0, r.quantity || 0), 0);
    if (policy.maxPerPeriod != null && currentQty + attemptedQuantity > policy.maxPerPeriod) {
      return { allowed: false, reason: 'maxPerPeriod_exceeded', currentQuantity: currentQty, attemptedQuantity, limit: policy.maxPerPeriod };
    }
    if (policy.maxTotal != null && currentQty + attemptedQuantity > policy.maxTotal) {
      return { allowed: false, reason: 'maxTotal_exceeded', currentQuantity: currentQty, attemptedQuantity, limit: policy.maxTotal };
    }
    return { allowed: true, currentQuantity: currentQty, attemptedQuantity };
  }

  derivePolicyFromPlan(plan: Plan, metric: string): UsageLimitPolicy | null {
    const limits = (plan.metadata?.usageLimits ?? {}) as Record<string, any>;
    const m = limits[metric];
    if (!m) return null;
    const policy: UsageLimitPolicy = {
      metric,
      maxPerPeriod: typeof m.maxPerPeriod === 'number' ? m.maxPerPeriod : undefined,
      maxTotal: typeof m.maxTotal === 'number' ? m.maxTotal : undefined,
    };
    if (policy.maxPerPeriod == null && policy.maxTotal == null) return null;
    return policy;
  }
}