import { BillingCore } from '../index';
import { Plan, Subscription } from '../core/models/types';

export async function start(billing: BillingCore, params: {
  customerId: string;
  plan?: Plan;
  planId?: string;
  seats?: number;
  periodStart: Date;
  periodEnd: Date;
  subscriptionId?: string;
  metadata?: Record<string, any>;
}): Promise<{ subscription: Subscription; invoice: any }> {
  const plan: Plan | null = params.plan ?? (params.planId ? await billing.getPlanById(params.planId) : null);
  if (!plan) throw new Error('Plan not provided or not found');
  const subscription: Subscription = {
    id: params.subscriptionId ?? `sub_${Date.now()}`,
    customerId: params.customerId,
    planId: plan.id,
    status: 'active',
    startDate: params.periodStart,
    metadata: params.metadata,
  };

  const created = await billing.createSubscription(subscription, plan);
  const invoice = await billing.generateInvoiceFromStrategy(params.customerId, plan, {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    seats: params.seats,
    usage: [],
  });
  const finalized = await billing.finalizeInvoice(invoice);
  return { subscription: created, invoice: finalized };
}