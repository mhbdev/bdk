import { describe, it, expect } from 'vitest';
import { ProrationService } from '../../src/services/invoice/ProrationService';
import { Plan } from '../../src/core/models/types';

const planUSD = (id: string): Plan => ({
  id,
  productId: `prod_${id}`,
  name: id,
  currency: 'USD',
  pricing: [ { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 1000 } ],
  strategy: 'flat',
  basePriceId: 'price_base',
});

describe('ProrationService edge cases', () => {
  it('handles zero or invalid period length', () => {
    const svc = new ProrationService();
    const res = svc.calculate({ oldAmount: 1000, newAmount: 2000, periodStart: new Date(1000), periodEnd: new Date(1000), changeDate: new Date(900), currency: 'USD' });
    expect(res.fraction).toBe(0);
    expect(res.net).toBe(0);
  });

  it('throws when plan lacks base price in currency', () => {
    const svc = new ProrationService();
    const bad: Plan = { id: 'bad', productId: 'prod_bad', name: 'Bad', currency: 'USD', pricing: [ { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 1, metric: 'x' } ], strategy: 'usage' };
    expect(() => (svc as any).resolvePlanAmount(bad, 1)).toThrow(/must include a flat\/base price/);
  });

  it('throws on currency mismatch between plans', () => {
    const svc = new ProrationService();
    const oldPlan = planUSD('old');
    const newPlan: Plan = { id: 'new', productId: 'prod_new', name: 'new', currency: 'EUR', pricing: [ { id: 'price_base', type: 'flat', currency: 'EUR', unitAmount: 2000 } ], strategy: 'flat', basePriceId: 'price_base' };
    expect(() => svc.generateInvoiceFromPlans({ oldPlan, newPlan, seats: 2, periodStart: new Date(0), periodEnd: new Date(1000), changeDate: new Date(100), customerId: 'c' })).toThrow(/Currency mismatch/);
  });

  it('multiplies seat count and clamps minimum', () => {
    const svc = new ProrationService();
    const oldPlan = planUSD('old');
    const newPlan = planUSD('new');
    // seats=0 -> clamp to 1
    const inv = svc.generateInvoiceFromPlans({ oldPlan, newPlan, seats: 0, periodStart: new Date(0), periodEnd: new Date(1000), changeDate: new Date(500), customerId: 'c' });
    expect(inv.items.length).toBe(2);
    expect(inv.currency).toBe('USD');
  });
});