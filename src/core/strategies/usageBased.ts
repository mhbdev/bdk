import { BillingStrategy, BillingStrategyInput, BillingStrategyOutput } from '../interfaces';
import { InvoiceItem } from '../models/types';

export class UsageBasedStrategy implements BillingStrategy {
  async computeCharge(input: BillingStrategyInput): Promise<BillingStrategyOutput> {
    const { plan, usage = [] } = input;
    const price = plan.pricing.find((p) => p.type === 'usage');
    if (!price) {
      throw new Error('UsageBasedStrategy: plan has no usage price');
    }

    const quantity = usage.reduce((sum, u) => sum + (u.quantity || 0), 0);
    const amount = price.tiers
      ? computeTieredAmount(quantity, price.tiers)
      : quantity * price.unitAmount;

    const item: InvoiceItem = {
      description: `${plan.name} usage${price.metric ? ` (${price.metric})` : ''}`,
      amount,
      currency: price.currency,
      quantity,
    };
    return {
      total: { amount, currency: price.currency },
      items: [item],
    };
  }
}

function computeTieredAmount(quantity: number, tiers: { upTo: number; unitAmount: number }[]): number {
  let remaining = quantity;
  let total = 0;
  for (const tier of tiers) {
    const inTier = Math.min(remaining, tier.upTo);
    total += inTier * tier.unitAmount;
    remaining -= inTier;
    if (remaining <= 0) break;
  }
  if (remaining > 0) {
    const last = tiers[tiers.length - 1];
    total += remaining * last.unitAmount;
  }
  return total;
}