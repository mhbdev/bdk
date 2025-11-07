/**
 * @mhbdev/bdk
 * 
 * Unified payment gateway abstraction for multiple payment providers
 */

import EventEmitter from 'eventemitter3';
import {
  PaymentGatewayOptions,
  PaymentProvider,
  CheckoutOptions,
  CheckoutSession,
  SubscriptionOptions,
  Subscription,
  GetSubscriptionOptions,
  CancelSubscriptionOptions,
  WebhookOptions,
  WebhookResult,
  Product,
  Price,
  Customer,
  PaymentMethod,
  PaymentResult,
  // Usage metering types
  UsageRecordOptions,
  UsageRecordResult,
  UsageQueryOptions,
  UsageEvent,
  UsageAggregateOptions,
  UsageAggregate,
  UsagePolicyOptions,
  UsagePolicy,
  UsageLimitCheckOptions,
  UsageLimitResult,
} from './types';

/**
 * Payment Gateway Manager
 * @extends EventEmitter
 */
class PaymentGateway extends EventEmitter {
  private options: PaymentGatewayOptions;
  private providers: Record<string, PaymentProvider>;
  private defaultProvider: string | null;
  private products: Record<string, Product>;
  private prices: Record<string, Price | Record<string, Price>>;
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
  constructor(options: Partial<PaymentGatewayOptions> = {}) {
    super();
    
    // Default options
    this.options = {
      providers: {},
      defaultProvider: null,
      webhookSecret: null,
      products: {},
      prices: {},
      debug: false,
      ...options
    };
    
    // Initialize providers
    this.providers = {};
    
    // Register providers
    if (this.options.providers) {
      for (const [name, provider] of Object.entries(this.options.providers)) {
        this.registerProvider(name, provider);
      }
    }
    
    // Set default provider
    this.defaultProvider = this.options.defaultProvider ?? null;
    
    // Initialize products and prices with safe casts from loosely-typed options
    this.products = (this.options.products as Record<string, Product>) || {};
    this.prices = (this.options.prices as Record<string, Price | Record<string, Price>>) || {};
    
    this._log('PaymentGateway initialized');
  }
  
  /**
   * Register a payment provider
   * @param {string} name - Provider name
   * @param {Object} provider - Provider instance
   * @returns {PaymentGateway} - This instance for chaining
   */
  registerProvider(name: string, provider: PaymentProvider): PaymentGateway {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a string');
    }
    
    if (!provider || typeof provider !== 'object') {
      throw new Error('Provider must be an object');
    }
    
    // Check if provider has required methods
    const requiredMethods: Array<keyof PaymentProvider> = [
      'createCheckoutSession',
      'createSubscription',
      'getSubscription',
      'cancelSubscription',
      'handleWebhook'
    ];
    
    for (const method of requiredMethods) {
      if (typeof provider[method] !== 'function') {
        throw new Error(`Provider ${name} must implement ${method} method`);
      }
    }
    
    // Register provider
    this.providers[name] = provider;
    
    // Set as default if no default provider is set
    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
    
    this._log(`Provider ${name} registered`);
    
    return this;
  }
  
  /**
   * Get a registered provider
   * @param {string} name - Provider name
   * @returns {Object} - Provider instance
   */
  getProvider(name?: string): PaymentProvider {
    const providerName = name || this.defaultProvider;
    
    if (!providerName) {
      throw new Error('No provider specified and no default provider set');
    }
    
    const provider = providerName ? this.providers[providerName] : undefined;
    
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    
    return provider!;
  }
  
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
  async createCheckoutSession(options: CheckoutOptions = {}): Promise<CheckoutSession> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Resolve price ID if not provided directly
      if (!options.priceId && (options.productId || options.planId)) {
        options.priceId = this._resolvePriceId(options);
      }
      
      // Create checkout session
      const session = await provider.createCheckoutSession(options);
      
      // Emit event
      this.emit('checkout.created', {
        provider: options.provider || this.defaultProvider,
        session
      });
      
      return session;
    } catch (error) {
      this._log('Error creating checkout session:', error);
      throw error;
    }
  }
  
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
  async createSubscription(options: SubscriptionOptions): Promise<Subscription> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Resolve price ID if not provided directly
      if (!options.priceId && options.planId) {
        options.priceId = this._resolvePriceId(options);
      }
      
      // Create subscription
      const subscription = await provider.createSubscription(options);
      
      // Emit event
      this.emit('subscription.created', {
        provider: options.provider || this.defaultProvider,
        subscription
      });
      
      return subscription;
    } catch (error) {
      this._log('Error creating subscription:', error);
      throw error;
    }
  }
  
  /**
   * Get a subscription
   * @param {Object} options - Subscription options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.subscriptionId - Subscription ID
   * @param {string} options.customerId - Customer ID (optional)
   * @param {string} options.customerEmail - Customer email (optional)
   * @returns {Promise<Object>} - Subscription
   */
  async getSubscription(options: GetSubscriptionOptions = {}): Promise<Subscription | null> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Get subscription
      return await provider.getSubscription(options);
    } catch (error) {
      this._log('Error getting subscription:', error);
      throw error;
    }
  }
  
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
  async cancelSubscription(options: CancelSubscriptionOptions): Promise<unknown> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Cancel subscription
      const result = await provider.cancelSubscription(options);
      
      // Emit event
      this.emit('subscription.canceled', {
        provider: options.provider || this.defaultProvider,
        subscriptionId: options.subscriptionId,
        result
      });
      
      return result;
    } catch (error) {
      this._log('Error canceling subscription:', error);
      throw error;
    }
  }
  
  /**
   * Handle a webhook event
   * @param {Object} options - Webhook options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.body - Webhook body
   * @param {Object} options.headers - Webhook headers
   * @param {string} options.signature - Webhook signature
   * @returns {Promise<Object>} - Webhook handling result
   */
  async handleWebhook(options: WebhookOptions): Promise<WebhookResult> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Handle webhook
      const result = await provider.handleWebhook(options);
      
      // Emit event (support providers returning either `type` or `event`)
      const eventType = (result as unknown as { type?: string; event?: string }).type || (result as unknown as { event?: string }).event;
      if (eventType) {
        this.emit(`webhook.${eventType}`, {
          provider: options.provider || this.defaultProvider,
          result
        });
      }
      
      return result;
    } catch (error) {
      this._log('Error handling webhook:', error);
      throw error;
    }
  }
  
  /**
   * Create a customer
   * @param {Object} options - Customer options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.email - Customer email
   * @param {string} options.name - Customer name (optional)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Customer
   */
  async createCustomer(options: { provider?: string } & Record<string, unknown> = {}): Promise<Customer> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports createCustomer
      if (typeof provider.createCustomer !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createCustomer`);
      }
      
      // Create customer
      const customer = await (provider.createCustomer!(options as never));
      
      // Emit event
      this.emit('customer.created', {
        provider: options.provider || this.defaultProvider,
        customer
      });
      
      return customer;
    } catch (error) {
      this._log('Error creating customer:', error);
      throw error;
    }
  }
  
  /**
   * Get a customer
   * @param {Object} options - Customer options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.customerId - Customer ID
   * @param {string} options.email - Customer email (optional)
   * @returns {Promise<Object>} - Customer
   */
  async getCustomer(options: { provider?: string } & Record<string, unknown> = {}): Promise<Customer | null> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports getCustomer
      if (typeof provider.getCustomer !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getCustomer`);
      }
      
      // Get customer
      return await (provider.getCustomer!(options as never));
    } catch (error) {
      this._log('Error getting customer:', error);
      throw error;
    }
  }
  
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
  async updateCustomer(options: { provider?: string } & Record<string, unknown> = {}): Promise<Customer> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports updateCustomer
      if (typeof provider.updateCustomer !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support updateCustomer`);
      }
      
      // Update customer
      const customer = await (provider.updateCustomer!(options as never));
      
      // Emit event
      this.emit('customer.updated', {
        provider: options.provider || this.defaultProvider,
        customer
      });
      
      return customer;
    } catch (error) {
      this._log('Error updating customer:', error);
      throw error;
    }
  }
  
  /**
   * Create a payment method
   * @param {Object} options - Payment method options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.customerId - Customer ID
   * @param {string} options.type - Payment method type
   * @param {Object} options.data - Payment method data
   * @returns {Promise<Object>} - Payment method
   */
  async createPaymentMethod(options: { provider?: string } & Record<string, unknown> = {}): Promise<PaymentMethod> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports createPaymentMethod
      if (typeof provider.createPaymentMethod !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createPaymentMethod`);
      }
      
      // Create payment method
      const paymentMethod = await (provider.createPaymentMethod!(options as never));
      
      // Emit event
      this.emit('paymentMethod.created', {
        provider: options.provider || this.defaultProvider,
        paymentMethod
      });
      
      return paymentMethod;
    } catch (error) {
      this._log('Error creating payment method:', error);
      throw error;
    }
  }
  
  /**
   * Get payment methods for a customer
   * @param {Object} options - Payment method options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.customerId - Customer ID
   * @param {string} options.type - Payment method type (optional)
   * @returns {Promise<Array>} - Payment methods
   */
  async getPaymentMethods(options: { provider?: string } & Record<string, unknown> = {}): Promise<PaymentMethod[]> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports getPaymentMethods
      if (typeof provider.getPaymentMethods !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getPaymentMethods`);
      }
      
      // Get payment methods
      return await (provider.getPaymentMethods!(options as never));
    } catch (error) {
      this._log('Error getting payment methods:', error);
      throw error;
    }
  }
  
  /**
   * Create a product
   * @param {Object} options - Product options
   * @param {string} options.provider - Provider name (optional, uses default if not specified)
   * @param {string} options.name - Product name
   * @param {string} options.description - Product description (optional)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Product
   */
  async createProduct(options: { provider?: string } & Record<string, unknown> = {}): Promise<Product> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports createProduct
      if (typeof provider.createProduct !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createProduct`);
      }
      
      // Create product
      const product = await (provider.createProduct!(options as never));
      
      // Add to products cache
      if (product.id) {
        this.products[product.id] = product;
      }
      
      // Emit event
      this.emit('product.created', {
        provider: options.provider || this.defaultProvider,
        product
      });
      
      return product;
    } catch (error) {
      this._log('Error creating product:', error);
      throw error;
    }
  }
  
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
  async createPrice(options: { provider?: string } & Record<string, unknown> = {}): Promise<Price> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports createPrice
      if (typeof provider.createPrice !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createPrice`);
      }
      
      // Create price
      const price = await (provider.createPrice!(options as never));
      
      // Add to prices cache
      if (price.id) {
        this.prices[price.id] = price;
        
        // Also add to product-specific prices
        const productId = options.productId as string | undefined;
        if (productId) {
          if (!this.prices[productId] || typeof this.prices[productId] !== 'object' || ('id' in (this.prices[productId] as any))) {
            this.prices[productId] = {} as Record<string, Price>;
          }
          
          // Create a key based on interval and currency
          const interval = (options as { interval?: string }).interval;
          const currency = (options as { currency?: string }).currency;
          const key = `${interval || 'one-time'}_${currency || 'usd'}`;
          (this.prices[productId] as Record<string, Price>)[key] = price;
        }
      }
      
      // Emit event
      this.emit('price.created', {
        provider: options.provider || this.defaultProvider,
        price
      });
      
      return price;
    } catch (error) {
      this._log('Error creating price:', error);
      throw error;
    }
  }
  
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
  async createPayment(options: { provider?: string } & Record<string, unknown> = {}): Promise<PaymentResult> {
    const provider = this.getProvider(options.provider as string | undefined);
    
    try {
      // Check if provider supports createPayment
      if (typeof provider.createPayment !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createPayment`);
      }
      
      // Create payment
      const payment = await (provider.createPayment!(options as never));
      
      // Emit event
      this.emit('payment.created', {
        provider: options.provider || this.defaultProvider,
        payment
      });
      
      return payment;
    } catch (error) {
      this._log('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Record usage for a customer and metric
   */
  async recordUsage(options: { provider?: string } & UsageRecordOptions): Promise<UsageRecordResult> {
    const provider = this.getProvider(options.provider as string | undefined);
    try {
      if (typeof provider.recordUsage !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support recordUsage`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.recordUsage!(rest);
    } catch (error) {
      this._log('Error recording usage:', error);
      throw error;
    }
  }

  /**
   * Get usage events
   */
  async getUsage(options: { provider?: string } & UsageQueryOptions): Promise<UsageEvent[]> {
    const provider = this.getProvider(options.provider as string | undefined);
    try {
      if (typeof provider.getUsage !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getUsage`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.getUsage!(rest);
    } catch (error) {
      this._log('Error getting usage:', error);
      throw error;
    }
  }

  /**
   * Aggregate usage totals
   */
  async getUsageAggregate(options: { provider?: string } & UsageAggregateOptions): Promise<UsageAggregate> {
    const provider = this.getProvider(options.provider as string | undefined);
    try {
      if (typeof provider.getUsageAggregate !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getUsageAggregate`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.getUsageAggregate!(rest);
    } catch (error) {
      this._log('Error aggregating usage:', error);
      throw error;
    }
  }

  /**
   * Set a usage policy
   */
  async setUsagePolicy(options: { provider?: string } & UsagePolicyOptions): Promise<UsagePolicy> {
    const provider = this.getProvider(options.provider as string | undefined);
    try {
      if (typeof provider.setUsagePolicy !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support setUsagePolicy`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.setUsagePolicy!(rest);
    } catch (error) {
      this._log('Error setting usage policy:', error);
      throw error;
    }
  }

  /**
   * Check usage against limit
   */
  async checkUsageLimit(options: { provider?: string } & UsageLimitCheckOptions): Promise<UsageLimitResult> {
    const provider = this.getProvider(options.provider as string | undefined);
    try {
      if (typeof provider.checkUsageLimit !== 'function') {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support checkUsageLimit`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.checkUsageLimit!(rest);
    } catch (error) {
      this._log('Error checking usage limit:', error);
      throw error;
    }
  }
  
  /**
   * Resolve a price ID from product ID and plan ID
   * @param {Object} options - Options
   * @param {string} options.productId - Product ID
   * @param {string} options.planId - Plan ID
   * @param {string} options.currency - Currency code (default: USD)
   * @returns {string} - Price ID
   * @private
   */
  _resolvePriceId(options: { priceId?: string; productId?: string; planId?: string; [key: string]: unknown }): string {
    const { productId, planId, currency = 'usd' } = options;
    
    // If we have a direct price mapping for the plan, use it
    if (planId && this.prices[planId]) {
      return planId;
    }
    
    // If we have a product ID and plan ID, try to find the price
    if (productId && planId && this.prices[productId]) {
      const key = `${planId}_${currency}`;
      const productPrices = this.prices[productId] as Record<string, Price>;
      if (productPrices && productPrices[key]) {
        return productPrices[key].id;
      }
    }
    
    // If we have a product ID, try to find a default price
    if (productId && this.products[productId] && this.products[productId].default_price) {
      return this.products[productId].default_price as string;
    }
    
    throw new Error(`Could not resolve price ID for product ${productId} and plan ${planId}`);
  }
  
  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   * @private
   */
  _log(...args: unknown[]) {
    if (this.options.debug) {
      console.log('[PaymentGateway]', ...args);
    }
  }
}

/**
 * Create a payment gateway
 * @param {Object} options - Configuration options
 * @returns {PaymentGateway} - Payment gateway instance
 */
export function createPaymentGateway(options: Partial<PaymentGatewayOptions> = {}): PaymentGateway {
  return new PaymentGateway(options);
}

// Export the PaymentGateway class
export { PaymentGateway };

// Export provider factories
export { createStripeProvider } from './providers/stripe';
export { createPayPalProvider } from './providers/paypal';
export { createCryptoProvider } from './providers/crypto';
export { createMockProvider } from './providers/mock';

// Default export
export default createPaymentGateway;