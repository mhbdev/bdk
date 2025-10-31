import { Money } from "./types";

export interface RevenueReport {
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: Money;
  recurringRevenue: Money;
  oneTimeRevenue: Money;
  refunds: Money;
  netRevenue: Money;
  breakdown: RevenueBreakdown[];
}

export interface RevenueBreakdown {
  date: Date;
  revenue: Money;
  subscriptionCount: number;
  averageRevenuePerSubscription: Money;
}

export interface SubscriptionMetrics {
  periodStart: Date;
  periodEnd: Date;
  activeSubscriptions: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  trialingSubscriptions: number;
  conversionRate: number;
  averageSubscriptionValue: Money;
  mrr: Money; // Monthly Recurring Revenue
  arr: Money; // Annual Recurring Revenue
}

export interface ChurnReport {
  periodStart: Date;
  periodEnd: Date;
  customersAtStart: number;
  customersLost: number;
  churnRate: number;
  revenueChurn: Money;
  revenueChurnRate: number;
}

export interface LTVReport {
  averageLTV: Money;
  medianLTV: Money;
  cohortData?: CohortLTV[];
}

export interface CohortLTV {
  cohortMonth: Date;
  customerCount: number;
  averageLTV: Money;
  retentionRate: number;
}

export interface PaymentMetrics {
  periodStart: Date;
  periodEnd: Date;
  totalAttempts: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  averagePaymentValue: Money;
  declineReasons: Record<string, number>;
}
