import { BillingStorage } from '../../core/interfaces';
import { Entitlement } from '../../core/models/types';

export class EntitlementService {
  constructor(private storage: BillingStorage) {}

  async setEntitlements(customerId: string, entitlements: Entitlement[]): Promise<void> {
    await this.storage.saveEntitlements(customerId, entitlements);
  }

  async getEntitlements(customerId: string): Promise<Entitlement[]> {
    return this.storage.getEntitlements(customerId);
  }
}