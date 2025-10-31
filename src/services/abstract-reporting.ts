import { ChurnReport, LTVReport, PaymentMetrics, RevenueReport, SubscriptionMetrics } from "../core";

/**
 * Abstract reporting service for analytics and metrics
 */
export abstract class ReportingService {
  /**
   * Generate revenue report
   */
  abstract generateRevenueReport(
    startDate: Date,
    endDate: Date,
    groupBy?: 'day' | 'week' | 'month'
  ): Promise<RevenueReport>;

  /**
   * Generate subscription metrics
   */
  abstract generateSubscriptionMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SubscriptionMetrics>;

  /**
   * Calculate churn rate
   */
  abstract calculateChurnRate(
    startDate: Date,
    endDate: Date
  ): Promise<ChurnReport>;

  /**
   * Generate customer lifetime value report
   */
  abstract calculateLTV(
    cohortDate?: Date
  ): Promise<LTVReport>;

  /**
   * Get payment success/failure rates
   */
  abstract getPaymentMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PaymentMetrics>;
}