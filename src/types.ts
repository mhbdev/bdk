export interface PaymentGatewayOptions {
  providers?: Record<string, PaymentProvider>;
  defaultProvider?: string | null;
  webhookSecret?: string | null;
  products?: Record<string, unknown>;
  prices?: Record<string, unknown>;
  debug?: boolean;
}

export interface CheckoutOptions {
  provider?: string;
  customerId?: string;
  customerEmail?: string;
  priceId?: string;
  productId?: string;
  planId?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
  mode?: 'payment' | 'subscription' | 'setup';
  currency?: string;
  amount?: number;
  [key: string]: unknown;
}

export interface CheckoutSession {
  id: string;
  url?: string | null;
  status?: string;
  customerId?: string | null;
  customerEmail?: string | null;
  mode?: string;
  paymentStatus?: string;
  // Some providers include both amount and amountTotal for clarity
  amount?: number | null;
  amountTotal?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
  provider?: string;
  providerData?: Record<string, unknown>;
}

export interface SubscriptionOptions {
  provider?: string;
  customerId: string;
  customerEmail?: string;
  priceId?: string;
  planId?: string;
  metadata?: Record<string, unknown>;
  paymentMethodId?: string;
  [key: string]: unknown;
}

export interface GetSubscriptionOptions {
  provider?: string;
  subscriptionId?: string;
  customerId?: string;
}

export interface CancelSubscriptionOptions {
  provider?: string;
  subscriptionId: string;
  customerId?: string;
  customerEmail?: string;
  atPeriodEnd?: boolean;
}

export interface WebhookOptions {
  provider?: string;
  body: unknown;
  headers?: Record<string, string>;
  signature?: string;
}

export interface WebhookResult {
  handled: boolean;
  // Optional unique identifier for the webhook event (provider-specific)
  id?: string;
  type?: string;
  // Some providers return an event name directly at the top level
  event?: string;
  // Optional provider name for convenience in tests/integrations
  provider?: string;
  data?: unknown;
}

export interface Customer {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  // Some providers like Stripe expose a default_price on product objects
  default_price?: string;
  [key: string]: unknown;
}

export interface Price {
  id: string;
  productId: string;
  unitAmount: number;
  currency: string;
  interval?: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PaymentMethod {
  id: string;
  type?: string;
  [key: string]: unknown;
}

export interface SubscriptionItem {
  id: string;
  priceId: string;
  quantity?: number;
}

export interface Subscription {
  id: string;
  customerId: string;
   customerEmail?: string;
  status?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  // Convenience fields used by some providers/tests
  planId?: string;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, unknown>;
  items?: SubscriptionItem[];
  provider?: string;
  providerData?: Record<string, unknown>;
}

export interface PaymentResult {
  id: string;
  status?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

// Usage metering and billable metrics
export type AggregationType = 'sum' | 'count' | 'max' | 'unique';
export type UsageWindow = 'hour' | 'day' | 'month';

export interface BillableMetric {
  id: string;
  key: string;
  name: string;
  unit?: string;
  description?: string;
  aggregation?: AggregationType;
  [key: string]: unknown;
}

export interface UsageEvent {
  id: string;
  customerId: string;
  metricKey: string;
  quantity: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UsageRecordOptions {
  customerId: string;
  metricKey: string;
  quantity: number;
  timestamp?: string; // ISO string
  subscriptionItemId?: string; // required for providers like Stripe
  // Optional idempotency key to deduplicate repeated usage records
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageRecordResult {
  id: string;
  success?: boolean;
  provider?: string;
  providerData?: Record<string, unknown>;
}

export interface UsageQueryOptions {
  customerId: string;
  metricKey: string;
  start?: string; // ISO start
  end?: string; // ISO end
}

export interface UsagePeriodTotal {
  periodStart: string;
  periodEnd: string;
  total: number;
}

export interface UsageAggregateOptions extends UsageQueryOptions {
  window?: UsageWindow; // default: month
  aggregation?: AggregationType; // default: sum
}

export interface UsageAggregate {
  total: number;
  periods?: UsagePeriodTotal[];
  [key: string]: unknown;
}

export interface UsagePolicy {
  id: string;
  customerId: string;
  metricKey: string;
  limit: number;
  window: UsageWindow; // e.g., per month
  resetAnchor?: string; // ISO date for monthly reset anchor (e.g., 1st day)
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UsagePolicyOptions {
  customerId: string;
  metricKey: string;
  limit: number;
  window: UsageWindow;
  resetAnchor?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageLimitCheckOptions {
  customerId: string;
  metricKey: string;
}

export interface UsageLimitResult {
  allowed: boolean;
  remaining: number;
  usage: number;
  policy?: UsagePolicy | null;
}

// Pluggable storage adapter for usage engine persistence
export interface UsageStorageAdapter {
  // Returns all events for a customer+metric key; providers may filter by time
  getEvents(key: string): Promise<UsageEvent[]>;
  // Adds an event; respects idempotencyKey when provided
  addEvent(key: string, event: UsageEvent, idempotencyKey?: string): Promise<{ inserted: boolean }>;
  // Retrieves a policy for a customer+metric key
  getPolicy(key: string): Promise<UsagePolicy | null>;
  // Sets a policy for a customer+metric key
  setPolicy(key: string, policy: UsagePolicy): Promise<void>;
}

export interface PaymentProvider {
  createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession>;
  createSubscription(options: SubscriptionOptions): Promise<Subscription>;
  getSubscription(options: GetSubscriptionOptions): Promise<Subscription | null>;
  cancelSubscription(options: CancelSubscriptionOptions): Promise<unknown>;
  handleWebhook(options: WebhookOptions): Promise<WebhookResult>;

  // Optional provider-level event subscription (for providers that emit their own events)
  on?(event: string, listener: (data: unknown) => void): void;
  off?(event: string, listener: (data: unknown) => void): void;

  // optional capabilities
  createCustomer?(options: Partial<Customer> & { email: string; name?: string; metadata?: Record<string, unknown> }): Promise<Customer>;
  getCustomer?(options: { customerId?: string; email?: string }): Promise<Customer | null>;
  updateCustomer?(options: { customerId: string; email?: string; name?: string; metadata?: Record<string, unknown> }): Promise<Customer>;
  createPaymentMethod?(options: Record<string, unknown>): Promise<PaymentMethod>;
  getPaymentMethods?(options: { customerId: string }): Promise<PaymentMethod[]>;
  createProduct?(options: Omit<Product, 'id'>): Promise<Product>;
  createPrice?(options: Omit<Price, 'id'>): Promise<Price>;
  createPayment?(options: { amount: number; currency: string; customerId?: string; metadata?: Record<string, unknown> }): Promise<PaymentResult>;

  // Optional payment verification for providers like Crypto
  verifyPayment?(options: { subscriptionId?: string; paymentId?: string; transactionId?: string }): Promise<boolean>;

  // Usage metering capabilities (optional)
  recordUsage?(options: UsageRecordOptions): Promise<UsageRecordResult>;
  getUsage?(options: UsageQueryOptions): Promise<UsageEvent[]>;
  getUsageAggregate?(options: UsageAggregateOptions): Promise<UsageAggregate>;
  setUsagePolicy?(options: UsagePolicyOptions): Promise<UsagePolicy>;
  checkUsageLimit?(options: UsageLimitCheckOptions): Promise<UsageLimitResult>;
}