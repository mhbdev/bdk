var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/providers/stripe.ts
function createStripeProvider(options = {}) {
  const config = {
    secretKey: null,
    publishableKey: null,
    webhookSecret: null,
    products: {},
    prices: {},
    debug: false,
    ...options
  };
  if (!config.secretKey) {
    throw new Error("Stripe secret key is required");
  }
  let stripe;
  try {
    const Stripe = __require("stripe");
    stripe = new Stripe(config.secretKey, {
      apiVersion: "2023-10-16"
    });
    _log("Stripe initialized successfully");
  } catch (error) {
    _log("Error initializing Stripe:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Failed to initialize Stripe: ${err.message}`);
  }
  async function createCheckoutSession(options2) {
    try {
      _log("Creating Stripe checkout session:", options2);
      const lineItems = [];
      if (options2.priceId) {
        lineItems.push({
          price: options2.priceId,
          quantity: 1
        });
      } else if (options2.amount && options2.currency) {
        const productName = typeof options2.productName === "string" ? options2.productName : "Payment";
        const productDescription = typeof options2.description === "string" ? options2.description : void 0;
        lineItems.push({
          price_data: {
            currency: options2.currency.toLowerCase(),
            product_data: {
              name: productName,
              description: productDescription
            },
            unit_amount: options2.amount
          },
          quantity: 1
        });
      } else {
        throw new Error("Either priceId or amount and currency must be provided");
      }
      const sessionParams = {
        line_items: lineItems,
        mode: options2.mode || "payment",
        success_url: options2.successUrl,
        cancel_url: options2.cancelUrl,
        metadata: options2.metadata || {}
      };
      if (options2.customerId) {
        sessionParams.customer = options2.customerId;
      } else if (options2.customerEmail) {
        sessionParams.customer_email = options2.customerEmail;
      }
      const session = await stripe.checkout.sessions.create(sessionParams);
      _log("Stripe checkout session created:", session.id);
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
        expiresAt: session.expires_at ? new Date(session.expires_at * 1e3).toISOString() : null,
        provider: "stripe",
        providerData: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          subscriptionId: session.subscription
        }
      };
    } catch (error) {
      _log("Error creating Stripe checkout session:", error);
      throw error;
    }
  }
  async function createSubscription(options2) {
    try {
      _log("Creating Stripe subscription:", options2);
      if (!options2.customerId) {
        throw new Error("Customer ID is required");
      }
      if (!options2.priceId) {
        throw new Error("Price ID is required");
      }
      const subscriptionParams = {
        customer: options2.customerId,
        items: [{ price: options2.priceId }],
        metadata: options2.metadata || {}
      };
      if (options2.paymentMethodId) {
        subscriptionParams.default_payment_method = options2.paymentMethodId;
      }
      const subscription = await stripe.subscriptions.create(subscriptionParams);
      _log("Stripe subscription created:", subscription.id);
      return {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1e3).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1e3).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1e3).toISOString() : null,
        metadata: subscription.metadata,
        items: subscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity
        })),
        provider: "stripe",
        providerData: {
          subscriptionId: subscription.id,
          latestInvoiceId: subscription.latest_invoice
        }
      };
    } catch (error) {
      _log("Error creating Stripe subscription:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
  async function getSubscription(options2) {
    try {
      _log("Getting Stripe subscription:", options2);
      if (!options2.subscriptionId && !options2.customerId) {
        throw new Error("Either subscription ID or customer ID is required");
      }
      let subscription;
      if (options2.subscriptionId) {
        subscription = await stripe.subscriptions.retrieve(options2.subscriptionId);
      } else {
        const subscriptions = await stripe.subscriptions.list({
          customer: options2.customerId,
          limit: 1,
          status: "active"
        });
        if (subscriptions.data.length === 0) {
          return null;
        }
        subscription = subscriptions.data[0];
      }
      _log("Stripe subscription retrieved:", subscription.id);
      return {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1e3).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1e3).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1e3).toISOString() : null,
        metadata: subscription.metadata,
        items: subscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity
        })),
        provider: "stripe",
        providerData: {
          subscriptionId: subscription.id,
          latestInvoiceId: subscription.latest_invoice
        }
      };
    } catch (error) {
      _log("Error getting Stripe subscription:", error);
      const err = error;
      if (err && err.code === "resource_missing") {
        return null;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
  async function cancelSubscription(options2) {
    try {
      _log("Canceling Stripe subscription:", options2);
      if (!options2.subscriptionId) {
        throw new Error("Subscription ID is required");
      }
      let subscription;
      if (options2.atPeriodEnd) {
        subscription = await stripe.subscriptions.update(options2.subscriptionId, {
          cancel_at_period_end: true
        });
      } else {
        subscription = await stripe.subscriptions.cancel(options2.subscriptionId);
      }
      _log("Stripe subscription canceled:", subscription.id);
      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1e3).toISOString() : null,
        provider: "stripe",
        success: true
      };
    } catch (error) {
      _log("Error canceling Stripe subscription:", error);
      throw error;
    }
  }
  async function handleWebhook(options2) {
    try {
      _log("Handling Stripe webhook");
      if (!options2.body) {
        throw new Error("Webhook body is required");
      }
      if (!options2.signature && !options2.headers) {
        throw new Error("Webhook signature or headers are required");
      }
      const signature = options2.signature || options2.headers?.["stripe-signature"];
      if (!signature) {
        throw new Error("Stripe signature not found in headers");
      }
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          options2.body,
          signature,
          config.webhookSecret
        );
      } catch (error) {
        _log("Error verifying webhook signature:", error);
        const err = error instanceof Error ? error : new Error(String(error));
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }
      _log("Stripe webhook verified:", event.type);
      let result;
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          result = {
            event: "checkout.completed",
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
        case "invoice.paid": {
          const invoice = event.data.object;
          result = {
            event: "invoice.paid",
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
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          result = {
            event: "invoice.payment_failed",
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
        case "customer.subscription.created": {
          const subscription = event.data.object;
          result = {
            event: "subscription.created",
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1e3).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1e3).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadata: subscription.metadata
          };
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          result = {
            event: "subscription.updated",
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1e3).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1e3).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1e3).toISOString() : null,
            metadata: subscription.metadata
          };
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          result = {
            event: "subscription.deleted",
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1e3).toISOString() : null,
            metadata: subscription.metadata
          };
          break;
        }
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          result = {
            event: "payment.succeeded",
            customerId: paymentIntent.customer,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            metadata: paymentIntent.metadata
          };
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          result = {
            event: "payment.failed",
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
      _log("Stripe webhook processed:", result.event);
      return {
        handled: true,
        type: result.event,
        data: {
          ...result,
          provider: "stripe",
          originalEvent: event
        }
      };
    } catch (error) {
      _log("Error handling Stripe webhook:", error);
      throw error;
    }
  }
  async function createCustomer(options2) {
    try {
      _log("Creating Stripe customer:", options2);
      if (!options2.email) {
        throw new Error("Customer email is required");
      }
      const customer = await stripe.customers.create({
        email: options2.email,
        name: options2.name,
        metadata: options2.metadata || {}
      });
      _log("Stripe customer created:", customer.id);
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: "stripe",
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log("Error creating Stripe customer:", error);
      throw error;
    }
  }
  async function getCustomer(options2) {
    try {
      _log("Getting Stripe customer:", options2);
      if (!options2.customerId && !options2.email) {
        throw new Error("Either customer ID or email is required");
      }
      let customer;
      if (options2.customerId) {
        customer = await stripe.customers.retrieve(options2.customerId);
      } else {
        const customers = await stripe.customers.list({
          email: options2.email,
          limit: 1
        });
        if (customers.data.length === 0) {
          return null;
        }
        customer = customers.data[0];
      }
      _log("Stripe customer retrieved:", customer.id);
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: "stripe",
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log("Error getting Stripe customer:", error);
      const err = error;
      if (err && err.code === "resource_missing") {
        return null;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
  async function updateCustomer(options2) {
    try {
      _log("Updating Stripe customer:", options2);
      if (!options2.customerId) {
        throw new Error("Customer ID is required");
      }
      const updateParams = {};
      if (options2.email) {
        updateParams.email = options2.email;
      }
      if (options2.name) {
        updateParams.name = options2.name;
      }
      if (options2.metadata) {
        updateParams.metadata = options2.metadata;
      }
      const customer = await stripe.customers.update(options2.customerId, updateParams);
      _log("Stripe customer updated:", customer.id);
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: "stripe",
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log("Error updating Stripe customer:", error);
      throw error;
    }
  }
  async function createPaymentMethod(options2) {
    try {
      _log("Creating Stripe payment method:", options2);
      if (!options2.customerId) {
        throw new Error("Customer ID is required");
      }
      if (!options2.type) {
        throw new Error("Payment method type is required");
      }
      if (!options2.data) {
        throw new Error("Payment method data is required");
      }
      const paymentMethod = await stripe.paymentMethods.create({
        type: options2.type,
        [options2.type]: options2.data
      });
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: options2.customerId
      });
      _log("Stripe payment method created and attached:", paymentMethod.id);
      return {
        id: paymentMethod.id,
        customerId: options2.customerId,
        type: paymentMethod.type,
        provider: "stripe",
        providerData: {
          paymentMethodId: paymentMethod.id
        }
      };
    } catch (error) {
      _log("Error creating Stripe payment method:", error);
      throw error;
    }
  }
  async function getPaymentMethods(options2) {
    try {
      _log("Getting Stripe payment methods:", options2);
      if (!options2.customerId) {
        throw new Error("Customer ID is required");
      }
      const paymentMethods = await stripe.paymentMethods.list({
        customer: options2.customerId,
        type: options2.type
      });
      _log("Stripe payment methods retrieved:", paymentMethods.data.length);
      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        customerId: options2.customerId,
        type: pm.type,
        provider: "stripe",
        providerData: {
          paymentMethodId: pm.id,
          card: pm.card
        }
      }));
    } catch (error) {
      _log("Error getting Stripe payment methods:", error);
      throw error;
    }
  }
  async function createProduct(options2) {
    try {
      _log("Creating Stripe product:", options2);
      if (!options2.name) {
        throw new Error("Product name is required");
      }
      const product = await stripe.products.create({
        name: options2.name,
        description: options2.description,
        metadata: options2.metadata || {}
      });
      _log("Stripe product created:", product.id);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        provider: "stripe",
        providerData: {
          productId: product.id
        }
      };
    } catch (error) {
      _log("Error creating Stripe product:", error);
      throw error;
    }
  }
  async function createPrice(options2) {
    try {
      _log("Creating Stripe price:", options2);
      if (!options2.productId) {
        throw new Error("Product ID is required");
      }
      if (!options2.unitAmount) {
        throw new Error("Unit amount is required");
      }
      const normalizedCurrency = typeof options2.currency === "string" ? options2.currency.toLowerCase() : "usd";
      const priceParams = {
        product: options2.productId,
        currency: normalizedCurrency,
        unit_amount: options2.unitAmount,
        metadata: options2.metadata || {}
      };
      if (options2.interval) {
        priceParams.recurring = {
          interval: options2.interval,
          interval_count: options2.intervalCount || 1
        };
      }
      const price = await stripe.prices.create(priceParams);
      _log("Stripe price created:", price.id);
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
        provider: "stripe",
        providerData: {
          priceId: price.id
        }
      };
    } catch (error) {
      _log("Error creating Stripe price:", error);
      throw error;
    }
  }
  async function createPayment(options2) {
    try {
      _log("Creating Stripe payment:", options2);
      if (!options2.amount) {
        throw new Error("Amount is required");
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: options2.amount,
        currency: options2.currency.toLowerCase(),
        customer: options2.customerId,
        metadata: options2.metadata || {},
        confirm: false
      });
      _log("Stripe payment intent created:", paymentIntent.id);
      return {
        id: paymentIntent.id,
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        metadata: paymentIntent.metadata,
        provider: "stripe",
        providerData: {
          paymentIntentId: paymentIntent.id
        }
      };
    } catch (error) {
      _log("Error creating Stripe payment:", error);
      throw error;
    }
  }
  function _log(...args) {
    if (config.debug) {
      console.log("[StripeProvider]", ...args);
    }
  }
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
    async recordUsage(options2) {
      try {
        _log("Recording Stripe usage:", options2);
        if (!options2.subscriptionItemId) {
          throw new Error("subscriptionItemId is required to record usage in Stripe");
        }
        if (typeof options2.quantity !== "number") {
          throw new Error("quantity is required");
        }
        const ts = options2.timestamp ? Math.floor(new Date(options2.timestamp).getTime() / 1e3) : Math.floor(Date.now() / 1e3);
        const usageRecord = await stripe.usageRecords.create({
          subscription_item: options2.subscriptionItemId,
          quantity: options2.quantity,
          timestamp: ts,
          action: "increment"
        }, { idempotencyKey: options2.idempotencyKey });
        return { id: usageRecord.id, success: true, provider: "stripe", providerData: { usageRecordId: usageRecord.id } };
      } catch (error) {
        _log("Error recording Stripe usage:", error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
  };
}
var stripe_default = createStripeProvider;

export { createStripeProvider, stripe_default as default };
//# sourceMappingURL=stripe.js.map
//# sourceMappingURL=stripe.js.map