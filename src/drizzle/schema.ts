import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  jsonb,
  timestamp,
  numeric,
  uuid,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// Customers
export const customers = pgTable('customers', {
  id: varchar('id', { length: 128 }).primaryKey(),
  externalId: varchar('external_id', { length: 256 }),
  email: varchar('email', { length: 256 }),
  name: varchar('name', { length: 256 }),
  provider: varchar('provider', { length: 64 }),
  defaultCurrency: varchar('default_currency', { length: 8 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const customersExternalIdx = uniqueIndex('customers_external_idx').on(customers.externalId);

// Providers (optional registry for multiple billing providers)
export const providers = pgTable('providers', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// Plans with dynamic pricing strategies (stored as JSON for flexibility)
export const plans = pgTable('plans', {
  id: varchar('id', { length: 128 }).primaryKey(),
  key: varchar('key', { length: 128 }).notNull(),
  name: varchar('name', { length: 256 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(), // e.g., active, archived
  pricing: jsonb('pricing').notNull(), // array of pricing components compatible with SDK Plan
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const plansKeyIdx = uniqueIndex('plans_key_idx').on(plans.key);

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 128 }).primaryKey(),
  customerId: varchar('customer_id', { length: 128 }).notNull().references(() => customers.id, { onDelete: 'cascade' }),
  planId: varchar('plan_id', { length: 128 }).notNull().references(() => plans.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 32 }).notNull(), // active, canceled, etc.
  startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'date' }),
  externalId: varchar('external_id', { length: 256 }),
  items: jsonb('items'), // optional array of SubscriptionItem
  seats: integer('seats'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const subsCustomerIdx = index('subs_customer_idx').on(subscriptions.customerId);
export const subsPlanIdx = index('subs_plan_idx').on(subscriptions.planId);

// Invoices
export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 128 }).primaryKey(),
  customerId: varchar('customer_id', { length: 128 }).notNull(),
  subscriptionId: varchar('subscription_id', { length: 128 }).references(() => subscriptions.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull(), // generated, finalized, paid, failed
  currency: varchar('currency', { length: 3 }).notNull(),
  totalAmountMinor: integer('total_amount_minor').notNull(),
  provider: varchar('provider', { length: 64 }),
  externalId: varchar('external_id', { length: 256 }),
  issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
  taxAmountMinor: integer('tax_amount_minor'),
  discountsMinor: integer('discounts_minor'),
  pdfUrl: varchar('pdf_url', { length: 1024 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const invoicesCustomerIdx = index('invoices_customer_idx').on(invoices.customerId);

// Invoice items
export const invoiceItems = pgTable('invoice_items', {
  id: varchar('id', { length: 128 }).primaryKey(),
  invoiceId: varchar('invoice_id', { length: 128 }).notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description'),
  metric: varchar('metric', { length: 128 }),
  quantity: numeric('quantity', { precision: 20, scale: 6 }).default('0').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const invoiceItemsInvoiceIdx = index('invoice_items_invoice_idx').on(invoiceItems.invoiceId);

// Usage records (events of measured metrics)
export const usageRecords = pgTable('usage_records', {
  id: varchar('id', { length: 128 }).primaryKey(),
  customerId: varchar('customer_id', { length: 128 }).notNull(),
  subscriptionId: varchar('subscription_id', { length: 128 }),
  metric: varchar('metric', { length: 128 }).notNull(),
  quantity: numeric('quantity', { precision: 20, scale: 6 }).default('0').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const usageCustomerIdx = index('usage_customer_idx').on(usageRecords.customerId);
export const usageMetricIdx = index('usage_metric_idx').on(usageRecords.metric);
export const usageDedupeIdx = uniqueIndex('usage_dedupe_idx').on(
  usageRecords.customerId,
  usageRecords.subscriptionId,
  usageRecords.metric,
  usageRecords.timestamp,
);

// Metrics catalog
export const metrics = pgTable('metrics', {
  id: varchar('id', { length: 128 }).primaryKey(),
  key: varchar('key', { length: 128 }).notNull(),
  name: varchar('name', { length: 256 }).notNull(),
  unit: varchar('unit', { length: 64 }),
  aggregation: varchar('aggregation', { length: 64 }), // sum, max, unique, etc.
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const metricsKeyIdx = uniqueIndex('metrics_key_idx').on(metrics.key);

// Entitlements
export const entitlements = pgTable('entitlements', {
  id: varchar('id', { length: 128 }).primaryKey(),
  customerId: varchar('customer_id', { length: 128 }).notNull(),
  featureKey: varchar('feature_key', { length: 128 }).notNull(),
  limit: integer('limit'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const entitlementsCustomerIdx = index('entitlements_customer_idx').on(entitlements.customerId);
export const entitlementsFeatureIdx = index('entitlements_feature_idx').on(entitlements.featureKey);
export const entitlementsUniqueIdx = uniqueIndex('entitlements_unique_idx').on(entitlements.customerId, entitlements.featureKey);

// Feature flags
export const featureFlags = pgTable('feature_flags', {
  key: varchar('key', { length: 128 }).primaryKey(),
  enabled: boolean('enabled').default(false).notNull(),
  rules: jsonb('rules'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// Events (webhook or internal)
export const events = pgTable('events', {
  id: varchar('id', { length: 256 }).primaryKey(),
  type: varchar('type', { length: 128 }).notNull(),
  provider: varchar('provider', { length: 64 }).notNull(),
  source: varchar('source', { length: 64 }), // stripe, core, etc.
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const eventsTypeIdx = index('events_type_idx').on(events.type);
export const eventsProviderIdx = index('events_provider_idx').on(events.provider);

// Idempotency keys
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: varchar('key', { length: 256 }).primaryKey(),
  requestHash: varchar('request_hash', { length: 256 }).notNull(),
  response: jsonb('response'),
  locked: boolean('locked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
});

// Webhook deliveries (optional tracking)
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: varchar('id', { length: 128 }).primaryKey(),
  eventId: varchar('event_id', { length: 256 }),
  endpoint: varchar('endpoint', { length: 512 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(), // delivered, failed, etc.
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});