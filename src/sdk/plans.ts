import { Plan, Price, Currency } from '../core/models/types';

export function usagePlan(params: {
  id: string;
  productId: string;
  name: string;
  currency: Currency;
  unitAmount: number;
  metric: string;
  tiers?: { upTo: number; unitAmount: number }[];
  billingInterval?: 'day' | 'week' | 'month' | 'year';
}): Plan {
  const usage: Price = {
    id: `${params.id}_usage`,
    type: 'usage',
    currency: params.currency,
    unitAmount: params.unitAmount,
    metric: params.metric,
    tiers: params.tiers,
    billingInterval: params.billingInterval,
  };
  return {
    id: params.id,
    productId: params.productId,
    name: params.name,
    currency: params.currency,
    pricing: [usage],
    strategy: 'usage',
  };
}

export function hybridPlan(params: {
  id: string;
  productId: string;
  name: string;
  currency: Currency;
  baseUnitAmount: number;
  usageUnitAmount: number;
  metric: string;
  tiers?: { upTo: number; unitAmount: number }[];
  billingInterval?: 'day' | 'week' | 'month' | 'year';
}): Plan {
  const base: Price = {
    id: `${params.id}_base`,
    type: 'flat',
    currency: params.currency,
    unitAmount: params.baseUnitAmount,
    billingInterval: params.billingInterval ?? 'month',
  };
  const usage: Price = {
    id: `${params.id}_usage`,
    type: 'usage',
    currency: params.currency,
    unitAmount: params.usageUnitAmount,
    metric: params.metric,
    tiers: params.tiers,
  };
  return {
    id: params.id,
    productId: params.productId,
    name: params.name,
    currency: params.currency,
    pricing: [base, usage],
    strategy: 'hybrid',
    basePriceId: base.id,
  };
}
export function tieredUsagePlan(params: {
  id: string;
  productId: string;
  name: string;
  currency: Currency;
  metric: string;
  tiers: { upTo: number; unitAmount: number }[];
  billingInterval?: 'day' | 'week' | 'month' | 'year';
}): Plan {
  const usage: Price = {
    id: `${params.id}_tiered_usage`,
    type: 'usage',
    currency: params.currency,
    unitAmount: 0,
    metric: params.metric,
    tiers: params.tiers,
    billingInterval: params.billingInterval,
  };
  return {
    id: params.id,
    productId: params.productId,
    name: params.name,
    currency: params.currency,
    pricing: [usage],
    strategy: 'usage',
  };
}

export function seatPlan(params: {
  id: string;
  productId: string;
  name: string;
  currency: Currency;
  seatUnitAmount: number;
  billingInterval?: 'day' | 'week' | 'month' | 'year';
}): Plan {
  const base: Price = {
    id: `${params.id}_seat_base`,
    type: 'flat',
    currency: params.currency,
    unitAmount: params.seatUnitAmount,
    billingInterval: params.billingInterval ?? 'month',
  };
  return {
    id: params.id,
    productId: params.productId,
    name: params.name,
    currency: params.currency,
    pricing: [base],
    strategy: 'seat',
    basePriceId: base.id,
  };
}

export function prepaidPlan(params: {
  id: string;
  productId: string;
  name: string;
  currency: Currency;
  topUpAmount: number;
  billingInterval?: 'day' | 'week' | 'month' | 'year';
}): Plan {
  const topUp: Price = {
    id: `${params.id}_prepaid_topup`,
    type: 'flat',
    currency: params.currency,
    unitAmount: params.topUpAmount,
    billingInterval: params.billingInterval ?? undefined,
  };
  return {
    id: params.id,
    productId: params.productId,
    name: params.name,
    currency: params.currency,
    pricing: [topUp],
    strategy: 'prepaid',
    basePriceId: topUp.id,
  };
}