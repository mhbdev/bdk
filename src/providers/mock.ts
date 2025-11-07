/**
 * Mock Provider for Payment Gateway
 * 
 * Implements a mock payment provider for testing purposes.
 */

import crypto from 'crypto';
import type {
  PaymentProvider,
  WebhookOptions,
  WebhookResult,
  CheckoutOptions,
  CheckoutSession,
  SubscriptionOptions,
  Subscription,
  GetSubscriptionOptions,
  CancelSubscriptionOptions,
  Customer,
  Product,
  Price,
  SubscriptionItem,
  // Usage metering types
  UsageEvent,
  UsageRecordOptions,
  UsageRecordResult,
  UsageQueryOptions,
  UsageAggregateOptions,
  UsageAggregate,
  UsagePolicy,
  UsagePolicyOptions,
  UsageLimitCheckOptions,
  UsageLimitResult
} from '../types';
import { InMemoryUsageStorageAdapter } from '../usage/storage';
import type { UsageStorageAdapter } from '../types';

/**
 * Create a Mock provider
 * @param {Object} options - Configuration options
 * @param {boolean} options.simulateErrors - Whether to simulate errors
 * @param {number} options.errorRate - Error rate (0-1)
 * @param {number} options.delay - Delay in milliseconds
 * @param {boolean} options.debug - Enable debug mode
 * @returns {Object} - Mock provider
 */
interface MockProviderOptions {
  simulateErrors: boolean;
  errorRate: number;
  delay: number;
  debug: boolean;
  usageStorage?: UsageStorageAdapter;
  usageIdempotencyTtlMs?: number;
}

interface MockSession {
  id: string;
  customerId?: string;
  customerEmail?: string;
  mode: 'payment' | 'subscription' | 'setup' | string;
  amount: number;
  currency: string;
  priceId?: string;
  status: string;
  paymentStatus: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
  subscriptionId?: string;
}

interface MockPrice extends Price {
  recurring?: { interval: 'day' | 'week' | 'month' | 'year'; intervalCount: number };
  createdAt: string;
}

interface MockProduct extends Product { createdAt: string }

interface MockSubscription extends Subscription {
  priceId?: string;
  createdAt: string;
  items: SubscriptionItem[];
}

export function createMockProvider(options: Partial<MockProviderOptions> = {}): PaymentProvider {
  // Default options
  const config: MockProviderOptions = {
    simulateErrors: false,
    errorRate: 0.1,
    delay: 500,
    debug: false,
    ...options
  };
  
  // (Removed) event emitter; not used in typed provider
  
  // In-memory storage for subscriptions, payments, and customers
  const subscriptions: Map<string, MockSubscription> = new Map();
  const payments: Map<string, MockSession> = new Map();
  const customers: Map<string, Customer> = new Map();
  const products: Map<string, MockProduct> = new Map();
  const prices: Map<string, MockPrice> = new Map();
  // Usage storage adapter (pluggable, defaults to in-memory)
  const usageStorage: UsageStorageAdapter = config.usageStorage ?? new InMemoryUsageStorageAdapter({ idempotencyTtlMs: config.usageIdempotencyTtlMs });

  function usageKey(customerId: string, metricKey: string): string {
    return `${customerId}:${metricKey}`;
  }

  function inRange(tsIso: string, start?: string, end?: string): boolean {
    const ts = new Date(tsIso).getTime();
    if (start && ts < new Date(start).getTime()) return false;
    if (end && ts > new Date(end).getTime()) return false;
    return true;
  }
  
  /**
   * Create a checkout session
   * @param {Object} options - Checkout options
   * @param {string} options.customerId - Customer ID (optional)
   * @param {string} options.customerEmail - Customer email (optional)
   * @param {string} options.priceId - Price ID
   * @param {string} options.successUrl - Success URL
   * @param {string} options.cancelUrl - Cancel URL
   * @param {Object} options.metadata - Additional metadata
   * @param {string} options.mode - Checkout mode (payment, subscription, setup)
   * @param {string} options.currency - Currency code (default: USD)
   * @param {number} options.amount - Amount in smallest currency unit (e.g., cents)
   * @returns {Promise<Object>} - Checkout session
   */
  async function createCheckoutSession(options: CheckoutOptions = {}): Promise<CheckoutSession> {
    try {
      _log('Creating mock checkout session:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error creating checkout session');
      }
      
      // Create a unique session ID
      const sessionId = `mock_session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Get customer ID or create a new one
      let customerId = options.customerId;
      
      if (!customerId && options.customerEmail) {
        // Check if customer exists
        for (const [id, customer] of customers.entries()) {
          if (customer.email === options.customerEmail) {
            customerId = id;
            break;
          }
        }
        
        // Create new customer if not found
        if (!customerId) {
          customerId = `mock_cus_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          
          customers.set(customerId, {
            id: customerId,
            email: options.customerEmail,
            name: undefined,
            metadata: {} as Record<string, unknown>
          });
        }
      }
      
      // Create checkout session
      const session: MockSession = {
        id: sessionId,
        customerId,
        customerEmail: options.customerEmail as string | undefined,
        mode: (options.mode as MockSession['mode']) || 'payment',
        amount: (options.amount as number) || 1000,
        currency: ((options.currency as string) || 'usd').toLowerCase(),
        priceId: options.priceId as string | undefined,
        status: 'pending',
        paymentStatus: 'unpaid',
        successUrl: options.successUrl as string | undefined,
        cancelUrl: options.cancelUrl as string | undefined,
        metadata: (options.metadata as Record<string, unknown>) || {},
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };
      
      // Store session
      payments.set(sessionId, session);
      
      _log('Mock checkout session created:', sessionId);
      
      // Return a standardized response
      return {
        id: session.id,
        url: `https://mock-payment-gateway.com/checkout/${sessionId}`,
        status: session.status,
        customerId: session.customerId,
        customerEmail: session.customerEmail,
        mode: session.mode,
        paymentStatus: session.paymentStatus,
        amountTotal: session.amount,
        currency: session.currency,
        metadata: session.metadata,
        expiresAt: session.expiresAt,
        provider: 'mock',
        providerData: {
          sessionId: session.id
        }
      };
    } catch (error) {
      _log('Error creating mock checkout session:', error);
      throw error;
    }
  }
  
  /**
   * Create a subscription
   * @param {Object} options - Subscription options
   * @param {string} options.customerId - Customer ID
   * @param {string} options.priceId - Price ID
   * @param {Object} options.metadata - Additional metadata
   * @param {string} options.paymentMethodId - Payment method ID (optional)
   * @returns {Promise<Object>} - Subscription
   */
  async function createSubscription(options: SubscriptionOptions): Promise<Subscription> {
    try {
      _log('Creating mock subscription:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error creating subscription');
      }
      
      // Validate required options
      if (!options.customerId) {
        throw new Error('Customer ID is required');
      }
      
      // Check if customer exists
      if (!customers.has(options.customerId)) {
        throw new Error(`Customer ${options.customerId} not found`);
      }
      
      // Create a unique subscription ID
      const subscriptionId = `mock_sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Get price details
      let interval: 'day' | 'week' | 'month' | 'year' = 'month';
      let intervalCount = 1;
      
      if (options.priceId && prices.has(options.priceId as string)) {
        const price = prices.get(options.priceId as string)!;
        if (price.recurring) {
          interval = price.recurring.interval;
          intervalCount = price.recurring.intervalCount;
        }
      }
      
      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      
      if (interval === 'day') {
        periodEnd.setDate(periodEnd.getDate() + intervalCount);
      } else if (interval === 'week') {
        periodEnd.setDate(periodEnd.getDate() + (7 * intervalCount));
      } else if (interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
      } else if (interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
      }
      
      // Create subscription
      const subscription: MockSubscription = {
        id: subscriptionId,
        customerId: options.customerId,
        priceId: options.priceId as string | undefined,
        status: 'active',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: (options.metadata as Record<string, unknown>) || {},
        createdAt: now.toISOString(),
        items: [
          {
            id: `mock_si_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            priceId: options.priceId as string,
            quantity: 1
          }
        ]
      };
      
      // Store subscription
      subscriptions.set(subscriptionId, subscription);
      
      _log('Mock subscription created:', subscriptionId);
      
      // Return a standardized response
      return {
        id: subscription.id,
        customerId: subscription.customerId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        metadata: subscription.metadata,
        items: subscription.items,
        provider: 'mock',
        providerData: {
          subscriptionId: subscription.id
        }
      };
    } catch (error) {
      _log('Error creating mock subscription:', error);
      throw error;
    }
  }
  
  /**
   * Get a subscription
   * @param {Object} options - Subscription options
   * @param {string} options.subscriptionId - Subscription ID
   * @param {string} options.customerId - Customer ID (optional)
   * @returns {Promise<Object>} - Subscription
   */
  async function getSubscription(options: GetSubscriptionOptions): Promise<Subscription | null> {
    try {
      _log('Getting mock subscription:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error getting subscription');
      }
      
      // Validate required options
      if (!options.subscriptionId && !options.customerId) {
        throw new Error('Either subscription ID or customer ID is required');
      }
      
      let subscription: MockSubscription | undefined;
      
      if (options.subscriptionId) {
        // Get subscription by ID
        subscription = subscriptions.get(options.subscriptionId);
        
        if (!subscription) {
          return null;
        }
      } else {
        // Get subscriptions for customer
        const customerSubscriptions = Array.from(subscriptions.values())
          .filter(sub => sub.customerId === options.customerId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (customerSubscriptions.length === 0) {
          return null;
        }
        
        subscription = customerSubscriptions[0];
      }
      
      if (!subscription) {
        return null;
      }

      _log('Mock subscription retrieved:', subscription.id);
      
      // Return a standardized response
      return {
        id: subscription.id,
        customerId: subscription.customerId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        metadata: subscription.metadata,
        items: subscription.items,
        provider: 'mock',
        providerData: {
          subscriptionId: subscription.id
        }
      };
    } catch (error) {
      _log('Error getting mock subscription:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a subscription
   * @param {Object} options - Subscription options
   * @param {string} options.subscriptionId - Subscription ID
   * @param {boolean} options.atPeriodEnd - Whether to cancel at the end of the billing period
   * @returns {Promise<Object>} - Cancellation result
   */
  async function cancelSubscription(options: CancelSubscriptionOptions): Promise<unknown> {
    try {
      _log('Canceling mock subscription:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error canceling subscription');
      }
      
      // Validate required options
      if (!options.subscriptionId) {
        throw new Error('Subscription ID is required');
      }
      
      // Get subscription
      const subscription = subscriptions.get(options.subscriptionId);
      
      if (!subscription) {
        throw new Error(`Subscription ${options.subscriptionId} not found`);
      }
      
      // Update subscription
      if (options.atPeriodEnd) {
        subscription.cancelAtPeriodEnd = true;
      } else {
        subscription.status = 'canceled';
        subscription.canceledAt = new Date().toISOString();
      }
      
      _log('Mock subscription canceled:', subscription.id);
      
      // Return a standardized response
      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        provider: 'mock',
        success: true
      };
    } catch (error) {
      _log('Error canceling mock subscription:', error);
      throw error;
    }
  }
  
  /**
   * Handle a webhook event
   * @param {Object} options - Webhook options
   * @param {string} options.body - Webhook body
   * @param {Object} options.headers - Webhook headers
   * @returns {Promise<Object>} - Webhook handling result
   */
  async function handleWebhook(options: WebhookOptions): Promise<WebhookResult> {
    try {
      _log('Handling mock webhook:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error handling webhook');
      }
      
      // Parse webhook body
      const body: any = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      
      // Validate webhook data
      if (!body.type || !body.data) {
        throw new Error('Invalid webhook data');
      }
      
      let result: any;
      
      // Process webhook based on type
      switch (body.type) {
        case 'checkout.session.completed': {
          const sessionId = body.data.id;
          const session = payments.get(sessionId);
          
          if (!session) {
            throw new Error(`Session ${sessionId} not found`);
          }
          
          // Update session
          session.status = 'completed';
          session.paymentStatus = 'paid';
          
          // Create subscription if mode is subscription
          if (session.mode === 'subscription' && session.priceId) {
            const subscriptionId = `mock_sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            
            // Get price details
            let interval: 'day' | 'week' | 'month' | 'year' = 'month';
            let intervalCount = 1;
            
            if (prices.has(session.priceId as string)) {
              const price = prices.get(session.priceId as string)!;
              if (price.recurring) {
                interval = price.recurring.interval;
                intervalCount = price.recurring.intervalCount;
              }
            }
            
            // Calculate period dates
            const now = new Date();
            const periodEnd = new Date(now);
            
            if (interval === 'day') {
              periodEnd.setDate(periodEnd.getDate() + intervalCount);
            } else if (interval === 'week') {
              periodEnd.setDate(periodEnd.getDate() + (7 * intervalCount));
            } else if (interval === 'month') {
              periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
            } else if (interval === 'year') {
              periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
            }
            
            // Create subscription
            const subscription: MockSubscription = {
              id: subscriptionId,
              customerId: session.customerId as string,
              status: 'active',
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: periodEnd.toISOString(),
              cancelAtPeriodEnd: false,
              canceledAt: null,
              metadata: session.metadata,
              createdAt: now.toISOString(),
              items: [
                {
                  id: `mock_si_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                  priceId: session.priceId as string,
                  quantity: 1
                }
              ]
            };
            if (session.priceId) {
              subscription.priceId = session.priceId;
            }
            
            // Store subscription
            subscriptions.set(subscriptionId, subscription);
            
            // Update session with subscription ID
            session.subscriptionId = subscriptionId;
            
            _log('Mock subscription created from checkout:', subscriptionId);
          }
          
          result = {
            event: 'checkout.completed',
            customerId: session.customerId,
            customerEmail: session.customerEmail,
            sessionId: session.id,
            subscriptionId: session.subscriptionId,
            amount: session.amount,
            currency: session.currency,
            metadata: session.metadata,
            mode: session.mode,
            status: session.status,
            paymentStatus: session.paymentStatus
          };
          
          break;
        }
        
        case 'invoice.paid': {
          const subscriptionId = body.data.subscription;
          const subscription = subscriptions.get(subscriptionId);
          
          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }
          
          // Update subscription period
          const currentPeriodStart = new Date(subscription.currentPeriodEnd as string);
          const currentPeriodEnd = new Date(subscription.currentPeriodEnd as string);
          
          // Get price details
          let interval: 'day' | 'week' | 'month' | 'year' = 'month';
          let intervalCount = 1;
          
          if (subscription.priceId && prices.has(subscription.priceId as string)) {
            const price = prices.get(subscription.priceId as string)!;
            if (price.recurring) {
              interval = price.recurring.interval;
              intervalCount = price.recurring.intervalCount;
            }
          }
          
          // Calculate new period end
          if (interval === 'day') {
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + intervalCount);
          } else if (interval === 'week') {
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + (7 * intervalCount));
          } else if (interval === 'month') {
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
          } else if (interval === 'year') {
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
          }
          
          // Update subscription
          subscription.currentPeriodStart = currentPeriodStart.toISOString();
          subscription.currentPeriodEnd = currentPeriodEnd.toISOString();
          
          result = {
            event: 'invoice.paid',
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            invoiceId: `mock_inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            amount: body.data.amount_paid || 1000,
            currency: body.data.currency || 'usd',
            status: 'paid'
          };
          
          break;
        }
        
        case 'customer.subscription.updated': {
          const subscriptionId = body.data.id;
          const subscription = subscriptions.get(subscriptionId);
          
          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }
          
          // Update subscription
          if (body.data.status) {
            subscription.status = body.data.status;
          }
          
          if (body.data.cancel_at_period_end !== undefined) {
            subscription.cancelAtPeriodEnd = body.data.cancel_at_period_end;
          }
          
          result = {
            event: 'subscription.updated',
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd
          };
          
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscriptionId = body.data.id;
          const subscription = subscriptions.get(subscriptionId);
          
          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }
          
          // Update subscription
          subscription.status = 'canceled';
          subscription.canceledAt = new Date().toISOString();
          
          result = {
            event: 'subscription.deleted',
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            status: subscription.status,
            canceledAt: subscription.canceledAt
          };
          
          break;
        }
        
        default: {
          result = {
            event: body.type,
            data: body.data
          };
        }
      }
      
      _log('Mock webhook processed:', result.event);
      
      // Return top-level event result to match tests
      (result as Record<string, unknown>).provider = 'mock';
      return result as unknown as WebhookResult;
    } catch (error) {
      _log('Error handling mock webhook:', error);
      throw error;
    }
  }
  
  /**
   * Create a customer
   * @param {Object} options - Customer options
   * @param {string} options.email - Customer email
   * @param {string} options.name - Customer name (optional)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Customer
   */
  async function createCustomer(options: Partial<Customer> & { email: string; name?: string; metadata?: Record<string, unknown> }): Promise<Customer> {
    try {
      _log('Creating mock customer:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error creating customer');
      }
      
      // Validate required options
      if (!options.email) {
        throw new Error('Customer email is required');
      }
      
      // Check if customer already exists
      for (const [id, customer] of customers.entries()) {
        if (customer.email === options.email) {
          _log('Customer already exists:', id);
          
          return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            metadata: customer.metadata,
            provider: 'mock',
            providerData: {
              customerId: customer.id
            }
          };
        }
      }
      
      // Create a unique customer ID
      const customerId = `mock_cus_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create customer
      const customer: Customer & { createdAt: string } = {
        id: customerId,
        email: options.email,
        name: options.name,
        metadata: (options.metadata as Record<string, unknown>) || {},
        createdAt: new Date().toISOString()
      };
      
      // Store customer
      customers.set(customerId, customer);
      
      _log('Mock customer created:', customerId);
      
      // Return a standardized response
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: 'mock',
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log('Error creating mock customer:', error);
      throw error;
    }
  }
  
  /**
   * Get a customer
   * @param {Object} options - Customer options
   * @param {string} options.customerId - Customer ID
   * @param {string} options.email - Customer email (optional)
   * @returns {Promise<Object>} - Customer
   */
  async function getCustomer(options: { customerId?: string; email?: string }): Promise<Customer | null> {
    try {
      _log('Getting mock customer:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error getting customer');
      }
      
      // Validate required options
      if (!options.customerId && !options.email) {
        throw new Error('Either customer ID or email is required');
      }
      
      let customer: Customer | undefined;
      
      if (options.customerId) {
        // Get customer by ID
        customer = customers.get(options.customerId);
      } else {
        // Get customer by email
        for (const cust of customers.values()) {
          if (cust.email === options.email) {
            customer = cust;
            break;
          }
        }
      }
      
      if (!customer) {
        return null;
      }
      
      _log('Mock customer retrieved:', customer.id);
      
      // Return a standardized response
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: 'mock',
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log('Error getting mock customer:', error);
      throw error;
    }
  }
  
  /**
   * Create a product
   * @param {Object} options - Product options
   * @param {string} options.name - Product name
   * @param {string} options.description - Product description (optional)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Product
   */
  async function createProduct(options: { name: string; description?: string; metadata?: Record<string, unknown> }): Promise<Product> {
    try {
      _log('Creating mock product:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error creating product');
      }
      
      // Validate required options
      if (!options.name) {
        throw new Error('Product name is required');
      }
      
      // Create a unique product ID
      const productId = `mock_prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create product
      const product: MockProduct = {
        id: productId,
        name: options.name,
        description: options.description,
        metadata: options.metadata || {},
        createdAt: new Date().toISOString()
      };
      
      // Store product
      products.set(productId, product);
      
      _log('Mock product created:', productId);
      
      // Return a standardized response
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        provider: 'mock',
        providerData: {
          productId: product.id
        }
      };
    } catch (error) {
      _log('Error creating mock product:', error);
      throw error;
    }
  }
  
  /**
   * Create a price
   * @param {Object} options - Price options
   * @param {string} options.productId - Product ID
   * @param {string} options.currency - Currency code (default: USD)
   * @param {number} options.unitAmount - Amount in smallest currency unit (e.g., cents)
   * @param {string} options.interval - Billing interval (day, week, month, year)
   * @param {number} options.intervalCount - Number of intervals (default: 1)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Price
   */
  async function createPrice(options: { productId: string; currency: string; unitAmount: number; interval?: 'day' | 'week' | 'month' | 'year'; intervalCount?: number; metadata?: Record<string, unknown> }): Promise<Price> {
    try {
      _log('Creating mock price:', options);
      
      // Simulate delay
      await _delay(config.delay);
      
      // Simulate error
      if (_shouldSimulateError()) {
        throw new Error('Simulated error creating price');
      }
      
      // Validate required options
      if (!options.productId) {
        throw new Error('Product ID is required');
      }
      
      if (!options.unitAmount) {
        throw new Error('Unit amount is required');
      }
      
      // Check if product exists
      if (!products.has(options.productId)) {
        throw new Error(`Product ${options.productId} not found`);
      }
      
      // Create a unique price ID
      const priceId = `mock_price_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create price
      const price: MockPrice = {
        id: priceId,
        productId: options.productId,
        currency: (options.currency || 'usd').toLowerCase(),
        unitAmount: options.unitAmount,
        metadata: options.metadata || {},
        createdAt: new Date().toISOString()
      };
      
      // Add recurring parameters if interval is provided
      if (options.interval) {
        price.recurring = {
          interval: options.interval,
          intervalCount: options.intervalCount || 1
        };
      }
      
      // Store price
      prices.set(priceId, price);
      
      // Update product with default price if not set
      const product = products.get(options.productId)!;
      if (!product.default_price) {
        product.default_price = priceId;
      }
      
      _log('Mock price created:', priceId);
      
      // Return a standardized response
      return {
        id: price.id,
        productId: price.productId,
        currency: price.currency,
        unitAmount: price.unitAmount,
        recurring: price.recurring,
        metadata: price.metadata,
        provider: 'mock',
        providerData: {
          priceId: price.id
        }
      };
    } catch (error) {
      _log('Error creating mock price:', error);
      throw error;
    }
  }
  
  /**
   * Record usage for a customer and metric
   */
  async function recordUsage(options: UsageRecordOptions): Promise<UsageRecordResult> {
    if (!options.customerId) throw new Error('customerId is required');
    if (!options.metricKey) throw new Error('metricKey is required');
    if (typeof options.quantity !== 'number') throw new Error('quantity is required');
    const key = usageKey(options.customerId, options.metricKey);
    const event: UsageEvent = {
      id: `mock_usage_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      customerId: options.customerId,
      metricKey: options.metricKey,
      quantity: options.quantity,
      timestamp: options.timestamp || new Date().toISOString(),
      metadata: options.metadata || {}
    };
    const { inserted } = await usageStorage.addEvent(key, event, options.idempotencyKey);
    _log('Mock usage recorded:', { event, inserted, idempotencyKey: options.idempotencyKey });
    return { id: event.id, success: true, provider: 'mock', providerData: { duplicate: !inserted } };
  }

  /**
   * List usage events
   */
  async function getUsage(options: UsageQueryOptions): Promise<UsageEvent[]> {
    const key = usageKey(options.customerId, options.metricKey);
    const arr = await usageStorage.getEvents(key);
    return arr.filter(e => inRange(e.timestamp, options.start, options.end));
  }

  /**
   * Aggregate usage totals
   */
  async function getUsageAggregate(options: UsageAggregateOptions): Promise<UsageAggregate> {
    const events = await getUsage(options);
    const aggregation = options.aggregation || 'sum';
    let total = 0;
    if (aggregation === 'sum') {
      total = events.reduce((acc, e) => acc + e.quantity, 0);
    } else if (aggregation === 'count') {
      total = events.length;
    } else if (aggregation === 'max') {
      total = events.reduce((acc, e) => Math.max(acc, e.quantity), 0);
    } else {
      total = events.length;
    }
    return { total };
  }

  /**
   * Set a usage policy (limit per window)
   */
  async function setUsagePolicy(options: UsagePolicyOptions): Promise<UsagePolicy> {
    const id = `${options.customerId}:${options.metricKey}`;
    const policy: UsagePolicy = { id, ...options };
    await usageStorage.setPolicy(id, policy);
    return policy;
  }

  /**
   * Check current usage against policy
   */
  async function checkUsageLimit(options: UsageLimitCheckOptions): Promise<UsageLimitResult> {
    const id = `${options.customerId}:${options.metricKey}`;
    const policy = await usageStorage.getPolicy(id);
    if (!policy) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, usage: 0, policy: null };
    }
    const now = new Date();
    let start: string | undefined;
    if (policy.window === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (policy.window === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();
    }
    const usage = (await getUsageAggregate({ customerId: options.customerId, metricKey: options.metricKey, start, aggregation: 'sum' })).total;
    const remaining = Math.max(0, policy.limit - usage);
    return { allowed: remaining > 0, remaining, usage, policy };
  }

  /**
   * Simulate a delay
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise<void>} - Promise that resolves after the delay
   * @private
   */
  function _delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Determine whether to simulate an error
   * @returns {boolean} - Whether to simulate an error
   * @private
   */
  function _shouldSimulateError(): boolean {
    return config.simulateErrors && Math.random() < config.errorRate;
  }
  
  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   * @private
   */
  function _log(...args: unknown[]): void {
    if (config.debug) {
      console.log('[MockProvider]', ...args);
    }
  }
  
  // Return the provider
  return {
    createCheckoutSession,
    createSubscription,
    getSubscription,
    cancelSubscription,
    handleWebhook,
    createCustomer,
    getCustomer,
    createProduct,
    createPrice,
    // Usage metering
    recordUsage,
    getUsage,
    getUsageAggregate,
    setUsagePolicy,
    checkUsageLimit
  };
}

export default createMockProvider;