import { ReportingService } from '@mhbdev/bdk/services';
import { PaymentMetrics, RevenueReport, RevenueBreakdown, SubscriptionMetrics, LTVReport, Money } from '@mhbdev/bdk/core';
import { db } from '../db/client';
import { payments, subscriptions } from '../db/schema';

function money(amount: number, currency: string): Money { return { amount, currency }; }

export class DatabaseReportingService extends ReportingService {
  async generateRevenueReport(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<RevenueReport> {
    const rows = await db.select().from(payments).execute();
    const currency = 'IRT';
    const total = rows.filter(r => r.status === 'succeeded').reduce((acc, r) => acc + Number(r.amount), 0);
    return { periodStart: startDate, periodEnd: endDate, totalRevenue: money(total, currency), recurringRevenue: money(0, currency), oneTimeRevenue: money(total, currency), refunds: money(0, currency), netRevenue: money(total, currency), breakdown: [] };
  }
  async generateSubscriptionMetrics(startDate: Date, endDate: Date): Promise<SubscriptionMetrics> {
    const subs = await db.select().from(subscriptions).execute();
    const currency = 'IRT';
    return { periodStart: startDate, periodEnd: endDate, activeSubscriptions: subs.filter(s => s.status === 'active').length, newSubscriptions: subs.length, canceledSubscriptions: subs.filter(s => s.status === 'canceled').length, trialingSubscriptions: subs.filter(s => s.status === 'trialing').length, conversionRate: 0, averageSubscriptionValue: money(0, currency), mrr: money(0, currency), arr: money(0, currency) };
  }
  async calculateChurnRate(startDate: Date, endDate: Date) { return { periodStart: startDate, periodEnd: endDate, customersAtStart: 0, customersLost: 0, churnRate: 0, revenueChurn: money(0, 'IRT'), revenueChurnRate: money(0, 'IRT') } as any; }
  async calculateLTV(cohortDate?: Date): Promise<LTVReport> { return { averageLTV: money(0, 'IRT'), medianLTV: money(0, 'IRT') }; }
  async getPaymentMetrics(startDate: Date, endDate: Date): Promise<PaymentMetrics> {
    const rows = await db.select().from(payments).execute();
    const currency = 'IRT';
    const totalAttempts = rows.length;
    const successfulPayments = rows.filter(r => r.status === 'succeeded').length;
    const failedPayments = rows.filter(r => r.status === 'failed').length;
    const successRate = totalAttempts ? (successfulPayments / totalAttempts) * 100 : 0;
    const avgValue = rows.length ? rows.reduce((acc, r) => acc + Number(r.amount), 0) / rows.length : 0;
    return { periodStart: startDate, periodEnd: endDate, totalAttempts, successfulPayments, failedPayments, successRate, averagePaymentValue: money(avgValue, currency), declineReasons: {} };
  }
}