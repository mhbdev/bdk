/**
 * Currency code following ISO 4217 standard
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | string;

/**
 * Monetary amount representation with currency
 */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/**
 * Subscription billing intervals
 */
export enum BillingInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * Subscription lifecycle states
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  PAUSED = 'paused',
  EXPIRED = 'expired',
}

/**
 * Payment transaction states
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELED = 'canceled',
}

/**
 * Ledger entry types for double-entry accounting
 */
export enum LedgerEntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

/**
 * Transaction types for audit trail
 */
export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  CREDIT = 'credit',
  SUBSCRIPTION_FEE = 'subscription_fee',
  USAGE_FEE = 'usage_fee',
}
