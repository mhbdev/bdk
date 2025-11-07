import { BillingStrategy, BillingStrategyInput, BillingStrategyOutput } from '../interfaces';
import { InvoiceItem } from '../models/types';

export class FlatRateStrategy implements BillingStrategy {
  async computeCharge(input: BillingStrategyInput): Promise<BillingStrategyOutput> {
    const { plan } = input;
    const price = plan.pricing.find((p) => p.type === 'flat');
    if (!price) {
      throw new Error('FlatRateStrategy: plan has no flat price');
    }
    const item: InvoiceItem = {
      description: `${plan.name} (${price.billingInterval ?? 'one-time'})`,
      amount: price.unitAmount,
      currency: price.currency,
      quantity: 1,
    };
    return {
      total: { amount: item.amount, currency: item.currency },
      items: [item],
    };
  }
}