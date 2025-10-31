import { BaseEntity } from "../core/interfaces";
import { Money } from "../core/types";

/**
 * Abstract usage tracking service for metered billing
 */
export abstract class UsageService {
  /**
   * Record usage event
   */
  abstract recordUsage(
    customerId: string,
    subscriptionId: string,
    metric: string,
    quantity: number,
    timestamp?: Date,
    metadata?: Record<string, any>
  ): Promise<UsageRecord>;

  /**
   * Get usage for a billing period
   */
  abstract getUsage(
    subscriptionId: string,
    metric: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageAggregate>;

  /**
   * List all usage records
   */
  abstract listUsage(
    subscriptionId: string,
    filters?: UsageFilters
  ): Promise<UsageRecord[]>;

  /**
   * Calculate usage-based charges
   */
  abstract calculateCharges(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageCharges>;
}

export interface UsageRecord extends BaseEntity {
  customerId: string;
  subscriptionId: string;
  metric: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UsageAggregate {
  metric: string;
  totalQuantity: number;
  periodStart: Date;
  periodEnd: Date;
  records: UsageRecord[];
}

export interface UsageFilters {
  metric?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface UsageCharges {
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: UsageChargeLineItem[];
  total: Money;
}

export interface UsageChargeLineItem {
  metric: string;
  quantity: number;
  unitPrice: Money;
  tiers?: UsageTier[];
  amount: Money;
}

export interface UsageTier {
  upTo: number | null; // null for unlimited
  unitPrice: Money;
  flatFee?: Money;
}