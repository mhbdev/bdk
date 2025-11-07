import { BillingStrategyOutput } from '../../core/interfaces';
import { InvoiceItem, Plan, UsageRecord, Currency } from '../../core/models/types';
import { CurrencyConversionService } from '../currency/CurrencyConversionService';

export class HybridPricingService {
  constructor(private converter: CurrencyConversionService) {}

  async computeChargeWithConversion(params: {
    plan: Plan;
    usage?: UsageRecord[];
    periodStart: Date;
    periodEnd: Date;
    targetCurrency?: Currency; // default: base price currency
  }): Promise<BillingStrategyOutput> {
    const { plan, usage = [] } = params;
    const base = plan.pricing.find((p) => p.type === 'flat');
    const variable = plan.pricing.find((p) => p.type === 'usage');
    if (!base || !variable) throw new Error('HybridPricingService: plan must include flat and usage prices');

    const targetCurrency = params.targetCurrency ?? base.currency;

    const quantity = usage.reduce((sum, u) => sum + Math.max(0, (u.quantity || 0)), 0);
    let usageAmountSource: number;
    if (variable.tiers) {
      usageAmountSource = computeTieredAmount(quantity, variable.tiers);
    } else {
      usageAmountSource = quantity * (variable.unitAmount || 0);
    }

    let usageAmountTarget: number;
    if (variable.currency === targetCurrency) {
      usageAmountTarget = usageAmountSource;
    } else {
      usageAmountTarget = await this.converter.convert(usageAmountSource, variable.currency, targetCurrency);
    }

    // Convert base if needed (in case target is not base currency)
    let baseAmountTarget: number;
    if (base.currency === targetCurrency) {
      baseAmountTarget = base.unitAmount;
    } else {
      baseAmountTarget = await this.converter.convert(base.unitAmount, base.currency, targetCurrency);
    }

    const items: InvoiceItem[] = [
      {
        description: `${plan.name} base (${base.billingInterval ?? 'one-time'})`,
        amount: baseAmountTarget,
        currency: targetCurrency,
        quantity: 1,
      },
      {
        description: `${plan.name} usage${variable.metric ? ` (${variable.metric})` : ''}`,
        amount: usageAmountTarget,
        currency: targetCurrency,
        quantity,
      },
    ];

    const total = baseAmountTarget + usageAmountTarget;
    return { total: { amount: total, currency: targetCurrency }, items };
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