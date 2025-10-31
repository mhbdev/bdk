/**
 * IMPORTANT: These are example Drizzle schemas you can use as a starting point.
 *
 * To use these schemas in your project:
 * 1. Install Drizzle ORM: npm install drizzle-orm
 * 2. Install your database driver: npm install pg (for PostgreSQL)
 * 3. Copy the schemas you need to your project
 * 4. Customize them based on your requirements
 * 5. Run: npx drizzle-kit generate:pg to create migrations
 *
 * These schemas support both PostgreSQL and MySQL.
 * Uncomment the appropriate import based on your database.
 */

// For PostgreSQL - uncomment these:
/*
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  jsonb,
  text,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';
*/

// For MySQL - uncomment these:
/*
import {
  mysqlTable as pgTable,
  varchar as uuid,
  varchar,
  timestamp,
  decimal,
  json as jsonb,
  text,
  boolean,
  int as integer,
  index,
} from 'drizzle-orm/mysql-core';
*/

/**
 * TypeScript types for table schemas
 * These are used for type inference throughout the SDK
 */

export interface SubscriptionsTableSchema {
  id: string;
  customerId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlansTableSchema {
  id: string;
  name: string;
  description: string | null;
  amount: string;
  currency: string;
  interval: string;
  intervalCount: number;
  trialPeriodDays: number | null;
  features: Record<string, any>;
  metadata: Record<string, any> | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentsTableSchema {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  amount: string;
  currency: string;
  status: string;
  paymentMethodId: string;
  providerId: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethodsTableSchema {
  id: string;
  customerId: string;
  type: string;
  providerId: string;
  providerMethodId: string;
  isDefault: boolean;
  lastFour: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BalancesTableSchema {
  id: string;
  customerId: string;
  availableAmount: string;
  availableCurrency: string;
  pendingAmount: string;
  pendingCurrency: string;
  reservedAmount: string;
  reservedCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntriesTableSchema {
  id: string;
  customerId: string;
  transactionId: string;
  type: string;
  transactionType: string;
  amount: string;
  currency: string;
  balanceAmount: string;
  balanceCurrency: string;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoicesTableSchema {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  number: string;
  status: string;
  subtotalAmount: string;
  subtotalCurrency: string;
  taxAmount: string | null;
  taxCurrency: string | null;
  totalAmount: string;
  totalCurrency: string;
  dueDate: Date;
  paidAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItemsTableSchema {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmount: string;
  unitCurrency: string;
  amount: string;
  currency: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface UsageRecordsTableSchema {
  id: string;
  customerId: string;
  subscriptionId: string;
  metric: string;
  quantity: number;
  timestamp: Date;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface WebhookEventsTableSchema {
  id: string;
  providerId: string;
  eventType: string;
  payload: Record<string, any>;
  signature: string | null;
  processed: boolean;
  processedAt: Date | null;
  error: string | null;
  retryCount: number;
  createdAt: Date;
}

export interface AuditLogsTableSchema {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorType: string | null;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Example Drizzle table definitions
 * Copy these to your project and customize as needed
 */

/**
 * STEP 1: Uncomment the appropriate imports at the top of this file
 * STEP 2: Uncomment the table definitions below
 * STEP 3: Customize column names, types, and constraints
 * STEP 4: Run: npx drizzle-kit generate:pg
 */

/*
// Subscription Plans Table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  interval: varchar('interval', { length: 50 }).notNull(), // 'monthly', 'yearly'
  intervalCount: integer('interval_count').notNull().default(1),
  trialPeriodDays: integer('trial_period_days'),
  features: jsonb('features').notNull().default({}),
  metadata: jsonb('metadata'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  activeIdx: index('subscription_plans_active_idx').on(table.active),
}));

// Subscriptions Table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id),
  status: varchar('status', { length: 50 }).notNull(), // 'active', 'canceled', etc.
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  canceledAt: timestamp('canceled_at'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('subscriptions_customer_idx').on(table.customerId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
  planIdx: index('subscriptions_plan_idx').on(table.planId),
}));

// Payment Methods Table
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'card', 'bank_account'
  providerId: varchar('provider_id', { length: 50 }).notNull(), // 'stripe', 'paypal'
  providerMethodId: varchar('provider_method_id', { length: 255 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  lastFour: varchar('last_four', { length: 4 }),
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('payment_methods_customer_idx').on(table.customerId),
  defaultIdx: index('payment_methods_default_idx').on(table.customerId, table.isDefault),
}));

// Payments Table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull(), // 'pending', 'succeeded', 'failed'
  paymentMethodId: uuid('payment_method_id').notNull().references(() => paymentMethods.id),
  providerId: varchar('provider_id', { length: 50 }),
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
  failureReason: text('failure_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('payments_customer_idx').on(table.customerId),
  statusIdx: index('payments_status_idx').on(table.status),
  subscriptionIdx: index('payments_subscription_idx').on(table.subscriptionId),
  providerIdx: index('payments_provider_transaction_idx').on(table.providerTransactionId),
}));

// Balances Table
export const balances = pgTable('balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().unique(),
  availableAmount: decimal('available_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  availableCurrency: varchar('available_currency', { length: 3 }).notNull().default('USD'),
  pendingAmount: decimal('pending_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  pendingCurrency: varchar('pending_currency', { length: 3 }).notNull().default('USD'),
  reservedAmount: decimal('reserved_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  reservedCurrency: varchar('reserved_currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('balances_customer_idx').on(table.customerId),
}));

// Ledger Entries Table
export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  transactionId: varchar('transaction_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'debit', 'credit'
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'charge', 'refund', etc.
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  balanceAmount: decimal('balance_amount', { precision: 10, scale: 2 }).notNull(),
  balanceCurrency: varchar('balance_currency', { length: 3 }).notNull().default('USD'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('ledger_entries_customer_idx').on(table.customerId),
  transactionIdx: index('ledger_entries_transaction_idx').on(table.transactionId),
  typeIdx: index('ledger_entries_type_idx').on(table.type),
  createdAtIdx: index('ledger_entries_created_at_idx').on(table.createdAt),
}));

// Invoices Table
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  number: varchar('number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull(), // 'draft', 'open', 'paid', 'void'
  subtotalAmount: decimal('subtotal_amount', { precision: 10, scale: 2 }).notNull(),
  subtotalCurrency: varchar('subtotal_currency', { length: 3 }).notNull().default('USD'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }),
  taxCurrency: varchar('tax_currency', { length: 3 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  totalCurrency: varchar('total_currency', { length: 3 }).notNull().default('USD'),
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('invoices_customer_idx').on(table.customerId),
  statusIdx: index('invoices_status_idx').on(table.status),
  numberIdx: index('invoices_number_idx').on(table.number),
  subscriptionIdx: index('invoices_subscription_idx').on(table.subscriptionId),
}));

// Invoice Line Items Table
export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitAmount: decimal('unit_amount', { precision: 10, scale: 2 }).notNull(),
  unitCurrency: varchar('unit_currency', { length: 3 }).notNull().default('USD'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  invoiceIdx: index('invoice_line_items_invoice_idx').on(table.invoiceId),
}));

// Usage Records Table
export const usageRecords = pgTable('usage_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id),
  metric: varchar('metric', { length: 100 }).notNull(), // 'api_calls', 'storage_gb', etc.
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('usage_records_customer_idx').on(table.customerId),
  subscriptionIdx: index('usage_records_subscription_idx').on(table.subscriptionId),
  metricIdx: index('usage_records_metric_idx').on(table.metric),
  timestampIdx: index('usage_records_timestamp_idx').on(table.timestamp),
}));

// Webhook Events Table (for idempotency and retry)
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: varchar('provider_id', { length: 50 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  signature: varchar('signature', { length: 500 }),
  processed: boolean('processed').notNull().default(false),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('webhook_events_provider_idx').on(table.providerId),
  processedIdx: index('webhook_events_processed_idx').on(table.processed),
  eventTypeIdx: index('webhook_events_event_type_idx').on(table.eventType),
}));

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }),
  actorType: varchar('actor_type', { length: 50 }), // 'user', 'system', 'api'
  changes: jsonb('changes'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  actorIdx: index('audit_logs_actor_idx').on(table.actorId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));
*/

/**
 * Type exports for use with Drizzle ORM
 *
 * Usage:
 * ```typescript
 * import { subscriptions, type Subscription } from './schemas';
 *
 * type NewSubscription = typeof subscriptions.$inferInsert;
 * type Subscription = typeof subscriptions.$inferSelect;
 * ```
 */
