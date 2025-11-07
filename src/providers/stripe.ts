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
  PaymentMethod,
  PaymentResult
} from '../types';
import type {
  UsageRecordOptions,
  UsageRecordResult
} from '../types';
/**
 * Stripe Provider for Payment Gateway
 * 
 * Implements the Stripe payment provider interface.
 */

/**
 * Create a Stripe provider
 * @param {Object} options - Configuration options
 * @param {string} options.secretKey - Stripe secret key
 * @param {string} options.publishableKey - Stripe publishable key
 * @param {string} options.webhookSecret - Stripe webhook secret
 * @param {Object} options.products - Product configuration
 * @param {Object} options.prices - Price configuration
 * @param {boolean} options.debug - Enable debug mode
 * @returns {Object} - Stripe provider
 */
interface StripeProviderOptions {
  secretKey: string | null;
  publishableKey: string | null;
  webhookSecret: string | null;
  products: Record<string, unknown>;
  prices: Record<string, unknown>;
  debug: boolean;
}

export function createStripeProvider(options: Partial<StripeProviderOptions> = {}): PaymentProvider {
  // Default options
  const config: StripeProviderOptions = {
    secretKey: null,
    publishableKey: null,
    webhookSecret: null,
    products: {},
    prices: {},
    debug: false,
    ...options
  };
  
  // Validate required options
  if (!config.secretKey) {
    throw new Error('Stripe secret key is required');
  }
  
  // Initialize Stripe
  let stripe: any;
  try {
    // Dynamically import Stripe to avoid requiring it for all providers
    const Stripe = require('stripe');
    stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16'
    });
    
    _log('Stripe initialized successfully');
  } catch (error: unknown) {
    _log('Error initializing Stripe:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Failed to initialize Stripe: ${err.message}`);
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
  async function createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession> {
    try {
      _log('Creating Stripe checkout session:', options);
      
      // Prepare line items
      const lineItems: Array<{ price?: string; quantity: number; price_data?: { currency: string; product_data: { name: string; description?: string } ; unit_amount: number } }> = [];
      
      if (options.priceId) {
        // Use price ID directly
        lineItems.push({
          price: options.priceId,
          quantity: 1
        });
      } else if (options.amount && options.currency) {
        // Create a one-time price
        const productName = typeof options.productName === 'string' ? options.productName : 'Payment';
        const productDescription = typeof options.description === 'string' ? options.description : undefined;
        lineItems.push({
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: {
              name: productName,
              description: productDescription
            },
            unit_amount: options.amount
          },
          quantity: 1
        });
      } else {
        throw new Error('Either priceId or amount and currency must be provided');
      }
      
      // Prepare session parameters
      const sessionParams: Record<string, unknown> = {
        line_items: lineItems,
        mode: options.mode || 'payment',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: options.metadata || {}
      };
      
      // Add customer if provided
      if (options.customerId) {
        sessionParams.customer = options.customerId;
      } else if (options.customerEmail) {
        sessionParams.customer_email = options.customerEmail;
      }
      
      // Create the session
      const session = await stripe.checkout.sessions.create(sessionParams);
      
      _log('Stripe checkout session created:', session.id);
      
      // Return a standardized response
      return {
        id: session.id,
        url: session.url,
        status: session.status,
        customerId: session.customer,
        customerEmail: session.customer_email,
        mode: session.mode,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        provider: 'stripe',
        providerData: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          subscriptionId: session.subscription
        }
      };
    } catch (error) {
      _log('Error creating Stripe checkout session:', error);
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
      _log('Creating Stripe subscription:', options);
      
      // Validate required options
      if (!options.customerId) {
        throw new Error('Customer ID is required');
      }
      
      if (!options.priceId) {
        throw new Error('Price ID is required');
      }
      
      // Prepare subscription parameters
      const subscriptionParams: Record<string, unknown> = {
        customer: options.customerId,
        items: [{ price: options.priceId }],
        metadata: options.metadata || {}
      };
      
      // Add payment method if provided
      if (options.paymentMethodId) {
        subscriptionParams.default_payment_method = options.paymentMethodId;
      }
      
      // Create the subscription
      const subscription = await stripe.subscriptions.create(subscriptionParams);
      
      _log('Stripe subscription created:', subscription.id);
      
      // Return a standardized response
      return {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        metadata: subscription.metadata,
        items: subscription.items.data.map((item: any) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity
        })),
        provider: 'stripe',
        providerData: {
          subscriptionId: subscription.id,
          latestInvoiceId: subscription.latest_invoice
        }
      };
    } catch (error: unknown) {
      _log('Error creating Stripe subscription:', error);
      throw (error instanceof Error ? error : new Error(String(error)));
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
      _log('Getting Stripe subscription:', options);
      
      // Validate required options
      if (!options.subscriptionId && !options.customerId) {
        throw new Error('Either subscription ID or customer ID is required');
      }
      
      let subscription;
      
      if (options.subscriptionId) {
        // Get subscription by ID
        subscription = await stripe.subscriptions.retrieve(options.subscriptionId);
      } else {
        // Get subscriptions for customer
        const subscriptions = await stripe.subscriptions.list({
          customer: options.customerId,
          limit: 1,
          status: 'active'
        });
        
        if (subscriptions.data.length === 0) {
          return null;
        }
        
        subscription = subscriptions.data[0];
      }
      
      _log('Stripe subscription retrieved:', subscription.id);
      
      // Return a standardized response
      return {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        metadata: subscription.metadata,
        items: subscription.items.data.map((item: any) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity
        })),
        provider: 'stripe',
        providerData: {
          subscriptionId: subscription.id,
          latestInvoiceId: subscription.latest_invoice
        }
      };
    } catch (error: unknown) {
      _log('Error getting Stripe subscription:', error);
      const err = error as { code?: string };
      // Return null for not found errors
      if (err && err.code === 'resource_missing') {
        return null;
      }
      throw (error instanceof Error ? error : new Error(String(error)));
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
      _log('Canceling Stripe subscription:', options);
      
      // Validate required options
      if (!options.subscriptionId) {
        throw new Error('Subscription ID is required');
      }
      
      let subscription;
      
      if (options.atPeriodEnd) {
        // Cancel at period end
        subscription = await stripe.subscriptions.update(options.subscriptionId, {
          cancel_at_period_end: true
        });
      } else {
        // Cancel immediately
        subscription = await stripe.subscriptions.cancel(options.subscriptionId);
      }
      
      _log('Stripe subscription canceled:', subscription.id);
      
      // Return a standardized response
      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        provider: 'stripe',
        success: true
      };
    } catch (error) {
      _log('Error canceling Stripe subscription:', error);
      throw error;
    }
  }
  
  /**
   * Handle a webhook event
   * @param {Object} options - Webhook options
   * @param {string} options.body - Webhook body
   * @param {Object} options.headers - Webhook headers
   * @param {string} options.signature - Webhook signature
   * @returns {Promise<Object>} - Webhook handling result
   */
  async function handleWebhook(options: WebhookOptions): Promise<WebhookResult> {
    try {
      _log('Handling Stripe webhook');
      
      // Validate required options
      if (!options.body) {
        throw new Error('Webhook body is required');
      }
      
      if (!options.signature && !options.headers) {
        throw new Error('Webhook signature or headers are required');
      }
      
      // Get signature from headers if not provided directly
      const signature = options.signature || options.headers?.['stripe-signature'];
      
      if (!signature) {
        throw new Error('Stripe signature not found in headers');
      }
      
      // Verify webhook signature
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(
          options.body,
          signature,
          config.webhookSecret
        );
      } catch (error: unknown) {
        _log('Error verifying webhook signature:', error);
        const err = error instanceof Error ? error : new Error(String(error));
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }
      
      _log('Stripe webhook verified:', event.type);
      
      // Process the event
      let result;
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          
          result = {
            event: 'checkout.completed',
            customerId: session.customer,
            customerEmail: session.customer_email,
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            subscriptionId: session.subscription,
            amount: session.amount_total,
            currency: session.currency,
            metadata: session.metadata,
            mode: session.mode,
            status: session.status,
            paymentStatus: session.payment_status
          };
          
          break;
        }
        
        case 'invoice.paid': {
          const invoice = event.data.object;
          
          result = {
            event: 'invoice.paid',
            customerId: invoice.customer,
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status,
            paid: invoice.paid,
            metadata: invoice.metadata
          };
          
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          
          result = {
            event: 'invoice.payment_failed',
            customerId: invoice.customer,
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: invoice.status,
            paid: invoice.paid,
            metadata: invoice.metadata
          };
          
          break;
        }
        
        case 'customer.subscription.created': {
          const subscription = event.data.object;
          
          result = {
            event: 'subscription.created',
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadata: subscription.metadata
          };
          
          break;
        }
        
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          
          result = {
            event: 'subscription.updated',
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            metadata: subscription.metadata
          };
          
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          
          result = {
            event: 'subscription.deleted',
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            metadata: subscription.metadata
          };
          
          break;
        }
        
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          
          result = {
            event: 'payment.succeeded',
            customerId: paymentIntent.customer,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            metadata: paymentIntent.metadata
          };
          
          break;
        }
        
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          
          result = {
            event: 'payment.failed',
            customerId: paymentIntent.customer,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            error: paymentIntent.last_payment_error,
            metadata: paymentIntent.metadata
          };
          
          break;
        }
        
        default: {
          result = {
            event: event.type,
            data: event.data.object
          };
        }
      }
      
      _log('Stripe webhook processed:', (result as any).event);

      // Normalize to WebhookResult shape
      return {
        handled: true,
        type: (result as any).event,
        data: {
          ...result,
          provider: 'stripe',
          originalEvent: event
        }
      };
    } catch (error) {
      _log('Error handling Stripe webhook:', error);
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
      _log('Creating Stripe customer:', options);
      
      // Validate required options
      if (!options.email) {
        throw new Error('Customer email is required');
      }
      
      // Create customer
      const customer = await stripe.customers.create({
        email: options.email,
        name: options.name,
        metadata: options.metadata || {}
      });
      
      _log('Stripe customer created:', customer.id);
      
      // Return a standardized response
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: 'stripe',
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log('Error creating Stripe customer:', error);
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
      _log('Getting Stripe customer:', options);
      
      // Validate required options
      if (!options.customerId && !options.email) {
        throw new Error('Either customer ID or email is required');
      }
      
      let customer;
      
      if (options.customerId) {
        // Get customer by ID
        customer = await stripe.customers.retrieve(options.customerId);
      } else {
        // Get customers by email
        const customers = await stripe.customers.list({
          email: options.email,
          limit: 1
        });
        
        if (customers.data.length === 0) {
          return null;
        }
        
        customer = customers.data[0];
      }
      
      _log('Stripe customer retrieved:', customer.id);
      
      // Return a standardized response
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: 'stripe',
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error: unknown) {
      _log('Error getting Stripe customer:', error);
      const err = error as { code?: string };
      // Return null for not found errors
      if (err && err.code === 'resource_missing') {
        return null;
      }
      throw (error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Update a customer
   * @param {Object} options - Customer options
   * @param {string} options.customerId - Customer ID
   * @param {string} options.email - Customer email (optional)
   * @param {string} options.name - Customer name (optional)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Updated customer
   */
  async function updateCustomer(options: { customerId: string; email?: string; name?: string; metadata?: Record<string, unknown> }): Promise<Customer> {
    try {
      _log('Updating Stripe customer:', options);
      
      // Validate required options
      if (!options.customerId) {
        throw new Error('Customer ID is required');
      }
      
      // Prepare update parameters
      const updateParams: Record<string, unknown> = {};
      
      if (options.email) {
        updateParams.email = options.email;
      }
      
      if (options.name) {
        updateParams.name = options.name;
      }
      
      if (options.metadata) {
        updateParams.metadata = options.metadata;
      }
      
      // Update customer
      const customer = await stripe.customers.update(options.customerId, updateParams);
      
      _log('Stripe customer updated:', customer.id);
      
      // Return a standardized response
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: 'stripe',
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log('Error updating Stripe customer:', error);
      throw error;
    }
  }
  
  /**
   * Create a payment method
   * @param {Object} options - Payment method options
   * @param {string} options.customerId - Customer ID
   * @param {string} options.type - Payment method type
   * @param {Object} options.data - Payment method data
   * @returns {Promise<Object>} - Payment method
   */
  async function createPaymentMethod(options: { customerId: string; type: string; data: Record<string, unknown> }): Promise<PaymentMethod> {
    try {
      _log('Creating Stripe payment method:', options);
      
      // Validate required options
      if (!options.customerId) {
        throw new Error('Customer ID is required');
      }
      
      if (!options.type) {
        throw new Error('Payment method type is required');
      }
      
      if (!options.data) {
        throw new Error('Payment method data is required');
      }
      
      // Create payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: options.type,
        [options.type]: options.data
      });
      
      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: options.customerId
      });
      
      _log('Stripe payment method created and attached:', paymentMethod.id);
      
      // Return a standardized response
      return {
        id: paymentMethod.id,
        customerId: options.customerId,
        type: paymentMethod.type,
        provider: 'stripe',
        providerData: {
          paymentMethodId: paymentMethod.id
        }
      };
    } catch (error) {
      _log('Error creating Stripe payment method:', error);
      throw error;
    }
  }
  
  /**
   * Get payment methods for a customer
   * @param {Object} options - Payment method options
   * @param {string} options.customerId - Customer ID
   * @param {string} options.type - Payment method type (optional)
   * @returns {Promise<Array>} - Payment methods
   */
  async function getPaymentMethods(options: { customerId: string; type?: string }): Promise<PaymentMethod[]> {
    try {
      _log('Getting Stripe payment methods:', options);
      
      // Validate required options
      if (!options.customerId) {
        throw new Error('Customer ID is required');
      }
      
      // Get payment methods
      const paymentMethods: { data: any[] } = await stripe.paymentMethods.list({
        customer: options.customerId,
        type: options.type
      });
      
      _log('Stripe payment methods retrieved:', paymentMethods.data.length);
      
      // Return a standardized response
      return paymentMethods.data.map((pm: any) => ({
        id: pm.id,
        customerId: options.customerId,
        type: pm.type,
        provider: 'stripe',
        providerData: {
          paymentMethodId: pm.id,
          card: pm.card
        }
      }));
    } catch (error) {
      _log('Error getting Stripe payment methods:', error);
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
  async function createProduct(options: Omit<Product, 'id'>): Promise<Product> {
    try {
      _log('Creating Stripe product:', options);
      
      // Validate required options
      if (!options.name) {
        throw new Error('Product name is required');
      }
      
      // Create product
      const product = await stripe.products.create({
        name: options.name,
        description: options.description,
        metadata: options.metadata || {}
      });
      
      _log('Stripe product created:', product.id);
      
      // Return a standardized response
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        provider: 'stripe',
        providerData: {
          productId: product.id
        }
      };
    } catch (error) {
      _log('Error creating Stripe product:', error);
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
  async function createPrice(options: Omit<Price, 'id'> & { interval?: 'day' | 'week' | 'month' | 'year'; intervalCount?: number }): Promise<Price> {
    try {
      _log('Creating Stripe price:', options);
      
      // Validate required options
      if (!options.productId) {
        throw new Error('Product ID is required');
      }
      
      if (!options.unitAmount) {
        throw new Error('Unit amount is required');
      }
      
      // Prepare price parameters
      const normalizedCurrency = typeof options.currency === 'string' ? options.currency.toLowerCase() : 'usd';
      const priceParams: Record<string, unknown> = {
        product: options.productId,
        currency: normalizedCurrency,
        unit_amount: options.unitAmount,
        metadata: options.metadata || {}
      };
      
      // Add recurring parameters if interval is provided
      if (options.interval) {
        priceParams.recurring = {
          interval: options.interval,
          interval_count: options.intervalCount || 1
        };
      }
      
      // Create price
      const price = await stripe.prices.create(priceParams);
      
      _log('Stripe price created:', price.id);
      
      // Return a standardized response
      return {
        id: price.id,
        productId: price.product,
        currency: price.currency,
        unitAmount: price.unit_amount,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count
        } : null,
        metadata: price.metadata,
        provider: 'stripe',
        providerData: {
          priceId: price.id
        }
      };
    } catch (error) {
      _log('Error creating Stripe price:', error);
      throw error;
    }
  }
  
  /**
   * Create a payment
   * @param {Object} options - Payment options
   * @param {string} options.customerId - Customer ID
   * @param {number} options.amount - Amount in smallest currency unit (e.g., cents)
   * @param {string} options.currency - Currency code (default: USD)
   * @param {string} options.description - Payment description (optional)
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Payment
   */
  async function createPayment(options: { amount: number; currency: string; customerId?: string; metadata?: Record<string, unknown> }): Promise<PaymentResult> {
    try {
      _log('Creating Stripe payment:', options);
      
      // Validate required options
      if (!options.amount) {
        throw new Error('Amount is required');
      }
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: options.amount,
        currency: options.currency.toLowerCase(),
        customer: options.customerId,
        metadata: options.metadata || {},
        confirm: false
      });
      
      _log('Stripe payment intent created:', paymentIntent.id);
      
      // Return a standardized response
      return {
        id: paymentIntent.id,
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        metadata: paymentIntent.metadata,
        provider: 'stripe',
        providerData: {
          paymentIntentId: paymentIntent.id
        }
      };
    } catch (error) {
      _log('Error creating Stripe payment:', error);
      throw error;
    }
  }
  
  
  
  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   * @private
   */
  function _log(...args: unknown[]): void {
    if (config.debug) {
      console.log('[StripeProvider]', ...args);
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
    updateCustomer,
    createPaymentMethod,
    getPaymentMethods,
    createProduct,
    createPrice,
    createPayment,
    // Usage metering (Stripe metered billing)
    async recordUsage(options: UsageRecordOptions): Promise<UsageRecordResult> {
      try {
        _log('Recording Stripe usage:', options);
        if (!options.subscriptionItemId) {
          throw new Error('subscriptionItemId is required to record usage in Stripe');
        }
        if (typeof options.quantity !== 'number') {
          throw new Error('quantity is required');
        }
        const ts = options.timestamp ? Math.floor(new Date(options.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
        const usageRecord = await stripe.usageRecords.create({
          subscription_item: options.subscriptionItemId,
          quantity: options.quantity,
          timestamp: ts,
          action: 'increment'
        }, { idempotencyKey: options.idempotencyKey });
        return { id: usageRecord.id, success: true, provider: 'stripe', providerData: { usageRecordId: usageRecord.id } };
      } catch (error: unknown) {
        _log('Error recording Stripe usage:', error);
        throw (error instanceof Error ? error : new Error(String(error)));
      }
    }
  };
}

export default createStripeProvider;