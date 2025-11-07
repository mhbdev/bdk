import { describe, it, expect } from 'vitest';
import { HybridStrategy } from '../../src/core/strategies/hybrid';
import { Plan, UsageRecord } from '../../src/core/models/types';

describe('HybridStrategy', () => {
  const baseUSD = { id: 'p_flat', type: 'flat' as const, currency: 'USD' as const, unitAmount: 10000, billingInterval: 'month' as const };
  const usageUSD = { id: 'p_usage', type: 'usage' as const, currency: 'USD' as const, unitAmount: 200, metric: 'messages' };

  const planBasic: Plan = {
    id: 'plan_hybrid_basic', productId: 'prod', name: 'Hybrid Basic', currency: 'USD',
    pricing: [baseUSD, usageUSD], strategy: 'hybrid',
  };

  it('throws when plan lacks flat or usage price', async () => {
    const strat = new HybridStrategy();
    const invalidPlanFlatOnly: Plan = { ...planBasic, pricing: [baseUSD], strategy: 'hybrid' };
    await expect(strat.computeCharge({ plan: invalidPlanFlatOnly, periodStart: new Date(), periodEnd: new Date() })).rejects.toThrow(/must include flat and usage/);

    const invalidPlanUsageOnly: Plan = { ...planBasic, pricing: [usageUSD], strategy: 'hybrid' };
    await expect(strat.computeCharge({ plan: invalidPlanUsageOnly, periodStart: new Date(), periodEnd: new Date() })).rejects.toThrow(/must include flat and usage/);
  });

  it('throws on currency mismatch between base and usage', async () => {
    const strat = new HybridStrategy();
    const usageEUR = { ...usageUSD, currency: 'EUR' as const };
    const planMismatch: Plan = { ...planBasic, pricing: [baseUSD, usageEUR] };
    await expect(strat.computeCharge({ plan: planMismatch, periodStart: new Date(), periodEnd: new Date() })).rejects.toThrow(/must share the same currency/);
  });

  it('computes base + per-unit usage when not tiered', async () => {
    const strat = new HybridStrategy();
    const usage: UsageRecord[] = [
      { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'messages', quantity: 10, timestamp: new Date() },
      { id: 'u2', customerId: 'c', subscriptionId: 's', metric: 'messages', quantity: 15, timestamp: new Date() },
    ];
    const out = await strat.computeCharge({ plan: planBasic, usage, periodStart: new Date(), periodEnd: new Date() });
    // base 10000 + usage 25 * 200 = 5000 => total 15000
    expect(out.total.amount).toBe(15000);
    expect(out.items.length).toBe(2);
    expect(out.items[0].amount).toBe(10000);
    expect(out.items[1].amount).toBe(5000);
    expect(out.items[1].quantity).toBe(25);
  });

  it('clamps negative usage quantities to zero', async () => {
    const strat = new HybridStrategy();
    const usage: UsageRecord[] = [
      { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'messages', quantity: -5, timestamp: new Date() },
      { id: 'u2', customerId: 'c', subscriptionId: 's', metric: 'messages', quantity: 5, timestamp: new Date() },
    ];
    const out = await strat.computeCharge({ plan: planBasic, usage, periodStart: new Date(), periodEnd: new Date() });
    // effective quantity = 0 + 5 = 5 => usage 1000, total 11000
    expect(out.total.amount).toBe(11000);
    expect(out.items[1].amount).toBe(1000);
    expect(out.items[1].quantity).toBe(5);
  });

  it('computes tiered usage across multiple tiers and overflow', async () => {
    const strat = new HybridStrategy();
    const tiered = { ...usageUSD, tiers: [
      { upTo: 100, unitAmount: 100 }, // first 100 at $1
      { upTo: 900, unitAmount: 75 },  // next 900 at $0.75 (up to 1000 cumulative)
    ] };
    const planTiered: Plan = { ...planBasic, pricing: [baseUSD, tiered] };
    const usage: UsageRecord[] = [
      { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'messages', quantity: 1200, timestamp: new Date() },
    ];
    // tier calc: 100*100 = 10000; 900*75 = 67500; overflow 200 * 75(last tier) = 15000; total usage = 92500
    const out = await strat.computeCharge({ plan: planTiered, usage, periodStart: new Date(), periodEnd: new Date() });
    expect(out.items[1].amount).toBe(92500);
    expect(out.items[0].amount).toBe(10000);
    expect(out.total.amount).toBe(102500);
  });

  it('returns base only when usage is empty', async () => {
    const strat = new HybridStrategy();
    const out = await strat.computeCharge({ plan: planBasic, usage: [], periodStart: new Date(), periodEnd: new Date() });
    expect(out.total.amount).toBe(10000);
    expect(out.items[1].amount).toBe(0);
    expect(out.items[1].quantity).toBe(0);
  });
});