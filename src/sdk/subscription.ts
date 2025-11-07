import { BillingCore } from '../index';
import { Plan, Subscription } from '../core/models/types';

export async function start(billing: BillingCore, params: {
  customerId: string;
  plan: Plan;
  seats?: number;
  periodStart: Date;
  periodEnd: Date;
  subscriptionId?: string;
  metadata?: Record<string, any>;
}): Promise<{ subscription: Subscription; invoice: any }> {
  const subscription: Subscription = {
    id: params.subscriptionId ?? `sub_${Date.now()}`,
    customerId: params.customerId,
    planId: params.plan.id,
    status: 'active',
    startDate: params.periodStart,
    metadata: params.metadata,
  };

  const created = await billing.createSubscription(subscription, params.plan);
  const invoice = await billing.generateInvoiceFromStrategy(params.customerId, params.plan, {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    seats: params.seats,
    usage: [],
  });
  const finalized = await billing.finalizeInvoice(invoice);
  return { subscription: created, invoice: finalized };
}