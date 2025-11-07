import { describe, it, expect } from 'vitest';
import { usagePlan, hybridPlan, tieredUsagePlan, seatPlan, prepaidPlan } from '../../src/sdk/plans';

describe('SDK plans helpers', () => {
  it('creates usage plan with correct fields', () => {
    const p = usagePlan({ id: 'p1', productId: 'prod1', name: 'Usage', currency: 'USD', unitAmount: 100, metric: 'api', billingInterval: 'month' });
    expect(p.strategy).toBe('usage');
    expect(p.pricing.length).toBe(1);
    expect(p.pricing[0].id).toBe('p1_usage');
    expect(p.pricing[0].metric).toBe('api');
    expect(p.pricing[0].billingInterval).toBe('month');
  });

  it('creates hybrid plan with base and usage, basePriceId and default interval', () => {
    const p = hybridPlan({ id: 'p2', productId: 'prod2', name: 'Hybrid', currency: 'USD', baseUnitAmount: 500, usageUnitAmount: 10, metric: 'api' });
    expect(p.strategy).toBe('hybrid');
    expect(p.pricing.length).toBe(2);
    const base = p.pricing.find(x => x.type === 'flat')!;
    const usage = p.pricing.find(x => x.type === 'usage')!;
    expect(p.basePriceId).toBe(base.id);
    expect(base.billingInterval).toBe('month');
    expect(usage.metric).toBe('api');
  });

  it('creates tiered usage plan', () => {
    const p = tieredUsagePlan({ id: 'p3', productId: 'prod3', name: 'Tiered', currency: 'USD', metric: 'api', tiers: [ { upTo: 5, unitAmount: 50 }, { upTo: 10, unitAmount: 40 } ], billingInterval: 'week' });
    expect(p.strategy).toBe('usage');
    expect(p.pricing[0].tiers?.length).toBe(2);
    expect(p.pricing[0].billingInterval).toBe('week');
  });

  it('creates seat plan with default month interval and basePriceId', () => {
    const p = seatPlan({ id: 'p4', productId: 'prod4', name: 'Seat', currency: 'USD', seatUnitAmount: 1500 });
    expect(p.strategy).toBe('seat');
    expect(p.basePriceId).toBe(`${p.id}_seat_base`);
    expect(p.pricing[0].billingInterval).toBe('month');
  });

  it('creates prepaid plan with undefined interval and basePriceId', () => {
    const p = prepaidPlan({ id: 'p5', productId: 'prod5', name: 'Prepaid', currency: 'USD', topUpAmount: 2000 });
    expect(p.strategy).toBe('prepaid');
    expect(p.basePriceId).toBe(`${p.id}_prepaid_topup`);
    expect(p.pricing[0].billingInterval).toBeUndefined();
  });
});