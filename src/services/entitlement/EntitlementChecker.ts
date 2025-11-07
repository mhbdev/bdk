import { BillingStorage } from '../../core/interfaces';
import { Entitlement } from '../../core/models/types';

export interface EntitlementCheckResult {
  granted: boolean;
  limit?: number;
  entitlement?: Entitlement;
}

export class EntitlementChecker {
  constructor(private storage: BillingStorage) {}

  async hasEntitlement(customerId: string, featureKey: string): Promise<EntitlementCheckResult> {
    const entitlements = await this.storage.getEntitlements(customerId);
    const found = entitlements.find((e) => e.featureKey === featureKey);
    return {
      granted: !!found,
      limit: found?.limit,
      entitlement: found,
    };
  }
}