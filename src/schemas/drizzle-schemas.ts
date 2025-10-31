import { CurrencyCode, LedgerEntryType, PaymentStatus, SubscriptionStatus, TransactionType } from "../core/types";

/**
 * Placeholder type for Drizzle table definitions
 * Replace with actual Drizzle imports: import { pgTable, ... } from 'drizzle-orm/pg-core'
 */
export type DrizzleTable<T = any> = T;

/**
 * Example schema structure for subscriptions table
 * Developers should implement actual Drizzle schema
 */
export interface SubscriptionsTableSchema {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Example schema structure for payments table
 */
export interface PaymentsTableSchema {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  amount: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  paymentMethodId: string;
  providerId: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Example schema structure for ledger entries table
 */
export interface LedgerEntriesTableSchema {
  id: string;
  customerId: string;
  transactionId: string;
  type: LedgerEntryType;
  transactionType: TransactionType;
  amount: number;
  currency: CurrencyCode;
  balanceAmount: number;
  balanceCurrency: CurrencyCode;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Placeholder for actual Drizzle table definitions
 * 
 * Example implementation:
 * 
 * export const subscriptions = pgTable('subscriptions', {
 *   id: uuid('id').primaryKey().defaultRandom(),
 *   customerId: uuid('customer_id').notNull(),
 *   planId: uuid('plan_id').notNull(),
 *   status: varchar('status', { length: 50 }).notNull(),
 *   // ... other columns
 * });
 */
export type SubscriptionsTable = DrizzleTable<SubscriptionsTableSchema>;
export type PaymentsTable = DrizzleTable<PaymentsTableSchema>;
export type LedgerEntriesTable = DrizzleTable<LedgerEntriesTableSchema>;
