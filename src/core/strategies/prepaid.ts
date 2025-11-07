import { BillingStrategy, BillingStrategyInput, BillingStrategyOutput } from '../interfaces';
import { InvoiceItem } from '../models/types';

/**
 * PrepaidStrategy
 * Computes a one-time top-up based on a flat price on the plan.
 * This is similar to a flat strategy but semantically indicates prepaid credit purchase.
 */
export class PrepaidStrategy implements BillingStrategy {
  async computeCharge(input: BillingStrategyInput): Promise<BillingStrategyOutput> {
    const { plan } = input;
    const base = plan.pricing.find((p) => p.type === 'flat');
    if (!base) throw new Error('PrepaidStrategy: plan must include a flat/top-up price');

    const item: InvoiceItem = {
      description: `${plan.name} prepaid top-up (${base.billingInterval ?? 'one-time'})`,
      amount: base.unitAmount,
      currency: base.currency,
      quantity: 1,
    };
    return {
      total: { amount: item.amount, currency: item.currency },
      items: [item],
    };
  }
}