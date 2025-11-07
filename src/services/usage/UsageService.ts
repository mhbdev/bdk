import { BillingStorage } from '../../core/interfaces';
import { UsageRecord } from '../../core/models/types';

export class UsageService {
  constructor(private storage: BillingStorage) {}

  async recordUsage(record: UsageRecord): Promise<void> {
    await this.storage.saveUsageRecord(record);
  }

  async listUsage(customerId: string, metric?: string): Promise<UsageRecord[]> {
    return this.storage.listUsage(customerId, metric);
  }
}