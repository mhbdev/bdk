import { BillingStrategy, BillingStrategyInput, BillingStrategyOutput } from '../interfaces';
import { InvoiceItem } from '../models/types';

export class SeatStrategy implements BillingStrategy {
  async computeCharge(input: BillingStrategyInput): Promise<BillingStrategyOutput> {
    const { plan, seats = 1 } = input;
    const price = plan.pricing.find((p) => p.type === 'flat');
    if (!price) throw new Error('SeatStrategy: plan must include a flat/base price');
    const qty = Math.max(1, seats);
    const amount = price.unitAmount * qty;
    const item: InvoiceItem = {
      description: `${plan.name} seats (${price.billingInterval ?? 'one-time'})`,
      amount,
      currency: price.currency,
      quantity: qty,
    };
    return { total: { amount, currency: price.currency }, items: [item] };
  }
}