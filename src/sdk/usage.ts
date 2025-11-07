import { BillingCore } from '../index';

export async function record(core: BillingCore, params: {
  subscriptionId: string;
  metric: string;
  quantity: number;
  timestamp?: Date;
}): Promise<void> {
  await core.recordUsageWithPlanPolicy(params);
}