import { pgTable, text, integer, boolean, timestamp, jsonb, numeric } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  interval: text('interval').notNull(),
  intervalCount: integer('interval_count').notNull(),
  trialPeriodDays: integer('trial_period_days'),
  features: jsonb('features').$type<Record<string, any>>().notNull(),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  planId: text('plan_id').notNull(),
  status: text('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const paymentMethods = pgTable('payment_methods', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  type: text('type').notNull(),
  providerId: text('provider_id').notNull(),
  providerMethodId: text('provider_method_id').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  lastFour: text('last_four'),
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  subscriptionId: text('subscription_id'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  paymentMethodId: text('payment_method_id').notNull(),
  providerId: text('provider_id'),
  providerTransactionId: text('provider_transaction_id'),
  failureReason: text('failure_reason'),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const balances = pgTable('balances', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  availableAmount: numeric('available_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  availableCurrency: text('available_currency').notNull(),
  pendingAmount: numeric('pending_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  pendingCurrency: text('pending_currency').notNull(),
  reservedAmount: numeric('reserved_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  reservedCurrency: text('reserved_currency').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  transactionId: text('transaction_id').notNull(),
  type: text('type').notNull(),
  transactionType: text('transaction_type').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  balanceAmount: numeric('balance_amount', { precision: 14, scale: 2 }).notNull(),
  balanceCurrency: text('balance_currency').notNull(),
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  subscriptionId: text('subscription_id'),
  number: text('number').notNull(),
  status: text('status').notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 14, scale: 2 }).notNull(),
  subtotalCurrency: text('subtotal_currency').notNull(),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }),
  taxCurrency: text('tax_currency'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  totalCurrency: text('total_currency').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitAmount: numeric('unit_amount', { precision: 14, scale: 2 }).notNull(),
  unitCurrency: text('unit_currency').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const usageRecords = pgTable('usage_records', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  metric: text('metric').notNull(),
  quantity: integer('quantity').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const usageMetrics = pgTable('usage_metrics', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  metric: text('metric').notNull(),
  unitPriceAmount: numeric('unit_price_amount', { precision: 14, scale: 2 }).notNull(),
  unitPriceCurrency: text('unit_price_currency').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const dunningCampaigns = pgTable('dunning_campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  steps: jsonb('steps').$type<{ dayOffset: number; action: string; config: Record<string, any> }[]>(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const dunningAttempts = pgTable('dunning_attempts', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  paymentId: text('payment_id').notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  status: text('status').notNull(),
  result: text('result'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const dunningSubscriptionState = pgTable('dunning_subscription_state', {
  subscriptionId: text('subscription_id').primaryKey(),
  paused: boolean('paused').notNull().default(false),
  pauseUntil: timestamp('pause_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, any>>().notNull(),
  signature: text('signature'),
  processed: boolean('processed').notNull().default(false),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  actorId: text('actor_id'),
  actorType: text('actor_type'),
  changes: jsonb('changes').$type<Record<string, any> | null>(),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const schema = {
  subscriptionPlans,
  subscriptions,
  paymentMethods,
  payments,
  balances,
  ledgerEntries,
  invoices,
  invoiceLineItems,
  usageRecords,
  usageMetrics,
  dunningCampaigns,
  dunningAttempts,
  dunningSubscriptionState,
  webhookEvents,
  auditLogs
};