import { BillingStrategy, BillingStrategyInput, BillingStrategyOutput } from '../interfaces';
import { InvoiceItem } from '../models/types';

export class HybridStrategy implements BillingStrategy {
  async computeCharge(input: BillingStrategyInput): Promise<BillingStrategyOutput> {
    const { plan, usage = [] } = input;
    const base = plan.pricing.find((p) => p.type === 'flat');
    const variable = plan.pricing.find((p) => p.type === 'usage');
    if (!base || !variable) {
      throw new Error('HybridStrategy: plan must include flat and usage prices');
    }
    if (base.currency !== variable.currency) {
      throw new Error('HybridStrategy: base and usage prices must share the same currency');
    }

    const quantity = usage.reduce((sum, u) => sum + Math.max(0, (u.quantity || 0)), 0);
    const usageAmount = variable.tiers
      ? computeTieredAmount(quantity, variable.tiers)
      : quantity * variable.unitAmount;

    const items: InvoiceItem[] = [
      {
        description: `${plan.name} base (${base.billingInterval ?? 'one-time'})`,
        amount: base.unitAmount,
        currency: base.currency,
        quantity: 1,
      },
      {
        description: `${plan.name} usage${variable.metric ? ` (${variable.metric})` : ''}`,
        amount: usageAmount,
        currency: variable.currency,
        quantity,
      },
    ];

    const total = base.unitAmount + usageAmount;
    return {
      total: { amount: total, currency: base.currency },
      items,
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