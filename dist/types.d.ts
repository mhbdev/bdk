interface PaymentGatewayOptions {
    providers?: Record<string, PaymentProvider>;
    defaultProvider?: string | null;
    webhookSecret?: string | null;
    products?: Record<string, unknown>;
    prices?: Record<string, unknown>;
    debug?: boolean;
}
interface CheckoutOptions {
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
interface CheckoutSession {
    id: string;
    url?: string | null;
    status?: string;
    customerId?: string | null;
    customerEmail?: string | null;
    mode?: string;
    paymentStatus?: string;
    amount?: number | null;
    amountTotal?: number | null;
    currency?: string | null;
    metadata?: Record<string, unknown>;
    expiresAt?: string | null;
    provider?: string;
    providerData?: Record<string, unknown>;
}
interface SubscriptionOptions {
    provider?: string;
    customerId: string;
    customerEmail?: string;
    priceId?: string;
    planId?: string;
    metadata?: Record<string, unknown>;
    paymentMethodId?: string;
    [key: string]: unknown;
}
interface GetSubscriptionOptions {
    provider?: string;
    subscriptionId?: string;
    customerId?: string;
}
interface CancelSubscriptionOptions {
    provider?: string;
    subscriptionId: string;
    customerId?: string;
    customerEmail?: string;
    atPeriodEnd?: boolean;
}
interface WebhookOptions {
    provider?: string;
    body: unknown;
    headers?: Record<string, string>;
    signature?: string;
}
interface WebhookResult {
    handled: boolean;
    id?: string;
    type?: string;
    event?: string;
    provider?: string;
    data?: unknown;
}
interface Customer {
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
interface Product {
    id: string;
    name: string;
    description?: string;
    metadata?: Record<string, unknown>;
    default_price?: string;
    [key: string]: unknown;
}
interface Price {
    id: string;
    productId: string;
    unitAmount: number;
    currency: string;
    interval?: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
interface PaymentMethod {
    id: string;
    type?: string;
    [key: string]: unknown;
}
interface SubscriptionItem {
    id: string;
    priceId: string;
    quantity?: number;
}
interface Subscription {
    id: string;
    customerId: string;
    customerEmail?: string;
    status?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string | null;
    planId?: string;
    startDate?: string;
    endDate?: string;
    metadata?: Record<string, unknown>;
    items?: SubscriptionItem[];
    provider?: string;
    providerData?: Record<string, unknown>;
}
interface PaymentResult {
    id: string;
    status?: string;
    amount?: number;
    currency?: string;
    [key: string]: unknown;
}
type AggregationType = 'sum' | 'count' | 'max' | 'unique';
type UsageWindow = 'hour' | 'day' | 'month';
interface BillableMetric {
    id: string;
    key: string;
    name: string;
    unit?: string;
    description?: string;
    aggregation?: AggregationType;
    [key: string]: unknown;
}
interface UsageEvent {
    id: string;
    customerId: string;
    metricKey: string;
    quantity: number;
    timestamp: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
interface UsageRecordOptions {
    customerId: string;
    metricKey: string;
    quantity: number;
    timestamp?: string;
    subscriptionItemId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}
interface UsageRecordResult {
    id: string;
    success?: boolean;
    provider?: string;
    providerData?: Record<string, unknown>;
}
interface UsageQueryOptions {
    customerId: string;
    metricKey: string;
    start?: string;
    end?: string;
}
interface UsagePeriodTotal {
    periodStart: string;
    periodEnd: string;
    total: number;
}
interface UsageAggregateOptions extends UsageQueryOptions {
    window?: UsageWindow;
    aggregation?: AggregationType;
}
interface UsageAggregate {
    total: number;
    periods?: UsagePeriodTotal[];
    [key: string]: unknown;
}
interface UsagePolicy {
    id: string;
    customerId: string;
    metricKey: string;
    limit: number;
    window: UsageWindow;
    resetAnchor?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
interface UsagePolicyOptions {
    customerId: string;
    metricKey: string;
    limit: number;
    window: UsageWindow;
    resetAnchor?: string;
    metadata?: Record<string, unknown>;
}
interface UsageLimitCheckOptions {
    customerId: string;
    metricKey: string;
}
interface UsageLimitResult {
    allowed: boolean;
    remaining: number;
    usage: number;
    policy?: UsagePolicy | null;
}
interface UsageStorageAdapter {
    getEvents(key: string): Promise<UsageEvent[]>;
    addEvent(key: string, event: UsageEvent, idempotencyKey?: string): Promise<{
        inserted: boolean;
    }>;
    getPolicy(key: string): Promise<UsagePolicy | null>;
    setPolicy(key: string, policy: UsagePolicy): Promise<void>;
}
interface PaymentProvider {
    createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession>;
    createSubscription(options: SubscriptionOptions): Promise<Subscription>;
    getSubscription(options: GetSubscriptionOptions): Promise<Subscription | null>;
    cancelSubscription(options: CancelSubscriptionOptions): Promise<unknown>;
    handleWebhook(options: WebhookOptions): Promise<WebhookResult>;
    on?(event: string, listener: (data: unknown) => void): void;
    off?(event: string, listener: (data: unknown) => void): void;
    createCustomer?(options: Partial<Customer> & {
        email: string;
        name?: string;
        metadata?: Record<string, unknown>;
    }): Promise<Customer>;
    getCustomer?(options: {
        customerId?: string;
        email?: string;
    }): Promise<Customer | null>;
    updateCustomer?(options: {
        customerId: string;
        email?: string;
        name?: string;
        metadata?: Record<string, unknown>;
    }): Promise<Customer>;
    createPaymentMethod?(options: Record<string, unknown>): Promise<PaymentMethod>;
    getPaymentMethods?(options: {
        customerId: string;
    }): Promise<PaymentMethod[]>;
    createProduct?(options: Omit<Product, 'id'>): Promise<Product>;
    createPrice?(options: Omit<Price, 'id'>): Promise<Price>;
    createPayment?(options: {
        amount: number;
        currency: string;
        customerId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<PaymentResult>;
    verifyPayment?(options: {
        subscriptionId?: string;
        paymentId?: string;
        transactionId?: string;
    }): Promise<boolean>;
    recordUsage?(options: UsageRecordOptions): Promise<UsageRecordResult>;
    getUsage?(options: UsageQueryOptions): Promise<UsageEvent[]>;
    getUsageAggregate?(options: UsageAggregateOptions): Promise<UsageAggregate>;
    setUsagePolicy?(options: UsagePolicyOptions): Promise<UsagePolicy>;
    checkUsageLimit?(options: UsageLimitCheckOptions): Promise<UsageLimitResult>;
}

export type { AggregationType, BillableMetric, CancelSubscriptionOptions, CheckoutOptions, CheckoutSession, Customer, GetSubscriptionOptions, PaymentGatewayOptions, PaymentMethod, PaymentProvider, PaymentResult, Price, Product, Subscription, SubscriptionItem, SubscriptionOptions, UsageAggregate, UsageAggregateOptions, UsageEvent, UsageLimitCheckOptions, UsageLimitResult, UsagePeriodTotal, UsagePolicy, UsagePolicyOptions, UsageQueryOptions, UsageRecordOptions, UsageRecordResult, UsageStorageAdapter, UsageWindow, WebhookOptions, WebhookResult };
