import EventEmitter from 'eventemitter3';
import { PaymentGatewayOptions, PaymentProvider, CheckoutOptions, CheckoutSession, SubscriptionOptions, Subscription, GetSubscriptionOptions, CancelSubscriptionOptions, WebhookOptions, WebhookResult, Customer, PaymentMethod, Product, Price, PaymentResult, UsageRecordOptions, UsageRecordResult, UsageQueryOptions, UsageEvent, UsageAggregateOptions, UsageAggregate, UsagePolicyOptions, UsagePolicy, UsageLimitCheckOptions, UsageLimitResult } from './types.js';
export { default as createStripeProvider } from './providers/stripe.js';
export { default as createPayPalProvider } from './providers/paypal.js';
export { default as createCryptoProvider } from './providers/crypto.js';
export { default as createMockProvider } from './providers/mock.js';

/**
 * @mhbdev/bdk
 *
 * Unified payment gateway abstraction for multiple payment providers
 */

/**
 * Payment Gateway Manager
 * @extends EventEmitter
 */
declare class PaymentGateway extends EventEmitter {
    private options;
    private providers;
    private defaultProvider;
    private products;
    private prices;
    /**
     * Create a new PaymentGateway
     * @param {Object} options - Configuration options
     * @param {Object} options.providers - Payment providers to use
     * @param {Object} options.defaultProvider - Default payment provider
     * @param {Object} options.webhookSecret - Webhook secret for verification
     * @param {Object} options.products - Product configuration
     * @param {Object} options.prices - Price configuration
     * @param {boolean} options.debug - Enable debug mode
     */
    constructor(options?: Partial<PaymentGatewayOptions>);
    /**
     * Register a payment provider
     * @param {string} name - Provider name
     * @param {Object} provider - Provider instance
     * @returns {PaymentGateway} - This instance for chaining
     */
    registerProvider(name: string, provider: PaymentProvider): PaymentGateway;
    /**
     * Get a registered provider
     * @param {string} name - Provider name
     * @returns {Object} - Provider instance
     */
    getProvider(name?: string): PaymentProvider;
    /**
     * Create a checkout session
     * @param {Object} options - Checkout options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID (optional)
     * @param {string} options.customerEmail - Customer email (optional)
     * @param {string} options.priceId - Price ID
     * @param {string} options.productId - Product ID (optional if priceId is provided)
     * @param {string} options.planId - Plan ID (optional if priceId is provided)
     * @param {string} options.successUrl - Success URL
     * @param {string} options.cancelUrl - Cancel URL
     * @param {Object} options.metadata - Additional metadata
     * @param {string} options.mode - Checkout mode (payment, subscription, setup)
     * @param {string} options.currency - Currency code (default: USD)
     * @param {number} options.amount - Amount in smallest currency unit (e.g., cents)
     * @returns {Promise<Object>} - Checkout session
     */
    createCheckoutSession(options?: CheckoutOptions): Promise<CheckoutSession>;
    /**
     * Create a subscription
     * @param {Object} options - Subscription options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID
     * @param {string} options.customerEmail - Customer email (optional)
     * @param {string} options.priceId - Price ID
     * @param {string} options.planId - Plan ID (optional if priceId is provided)
     * @param {Object} options.metadata - Additional metadata
     * @param {string} options.paymentMethodId - Payment method ID (optional)
     * @returns {Promise<Object>} - Subscription
     */
    createSubscription(options: SubscriptionOptions): Promise<Subscription>;
    /**
     * Get a subscription
     * @param {Object} options - Subscription options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.subscriptionId - Subscription ID
     * @param {string} options.customerId - Customer ID (optional)
     * @param {string} options.customerEmail - Customer email (optional)
     * @returns {Promise<Object>} - Subscription
     */
    getSubscription(options?: GetSubscriptionOptions): Promise<Subscription | null>;
    /**
     * Cancel a subscription
     * @param {Object} options - Subscription options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.subscriptionId - Subscription ID
     * @param {string} options.customerId - Customer ID (optional)
     * @param {string} options.customerEmail - Customer email (optional)
     * @param {boolean} options.atPeriodEnd - Whether to cancel at the end of the billing period
     * @returns {Promise<Object>} - Cancellation result
     */
    cancelSubscription(options: CancelSubscriptionOptions): Promise<unknown>;
    /**
     * Handle a webhook event
     * @param {Object} options - Webhook options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.body - Webhook body
     * @param {Object} options.headers - Webhook headers
     * @param {string} options.signature - Webhook signature
     * @returns {Promise<Object>} - Webhook handling result
     */
    handleWebhook(options: WebhookOptions): Promise<WebhookResult>;
    /**
     * Create a customer
     * @param {Object} options - Customer options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.email - Customer email
     * @param {string} options.name - Customer name (optional)
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<Object>} - Customer
     */
    createCustomer(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<Customer>;
    /**
     * Get a customer
     * @param {Object} options - Customer options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID
     * @param {string} options.email - Customer email (optional)
     * @returns {Promise<Object>} - Customer
     */
    getCustomer(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<Customer | null>;
    /**
     * Update a customer
     * @param {Object} options - Customer options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID
     * @param {string} options.email - Customer email (optional)
     * @param {string} options.name - Customer name (optional)
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<Object>} - Updated customer
     */
    updateCustomer(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<Customer>;
    /**
     * Create a payment method
     * @param {Object} options - Payment method options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID
     * @param {string} options.type - Payment method type
     * @param {Object} options.data - Payment method data
     * @returns {Promise<Object>} - Payment method
     */
    createPaymentMethod(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<PaymentMethod>;
    /**
     * Get payment methods for a customer
     * @param {Object} options - Payment method options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID
     * @param {string} options.type - Payment method type (optional)
     * @returns {Promise<Array>} - Payment methods
     */
    getPaymentMethods(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<PaymentMethod[]>;
    /**
     * Create a product
     * @param {Object} options - Product options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.name - Product name
     * @param {string} options.description - Product description (optional)
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<Object>} - Product
     */
    createProduct(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<Product>;
    /**
     * Create a price
     * @param {Object} options - Price options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.productId - Product ID
     * @param {string} options.currency - Currency code (default: USD)
     * @param {number} options.unitAmount - Amount in smallest currency unit (e.g., cents)
     * @param {string} options.interval - Billing interval (day, week, month, year)
     * @param {number} options.intervalCount - Number of intervals (default: 1)
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<Object>} - Price
     */
    createPrice(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<Price>;
    /**
     * Create a payment
     * @param {Object} options - Payment options
     * @param {string} options.provider - Provider name (optional, uses default if not specified)
     * @param {string} options.customerId - Customer ID
     * @param {number} options.amount - Amount in smallest currency unit (e.g., cents)
     * @param {string} options.currency - Currency code (default: USD)
     * @param {string} options.description - Payment description (optional)
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<Object>} - Payment
     */
    createPayment(options?: {
        provider?: string;
    } & Record<string, unknown>): Promise<PaymentResult>;
    /**
     * Record usage for a customer and metric
     */
    recordUsage(options: {
        provider?: string;
    } & UsageRecordOptions): Promise<UsageRecordResult>;
    /**
     * Get usage events
     */
    getUsage(options: {
        provider?: string;
    } & UsageQueryOptions): Promise<UsageEvent[]>;
    /**
     * Aggregate usage totals
     */
    getUsageAggregate(options: {
        provider?: string;
    } & UsageAggregateOptions): Promise<UsageAggregate>;
    /**
     * Set a usage policy
     */
    setUsagePolicy(options: {
        provider?: string;
    } & UsagePolicyOptions): Promise<UsagePolicy>;
    /**
     * Check usage against limit
     */
    checkUsageLimit(options: {
        provider?: string;
    } & UsageLimitCheckOptions): Promise<UsageLimitResult>;
    /**
     * Resolve a price ID from product ID and plan ID
     * @param {Object} options - Options
     * @param {string} options.productId - Product ID
     * @param {string} options.planId - Plan ID
     * @param {string} options.currency - Currency code (default: USD)
     * @returns {string} - Price ID
     * @private
     */
    _resolvePriceId(options: {
        priceId?: string;
        productId?: string;
        planId?: string;
        [key: string]: unknown;
    }): string;
    /**
     * Log debug messages
     * @param {...any} args - Arguments to log
     * @private
     */
    _log(...args: unknown[]): void;
}
/**
 * Create a payment gateway
 * @param {Object} options - Configuration options
 * @returns {PaymentGateway} - Payment gateway instance
 */
declare function createPaymentGateway(options?: Partial<PaymentGatewayOptions>): PaymentGateway;

export { PaymentGateway, createPaymentGateway, createPaymentGateway as default };
