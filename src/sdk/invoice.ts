import { BillingCore } from '../index';
import { Invoice, Plan, UsageRecord } from '../core/models/types';

export async function generateUsage(
  billing: BillingCore,
  params: {
    customerId: string;
    plan: Plan;
    quantity: number;
    metric?: string;
    periodStart: Date;
    periodEnd: Date;
    subscriptionId?: string;
  }
) {
  const usage: UsageRecord[] = [
    {
      id: `u_${Date.now()}`,
      customerId: params.customerId,
      subscriptionId: params.subscriptionId ?? 'sub_usage',
      metric: params.metric ?? params.plan.pricing.find((p) => p.type === 'usage')?.metric ?? 'units',
      quantity: Math.max(0, params.quantity),
      timestamp: new Date(),
    },
  ];
  return billing.generateInvoiceFromStrategy(params.customerId, params.plan, {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    usage,
  });
}

export async function generateHybrid(
  billing: BillingCore,
  params: {
    customerId: string;
    plan: Plan;
    quantity: number;
    metric?: string;
    periodStart: Date;
    periodEnd: Date;
    subscriptionId?: string;
  }
) {
  // Hybrid uses the same usage array; base will be added by the strategy
  return generateUsage(billing, params);
}

export async function recordUsage(
  billing: BillingCore,
  record: UsageRecord,
) {
  return billing.recordUsage(record);
}

export async function finalizeInvoice(
  billing: BillingCore,
  inv: Invoice,
) {
  return billing.finalizeInvoice(inv);
}