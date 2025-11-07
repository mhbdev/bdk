import EventEmitter from 'eventemitter3';
import crypto2 from 'crypto';

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

// src/providers/paypal.ts
function createPayPalProvider(options) {
  if (!options.clientId) {
    throw new Error("PayPal client ID is required");
  }
  if (!options.clientSecret) {
    throw new Error("PayPal client secret is required");
  }
  const config = {
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    sandbox: options.sandbox !== false,
    webhookId: options.webhookId || null,
    debug: options.debug || false
  };
  const baseUrl = config.sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  let accessToken = null;
  let tokenExpiry = null;
  async function getAccessToken() {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      return accessToken;
    }
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`
      },
      body: "grant_type=client_credentials"
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`PayPal authentication failed: ${error.error_description || "Unknown error"}`);
    }
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1e3 - 6e4;
    return accessToken;
  }
  async function apiRequest(endpoint, method = "GET", body = null) {
    const token = await getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
    const options2 = { method, headers };
    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options2.body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${endpoint}`, options2);
    const responseData = await response.json();
    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error_description || "Unknown error";
      throw new Error(`PayPal API error: ${errorMessage}`);
    }
    return responseData;
  }
  async function createCheckoutSession(options2) {
    const {
      customerEmail,
      priceId,
      productId,
      successUrl,
      cancelUrl,
      metadata = {},
      mode = "payment",
      currency = "USD",
      amount
    } = options2;
    if (!successUrl) {
      throw new Error("Success URL is required");
    }
    if (!cancelUrl) {
      throw new Error("Cancel URL is required");
    }
    if (mode === "payment") {
      if (!amount) {
        throw new Error("Amount is required for payment mode");
      }
      const brandName = typeof metadata.brandName === "string" ? metadata.brandName : "Your Store";
      const orderData = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency.toUpperCase(),
              value: (amount / 100).toFixed(2)
              // Convert from cents to dollars
            },
            description: metadata.description || "Payment"
          }
        ],
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
          brand_name: brandName,
          user_action: "PAY_NOW"
        }
      };
      if (customerEmail) {
        orderData.payer = {
          email_address: customerEmail
        };
      }
      const order = await apiRequest("/v2/checkout/orders", "POST", orderData);
      const approval = order.links.find((link) => link.rel === "approve");
      const approvalUrl = approval ? approval.href : "";
      return {
        id: order.id,
        url: approvalUrl,
        status: order.status,
        mode: "payment",
        metadata
      };
    } else if (mode === "subscription") {
      if (!priceId && !productId) {
        throw new Error("Price ID or Product ID is required for subscription mode");
      }
      let planId = priceId;
      if (!planId && productId) {
        throw new Error("Creating plans from products is not implemented yet");
      }
      const subBrandName = typeof metadata.brandName === "string" ? metadata.brandName : "Your Store";
      const subscriptionData = {
        plan_id: planId,
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
          brand_name: subBrandName,
          user_action: "SUBSCRIBE_NOW"
        }
      };
      if (customerEmail) {
        subscriptionData.subscriber = {
          email_address: customerEmail
        };
      }
      const subscription = await apiRequest("/v1/billing/subscriptions", "POST", subscriptionData);
      const approval = (subscription.links || []).find((link) => link.rel === "approve");
      const approvalUrl = approval ? approval.href : "";
      return {
        id: subscription.id,
        url: approvalUrl,
        status: subscription.status,
        mode: "subscription",
        metadata
      };
    } else {
      throw new Error(`Unsupported checkout mode: ${mode}`);
    }
  }
  async function createSubscription(options2) {
    const {
      customerId,
      customerEmail,
      priceId,
      planId,
      metadata = {}
    } = options2;
    if (!customerEmail) {
      throw new Error("Customer email is required");
    }
    if (!priceId && !planId) {
      throw new Error("Price ID or Plan ID is required");
    }
    const subscriptionPlanId = planId || priceId;
    const subCreateBrandName = typeof metadata.brandName === "string" ? metadata.brandName : "Your Store";
    const subscriptionData = {
      plan_id: subscriptionPlanId,
      application_context: {
        brand_name: subCreateBrandName,
        user_action: "SUBSCRIBE_NOW"
      }
    };
    if (customerEmail) {
      subscriptionData.subscriber = { email_address: customerEmail };
    }
    const subscription = await apiRequest("/v1/billing/subscriptions", "POST", subscriptionData);
    return {
      id: subscription.id,
      status: subscription.status,
      customerId: customerId || subscription.subscriber?.email_address || "",
      // Standard fields
      currentPeriodStart: subscription.start_time,
      currentPeriodEnd: subscription.billing_info?.next_billing_time || void 0,
      metadata,
      // Extended convenience fields expected by tests
      planId: subscriptionPlanId,
      startDate: subscription.start_time,
      endDate: subscription.billing_info?.next_billing_time
    };
  }
  async function getSubscription(options2) {
    const { subscriptionId } = options2;
    if (!subscriptionId) {
      throw new Error("Subscription ID is required");
    }
    const subscription = await apiRequest(`/v1/billing/subscriptions/${subscriptionId}`);
    let parsedMeta = {};
    if (subscription.custom_id) {
      try {
        parsedMeta = JSON.parse(subscription.custom_id);
      } catch {
        parsedMeta = {};
      }
    }
    return {
      id: subscription.id,
      status: subscription.status,
      customerId: subscription.subscriber?.email_address || "",
      currentPeriodStart: subscription.start_time,
      currentPeriodEnd: subscription.billing_info?.next_billing_time || void 0,
      metadata: parsedMeta,
      // Extended convenience fields expected by tests
      planId: subscription.plan_id,
      startDate: subscription.start_time,
      endDate: subscription.billing_info?.next_billing_time
    };
  }
  async function cancelSubscription(options2) {
    const { subscriptionId, atPeriodEnd = false, reason = "Canceled by customer" } = options2;
    if (!subscriptionId) {
      throw new Error("Subscription ID is required");
    }
    if (atPeriodEnd) {
      await apiRequest(`/v1/billing/subscriptions/${subscriptionId}/suspend`, "POST", { reason });
      return {
        id: subscriptionId,
        status: "SUSPENDED",
        canceledAt: (/* @__PURE__ */ new Date()).toISOString(),
        cancelAtPeriodEnd: true
      };
    } else {
      await apiRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, "POST", { reason });
      return {
        id: subscriptionId,
        status: "CANCELED",
        canceledAt: (/* @__PURE__ */ new Date()).toISOString(),
        cancelAtPeriodEnd: false
      };
    }
  }
  async function handleWebhook(options2) {
    const { body, signature } = options2;
    let event;
    try {
      const eventData2 = typeof body === "string" ? JSON.parse(body) : body;
      if (config.webhookId && signature) {
      }
      event = eventData2;
    } catch (error) {
      throw new Error(`Invalid webhook payload: ${error.message}`);
    }
    const eventTypeMap = {
      "PAYMENT.SALE.COMPLETED": "payment.succeeded",
      "PAYMENT.SALE.REFUNDED": "payment.refunded",
      "PAYMENT.SALE.REVERSED": "payment.disputed",
      "BILLING.SUBSCRIPTION.CREATED": "subscription.created",
      "BILLING.SUBSCRIPTION.ACTIVATED": "subscription.activated",
      "BILLING.SUBSCRIPTION.UPDATED": "subscription.updated",
      "BILLING.SUBSCRIPTION.CANCELLED": "subscription.canceled",
      "BILLING.SUBSCRIPTION.SUSPENDED": "subscription.paused",
      "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "invoice.payment_failed"
    };
    const standardizedEventType = eventTypeMap[event.event_type] || event.event_type;
    let eventData = {};
    if (event.resource) {
      const resource = event.resource;
      eventData = {
        id: resource.id,
        object: (event.resource_type || "").toLowerCase(),
        created: new Date(event.create_time).getTime() / 1e3,
        data: {
          object: resource
        }
      };
    }
    const resourceId = event.resource && event.resource.id ? event.resource.id : void 0;
    return {
      handled: true,
      type: standardizedEventType,
      id: event.id,
      event: standardizedEventType,
      data: {
        id: resourceId,
        event: standardizedEventType,
        payload: eventData,
        created: new Date(event.create_time).getTime() / 1e3,
        provider: "paypal",
        originalEvent: event
      }
    };
  }
  return {
    createCheckoutSession,
    createSubscription,
    getSubscription,
    cancelSubscription,
    handleWebhook
  };
}

// src/usage/storage.ts
var InMemoryUsageStorageAdapter = class {
  constructor(options) {
    this.events = /* @__PURE__ */ new Map();
    this.policies = /* @__PURE__ */ new Map();
    // Map of composite key `${key}:${idempotencyKey}` to { eventId, ts }
    this.idempotencyIndex = /* @__PURE__ */ new Map();
    this.idempotencyTtlMs = options?.idempotencyTtlMs;
  }
  cleanupIdempotency(now) {
    if (!this.idempotencyTtlMs) return;
    const ttl = this.idempotencyTtlMs;
    for (const [k, v] of this.idempotencyIndex.entries()) {
      if (now - v.ts > ttl) {
        this.idempotencyIndex.delete(k);
      }
    }
  }
  async getEvents(key) {
    return this.events.get(key) || [];
  }
  async addEvent(key, event, idempotencyKey) {
    const now = Date.now();
    this.cleanupIdempotency(now);
    if (idempotencyKey) {
      const idemKey = `${key}:${idempotencyKey}`;
      const existing = this.idempotencyIndex.get(idemKey);
      if (existing) {
        return { inserted: false };
      }
      this.idempotencyIndex.set(idemKey, { eventId: event.id, ts: now });
    }
    const arr = this.events.get(key) || [];
    arr.push(event);
    this.events.set(key, arr);
    return { inserted: true };
  }
  async getPolicy(key) {
    return this.policies.get(key) || null;
  }
  async setPolicy(key, policy) {
    this.policies.set(key, policy);
  }
};

// src/providers/crypto.ts
function createCryptoProvider(options = {}) {
  const defaultWallets = {
    btc: "",
    eth: "",
    sol: "",
    usdc: ""
  };
  const config = {
    wallets: { ...defaultWallets, ...options.wallets ?? {} },
    exchangeRateProviders: { ...options.exchangeRateProviders ?? {} },
    verificationCallback: options.verificationCallback ?? (async () => false),
    debug: options.debug ?? false,
    usageIdempotencyTtlMs: options.usageIdempotencyTtlMs ?? 0
  };
  const eventEmitter = new EventEmitter();
  const subscriptions = /* @__PURE__ */ new Map();
  const payments = /* @__PURE__ */ new Map();
  const usageStorage = options.usageStorage ?? new InMemoryUsageStorageAdapter({ idempotencyTtlMs: options.usageIdempotencyTtlMs });
  function usageKey(customerId, metricKey) {
    return `${customerId}:${metricKey}`;
  }
  function inRange(tsIso, start, end) {
    const ts = new Date(tsIso).getTime();
    if (start && ts < new Date(start).getTime()) return false;
    if (end && ts > new Date(end).getTime()) return false;
    return true;
  }
  async function createCheckoutSession(options2) {
    try {
      _log("Creating crypto checkout session:", options2);
      if (!options2.customerEmail) {
        throw new Error("Customer email is required");
      }
      if (!options2.amount) {
        throw new Error("Amount is required");
      }
      if (!options2.coin) {
        throw new Error("Cryptocurrency is required");
      }
      const coin = options2.coin.toLowerCase();
      if (!["btc", "eth", "sol", "usdc"].includes(coin)) {
        throw new Error('Invalid cryptocurrency. Must be "btc", "eth", "sol", or "usdc".');
      }
      const walletAddress = config.wallets[coin];
      if (!walletAddress) {
        throw new Error(`No wallet address configured for ${coin}`);
      }
      let cryptoAmount;
      let exchangeRate;
      try {
        exchangeRate = await _getExchangeRate(coin, "USD");
        cryptoAmount = options2.amount / exchangeRate;
        _log(`Converted ${options2.amount} USD to ${cryptoAmount} ${coin} at rate ${exchangeRate}`);
      } catch (error) {
        _log("Error getting exchange rate:", error);
        throw new Error(`Could not get exchange rate for ${coin}: ${error.message}`);
      }
      const sessionId = `crypto_${Date.now()}_${crypto2.randomBytes(8).toString("hex")}`;
      const session = {
        id: sessionId,
        customerEmail: options2.customerEmail,
        coin,
        amount: options2.amount,
        cryptoAmount,
        exchangeRate,
        walletAddress,
        status: "pending",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
        // 24 hours
        metadata: options2.metadata || {},
        successUrl: options2.successUrl,
        cancelUrl: options2.cancelUrl,
        planId: options2.planId,
        productId: options2.productId
      };
      payments.set(sessionId, session);
      _log("Crypto checkout session created:", sessionId);
      return {
        id: session.id,
        url: _generatePaymentUrl(session),
        status: session.status,
        customerEmail: session.customerEmail,
        amount: session.amount,
        amountTotal: session.amount,
        currency: "USD",
        metadata: session.metadata,
        expiresAt: session.expiresAt,
        provider: "crypto",
        providerData: {
          coin: session.coin,
          cryptoAmount: session.cryptoAmount,
          exchangeRate: session.exchangeRate,
          walletAddress: session.walletAddress
        }
      };
    } catch (error) {
      _log("Error creating crypto checkout session:", error);
      throw error;
    }
  }
  async function createSubscription(options2) {
    try {
      _log("Creating crypto subscription:", options2);
      if (!options2.customerEmail) {
        throw new Error("Customer email is required");
      }
      if (!options2.planId) {
        throw new Error("Plan ID is required");
      }
      if (!options2.coin) {
        throw new Error("Cryptocurrency is required");
      }
      if (!options2.amount) {
        throw new Error("Amount is required");
      }
      const coin = options2.coin.toLowerCase();
      if (!["btc", "eth", "sol", "usdc"].includes(coin)) {
        throw new Error('Invalid cryptocurrency. Must be "btc", "eth", "sol", or "usdc".');
      }
      const walletAddress = config.wallets[coin];
      if (!walletAddress) {
        throw new Error(`No wallet address configured for ${coin}`);
      }
      let cryptoAmount;
      let exchangeRate;
      try {
        exchangeRate = await _getExchangeRate(coin, "USD");
        cryptoAmount = options2.amount / exchangeRate;
        _log(`Converted ${options2.amount} USD to ${cryptoAmount} ${coin} at rate ${exchangeRate}`);
      } catch (error) {
        _log("Error getting exchange rate:", error);
        throw new Error(`Could not get exchange rate for ${coin}: ${error.message}`);
      }
      const subscriptionId = `crypto_sub_${Date.now()}_${crypto2.randomBytes(8).toString("hex")}`;
      const now = /* @__PURE__ */ new Date();
      const expirationDate = new Date(now);
      if (options2.planId === "monthly") {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else if (options2.planId === "yearly") {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      } else {
        throw new Error('Invalid plan ID. Must be "monthly" or "yearly".');
      }
      const subscription = {
        id: subscriptionId,
        customerEmail: options2.customerEmail || "",
        planId: options2.planId,
        coin,
        amount: options2.amount,
        cryptoAmount,
        exchangeRate,
        walletAddress,
        status: "pending",
        createdAt: now.toISOString(),
        startDate: now.toISOString(),
        expirationDate: expirationDate.toISOString(),
        metadata: options2.metadata || {},
        paymentStatus: "pending",
        transactionId: null
      };
      subscriptions.set(subscriptionId, subscription);
      _log("Crypto subscription created:", subscriptionId);
      return {
        id: subscription.id,
        customerId: options2.customerId || subscription.customerEmail,
        customerEmail: subscription.customerEmail,
        status: subscription.status,
        currentPeriodStart: subscription.startDate,
        currentPeriodEnd: subscription.expirationDate,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: subscription.metadata,
        provider: "crypto",
        providerData: {
          coin: subscription.coin,
          cryptoAmount: subscription.cryptoAmount,
          exchangeRate: subscription.exchangeRate,
          walletAddress: subscription.walletAddress,
          paymentStatus: subscription.paymentStatus
        }
      };
    } catch (error) {
      _log("Error creating crypto subscription:", error);
      throw error;
    }
  }
  async function getSubscription(options2) {
    try {
      _log("Getting crypto subscription:", options2);
      if (!options2.subscriptionId && !options2.customerId && !options2.customerEmail) {
        throw new Error("Either subscription ID, customer ID, or customer email is required");
      }
      let subscription;
      if (options2.subscriptionId) {
        subscription = subscriptions.get(options2.subscriptionId);
        if (!subscription) {
          return null;
        }
      } else if (options2.customerEmail) {
        const customerSubscriptions = Array.from(subscriptions.values()).filter((sub) => sub.customerEmail === options2.customerEmail).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (customerSubscriptions.length === 0) {
          return null;
        }
        subscription = customerSubscriptions[0];
      } else if (options2.customerId) {
        const customerSubscriptions = Array.from(subscriptions.values()).filter((sub) => sub.customerEmail === options2.customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (customerSubscriptions.length === 0) {
          return null;
        }
        subscription = customerSubscriptions[0];
      }
      if (!subscription) {
        return null;
      }
      _log("Crypto subscription retrieved:", subscription.id);
      if (subscription.status === "pending" && config.verificationCallback) {
        try {
          const verified = await config.verificationCallback(subscription);
          if (verified) {
            subscription.status = "active";
            subscription.paymentStatus = "paid";
            _log("Crypto subscription verified and activated:", subscription.id);
          }
        } catch (error) {
          _log("Error verifying subscription:", error);
        }
      }
      return {
        id: subscription.id,
        customerId: subscription.customerEmail,
        customerEmail: subscription.customerEmail,
        status: subscription.status,
        currentPeriodStart: subscription.startDate,
        currentPeriodEnd: subscription.expirationDate,
        cancelAtPeriodEnd: false,
        canceledAt: subscription.canceledAt || null,
        metadata: subscription.metadata,
        provider: "crypto",
        providerData: {
          coin: subscription.coin,
          cryptoAmount: subscription.cryptoAmount,
          exchangeRate: subscription.exchangeRate,
          walletAddress: subscription.walletAddress,
          paymentStatus: subscription.paymentStatus,
          transactionId: subscription.transactionId
        }
      };
    } catch (error) {
      _log("Error getting crypto subscription:", error);
      throw error;
    }
  }
  async function cancelSubscription(options2) {
    try {
      _log("Canceling crypto subscription:", options2);
      if (!options2.subscriptionId) {
        throw new Error("Subscription ID is required");
      }
      const subscription = subscriptions.get(options2.subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${options2.subscriptionId} not found`);
      }
      subscription.status = "canceled";
      subscription.canceledAt = (/* @__PURE__ */ new Date()).toISOString();
      _log("Crypto subscription canceled:", subscription.id);
      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: false,
        canceledAt: subscription.canceledAt,
        provider: "crypto",
        success: true
      };
    } catch (error) {
      _log("Error canceling crypto subscription:", error);
      throw error;
    }
  }
  async function handleWebhook(options2) {
    try {
      _log("Handling crypto webhook:", options2);
      if (!options2.body) {
        throw new Error("Webhook body is required");
      }
      const body = typeof options2.body === "string" ? JSON.parse(options2.body) : options2.body;
      if (!body.address || !body.txid || !body.coin) {
        throw new Error("Invalid webhook data");
      }
      let subscription;
      let payment;
      for (const [, sub] of subscriptions.entries()) {
        if (sub.walletAddress === body.address && sub.coin === body.coin) {
          subscription = sub;
          break;
        }
      }
      for (const [, pay] of payments.entries()) {
        if (pay.walletAddress === body.address && pay.coin === body.coin) {
          payment = pay;
          break;
        }
      }
      if (!subscription && !payment) {
        throw new Error("No matching subscription or payment found");
      }
      let result;
      if (subscription) {
        subscription.status = "active";
        subscription.paymentStatus = "paid";
        subscription.transactionId = body.txid;
        _log("Crypto subscription payment verified:", subscription.id);
        eventEmitter.emit("subscription.paid", subscription);
        result = {
          event: "subscription.paid",
          subscriptionId: subscription.id,
          customerEmail: subscription.customerEmail,
          transactionId: body.txid,
          amount: subscription.amount,
          cryptoAmount: subscription.cryptoAmount,
          coin: subscription.coin,
          status: subscription.status
        };
      }
      if (payment) {
        payment.status = "completed";
        payment.transactionId = body.txid;
        _log("Crypto payment verified:", payment.id);
        eventEmitter.emit("payment.completed", payment);
        result = {
          event: "payment.completed",
          paymentId: payment.id,
          customerEmail: payment.customerEmail,
          transactionId: body.txid,
          amount: payment.amount,
          cryptoAmount: payment.cryptoAmount,
          coin: payment.coin,
          status: payment.status
        };
      }
      if (result) {
        result.provider = "crypto";
      }
      return result;
    } catch (error) {
      _log("Error handling crypto webhook:", error);
      throw error;
    }
  }
  async function verifyPayment(options2) {
    _log("Verifying crypto payment:", options2);
    if (!options2.subscriptionId && !options2.paymentId) {
      throw new Error("Either subscription ID or payment ID is required");
    }
    if (!options2.transactionId) {
      throw new Error("Transaction ID is required");
    }
    if (options2.subscriptionId) {
      const subscription = subscriptions.get(options2.subscriptionId);
      if (!subscription) {
        throw new Error("Subscription not found");
      }
      let verified = true;
      if (config.verificationCallback) {
        try {
          verified = await Promise.resolve(config.verificationCallback(subscription));
        } catch (e) {
          _log("Verification callback error:", e);
          verified = false;
        }
      }
      if (!verified) return false;
      subscription.status = "active";
      subscription.paymentStatus = "paid";
      subscription.transactionId = options2.transactionId;
      eventEmitter.emit("subscription.paid", subscription);
      return true;
    }
    if (options2.paymentId) {
      const payment = payments.get(options2.paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }
      if (config.verificationCallback) {
        try {
          await Promise.resolve(config.verificationCallback({}));
        } catch (e) {
          _log("Verification callback error:", e);
        }
      }
      payment.status = "completed";
      payment.transactionId = options2.transactionId;
      eventEmitter.emit("payment.completed", payment);
      return true;
    }
    return false;
  }
  async function recordUsage(options2) {
    if (!options2.customerId) throw new Error("customerId is required");
    if (!options2.metricKey) throw new Error("metricKey is required");
    if (typeof options2.quantity !== "number") throw new Error("quantity is required");
    const key = usageKey(options2.customerId, options2.metricKey);
    const event = {
      id: `crypto_usage_${Date.now()}_${crypto2.randomBytes(3).toString("hex")}`,
      customerId: options2.customerId,
      metricKey: options2.metricKey,
      quantity: options2.quantity,
      timestamp: options2.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      metadata: options2.metadata || {}
    };
    const { inserted } = await usageStorage.addEvent(key, event, options2.idempotencyKey);
    _log("Crypto usage recorded:", { event, inserted, idempotencyKey: options2.idempotencyKey });
    return { id: event.id, success: true, provider: "crypto", providerData: { duplicate: !inserted } };
  }
  async function getUsage(options2) {
    const key = usageKey(options2.customerId, options2.metricKey);
    const arr = await usageStorage.getEvents(key);
    return arr.filter((e) => inRange(e.timestamp, options2.start, options2.end));
  }
  async function getUsageAggregate(options2) {
    const events = await getUsage(options2);
    const aggregation = options2.aggregation || "sum";
    let total = 0;
    if (aggregation === "sum") {
      total = events.reduce((acc, e) => acc + e.quantity, 0);
    } else if (aggregation === "count") {
      total = events.length;
    } else if (aggregation === "max") {
      total = events.reduce((acc, e) => Math.max(acc, e.quantity), 0);
    } else {
      total = events.length;
    }
    return { total };
  }
  async function setUsagePolicy(options2) {
    const id = `${options2.customerId}:${options2.metricKey}`;
    const policy = { id, ...options2 };
    await usageStorage.setPolicy(id, policy);
    return policy;
  }
  async function checkUsageLimit(options2) {
    const id = `${options2.customerId}:${options2.metricKey}`;
    const policy = await usageStorage.getPolicy(id);
    if (!policy) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, usage: 0, policy: null };
    }
    const now = /* @__PURE__ */ new Date();
    let start;
    if (policy.window === "day") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (policy.window === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();
    }
    const usage = (await getUsageAggregate({ customerId: options2.customerId, metricKey: options2.metricKey, start, aggregation: "sum" })).total;
    const remaining = Math.max(0, policy.limit - usage);
    return { allowed: remaining > 0, remaining, usage, policy };
  }
  async function _getExchangeRate(coin, fiat) {
    try {
      const provider = config.exchangeRateProviders[coin];
      if (!provider) {
        throw new Error(`No exchange rate provider configured for ${coin}`);
      }
      return await provider(coin, fiat);
    } catch (error) {
      _log("Error getting exchange rate:", error);
      throw error;
    }
  }
  function _generatePaymentUrl(session) {
    return `crypto://${session.coin}/pay?address=${session.walletAddress}&amount=${session.cryptoAmount}&session=${session.id}`;
  }
  function _log(...args) {
    if (config.debug) {
      console.log("[CryptoProvider]", ...args);
    }
  }
  return {
    createCheckoutSession,
    createSubscription,
    getSubscription,
    cancelSubscription,
    handleWebhook,
    verifyPayment,
    // Provider-level event subscription for tests and integrations
    on(event, listener) {
      eventEmitter.on(event, listener);
    },
    off(event, listener) {
      eventEmitter.off(event, listener);
    },
    // Usage metering
    recordUsage,
    getUsage,
    getUsageAggregate,
    setUsagePolicy,
    checkUsageLimit
  };
}
function createMockProvider(options = {}) {
  const config = {
    simulateErrors: false,
    errorRate: 0.1,
    delay: 500,
    debug: false,
    ...options
  };
  const subscriptions = /* @__PURE__ */ new Map();
  const payments = /* @__PURE__ */ new Map();
  const customers = /* @__PURE__ */ new Map();
  const products = /* @__PURE__ */ new Map();
  const prices = /* @__PURE__ */ new Map();
  const usageStorage = config.usageStorage ?? new InMemoryUsageStorageAdapter({ idempotencyTtlMs: config.usageIdempotencyTtlMs });
  function usageKey(customerId, metricKey) {
    return `${customerId}:${metricKey}`;
  }
  function inRange(tsIso, start, end) {
    const ts = new Date(tsIso).getTime();
    if (start && ts < new Date(start).getTime()) return false;
    if (end && ts > new Date(end).getTime()) return false;
    return true;
  }
  async function createCheckoutSession(options2 = {}) {
    try {
      _log("Creating mock checkout session:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error creating checkout session");
      }
      const sessionId = `mock_session_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
      let customerId = options2.customerId;
      if (!customerId && options2.customerEmail) {
        for (const [id, customer] of customers.entries()) {
          if (customer.email === options2.customerEmail) {
            customerId = id;
            break;
          }
        }
        if (!customerId) {
          customerId = `mock_cus_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
          customers.set(customerId, {
            id: customerId,
            email: options2.customerEmail,
            name: void 0,
            metadata: {}
          });
        }
      }
      const session = {
        id: sessionId,
        customerId,
        customerEmail: options2.customerEmail,
        mode: options2.mode || "payment",
        amount: options2.amount || 1e3,
        currency: (options2.currency || "usd").toLowerCase(),
        priceId: options2.priceId,
        status: "pending",
        paymentStatus: "unpaid",
        successUrl: options2.successUrl,
        cancelUrl: options2.cancelUrl,
        metadata: options2.metadata || {},
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1e3).toISOString()
        // 30 minutes
      };
      payments.set(sessionId, session);
      _log("Mock checkout session created:", sessionId);
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
        provider: "mock",
        providerData: {
          sessionId: session.id
        }
      };
    } catch (error) {
      _log("Error creating mock checkout session:", error);
      throw error;
    }
  }
  async function createSubscription(options2) {
    try {
      _log("Creating mock subscription:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error creating subscription");
      }
      if (!options2.customerId) {
        throw new Error("Customer ID is required");
      }
      if (!customers.has(options2.customerId)) {
        throw new Error(`Customer ${options2.customerId} not found`);
      }
      const subscriptionId = `mock_sub_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
      let interval = "month";
      let intervalCount = 1;
      if (options2.priceId && prices.has(options2.priceId)) {
        const price = prices.get(options2.priceId);
        if (price.recurring) {
          interval = price.recurring.interval;
          intervalCount = price.recurring.intervalCount;
        }
      }
      const now = /* @__PURE__ */ new Date();
      const periodEnd = new Date(now);
      if (interval === "day") {
        periodEnd.setDate(periodEnd.getDate() + intervalCount);
      } else if (interval === "week") {
        periodEnd.setDate(periodEnd.getDate() + 7 * intervalCount);
      } else if (interval === "month") {
        periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
      } else if (interval === "year") {
        periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
      }
      const subscription = {
        id: subscriptionId,
        customerId: options2.customerId,
        priceId: options2.priceId,
        status: "active",
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: options2.metadata || {},
        createdAt: now.toISOString(),
        items: [
          {
            id: `mock_si_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`,
            priceId: options2.priceId,
            quantity: 1
          }
        ]
      };
      subscriptions.set(subscriptionId, subscription);
      _log("Mock subscription created:", subscriptionId);
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
        provider: "mock",
        providerData: {
          subscriptionId: subscription.id
        }
      };
    } catch (error) {
      _log("Error creating mock subscription:", error);
      throw error;
    }
  }
  async function getSubscription(options2) {
    try {
      _log("Getting mock subscription:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error getting subscription");
      }
      if (!options2.subscriptionId && !options2.customerId) {
        throw new Error("Either subscription ID or customer ID is required");
      }
      let subscription;
      if (options2.subscriptionId) {
        subscription = subscriptions.get(options2.subscriptionId);
        if (!subscription) {
          return null;
        }
      } else {
        const customerSubscriptions = Array.from(subscriptions.values()).filter((sub) => sub.customerId === options2.customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (customerSubscriptions.length === 0) {
          return null;
        }
        subscription = customerSubscriptions[0];
      }
      if (!subscription) {
        return null;
      }
      _log("Mock subscription retrieved:", subscription.id);
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
        provider: "mock",
        providerData: {
          subscriptionId: subscription.id
        }
      };
    } catch (error) {
      _log("Error getting mock subscription:", error);
      throw error;
    }
  }
  async function cancelSubscription(options2) {
    try {
      _log("Canceling mock subscription:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error canceling subscription");
      }
      if (!options2.subscriptionId) {
        throw new Error("Subscription ID is required");
      }
      const subscription = subscriptions.get(options2.subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${options2.subscriptionId} not found`);
      }
      if (options2.atPeriodEnd) {
        subscription.cancelAtPeriodEnd = true;
      } else {
        subscription.status = "canceled";
        subscription.canceledAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      _log("Mock subscription canceled:", subscription.id);
      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        provider: "mock",
        success: true
      };
    } catch (error) {
      _log("Error canceling mock subscription:", error);
      throw error;
    }
  }
  async function handleWebhook(options2) {
    try {
      _log("Handling mock webhook:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error handling webhook");
      }
      const body = typeof options2.body === "string" ? JSON.parse(options2.body) : options2.body;
      if (!body.type || !body.data) {
        throw new Error("Invalid webhook data");
      }
      let result;
      switch (body.type) {
        case "checkout.session.completed": {
          const sessionId = body.data.id;
          const session = payments.get(sessionId);
          if (!session) {
            throw new Error(`Session ${sessionId} not found`);
          }
          session.status = "completed";
          session.paymentStatus = "paid";
          if (session.mode === "subscription" && session.priceId) {
            const subscriptionId = `mock_sub_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
            let interval = "month";
            let intervalCount = 1;
            if (prices.has(session.priceId)) {
              const price = prices.get(session.priceId);
              if (price.recurring) {
                interval = price.recurring.interval;
                intervalCount = price.recurring.intervalCount;
              }
            }
            const now = /* @__PURE__ */ new Date();
            const periodEnd = new Date(now);
            if (interval === "day") {
              periodEnd.setDate(periodEnd.getDate() + intervalCount);
            } else if (interval === "week") {
              periodEnd.setDate(periodEnd.getDate() + 7 * intervalCount);
            } else if (interval === "month") {
              periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
            } else if (interval === "year") {
              periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
            }
            const subscription = {
              id: subscriptionId,
              customerId: session.customerId,
              status: "active",
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: periodEnd.toISOString(),
              cancelAtPeriodEnd: false,
              canceledAt: null,
              metadata: session.metadata,
              createdAt: now.toISOString(),
              items: [
                {
                  id: `mock_si_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`,
                  priceId: session.priceId,
                  quantity: 1
                }
              ]
            };
            if (session.priceId) {
              subscription.priceId = session.priceId;
            }
            subscriptions.set(subscriptionId, subscription);
            session.subscriptionId = subscriptionId;
            _log("Mock subscription created from checkout:", subscriptionId);
          }
          result = {
            event: "checkout.completed",
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
        case "invoice.paid": {
          const subscriptionId = body.data.subscription;
          const subscription = subscriptions.get(subscriptionId);
          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }
          const currentPeriodStart = new Date(subscription.currentPeriodEnd);
          const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
          let interval = "month";
          let intervalCount = 1;
          if (subscription.priceId && prices.has(subscription.priceId)) {
            const price = prices.get(subscription.priceId);
            if (price.recurring) {
              interval = price.recurring.interval;
              intervalCount = price.recurring.intervalCount;
            }
          }
          if (interval === "day") {
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + intervalCount);
          } else if (interval === "week") {
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 7 * intervalCount);
          } else if (interval === "month") {
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
          } else if (interval === "year") {
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
          }
          subscription.currentPeriodStart = currentPeriodStart.toISOString();
          subscription.currentPeriodEnd = currentPeriodEnd.toISOString();
          result = {
            event: "invoice.paid",
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            invoiceId: `mock_inv_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`,
            amount: body.data.amount_paid || 1e3,
            currency: body.data.currency || "usd",
            status: "paid"
          };
          break;
        }
        case "customer.subscription.updated": {
          const subscriptionId = body.data.id;
          const subscription = subscriptions.get(subscriptionId);
          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }
          if (body.data.status) {
            subscription.status = body.data.status;
          }
          if (body.data.cancel_at_period_end !== void 0) {
            subscription.cancelAtPeriodEnd = body.data.cancel_at_period_end;
          }
          result = {
            event: "subscription.updated",
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd
          };
          break;
        }
        case "customer.subscription.deleted": {
          const subscriptionId = body.data.id;
          const subscription = subscriptions.get(subscriptionId);
          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }
          subscription.status = "canceled";
          subscription.canceledAt = (/* @__PURE__ */ new Date()).toISOString();
          result = {
            event: "subscription.deleted",
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
      _log("Mock webhook processed:", result.event);
      result.provider = "mock";
      return result;
    } catch (error) {
      _log("Error handling mock webhook:", error);
      throw error;
    }
  }
  async function createCustomer(options2) {
    try {
      _log("Creating mock customer:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error creating customer");
      }
      if (!options2.email) {
        throw new Error("Customer email is required");
      }
      for (const [id, customer2] of customers.entries()) {
        if (customer2.email === options2.email) {
          _log("Customer already exists:", id);
          return {
            id: customer2.id,
            email: customer2.email,
            name: customer2.name,
            metadata: customer2.metadata,
            provider: "mock",
            providerData: {
              customerId: customer2.id
            }
          };
        }
      }
      const customerId = `mock_cus_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
      const customer = {
        id: customerId,
        email: options2.email,
        name: options2.name,
        metadata: options2.metadata || {},
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      customers.set(customerId, customer);
      _log("Mock customer created:", customerId);
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: "mock",
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log("Error creating mock customer:", error);
      throw error;
    }
  }
  async function getCustomer(options2) {
    try {
      _log("Getting mock customer:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error getting customer");
      }
      if (!options2.customerId && !options2.email) {
        throw new Error("Either customer ID or email is required");
      }
      let customer;
      if (options2.customerId) {
        customer = customers.get(options2.customerId);
      } else {
        for (const cust of customers.values()) {
          if (cust.email === options2.email) {
            customer = cust;
            break;
          }
        }
      }
      if (!customer) {
        return null;
      }
      _log("Mock customer retrieved:", customer.id);
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        provider: "mock",
        providerData: {
          customerId: customer.id
        }
      };
    } catch (error) {
      _log("Error getting mock customer:", error);
      throw error;
    }
  }
  async function createProduct(options2) {
    try {
      _log("Creating mock product:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error creating product");
      }
      if (!options2.name) {
        throw new Error("Product name is required");
      }
      const productId = `mock_prod_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
      const product = {
        id: productId,
        name: options2.name,
        description: options2.description,
        metadata: options2.metadata || {},
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      products.set(productId, product);
      _log("Mock product created:", productId);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        provider: "mock",
        providerData: {
          productId: product.id
        }
      };
    } catch (error) {
      _log("Error creating mock product:", error);
      throw error;
    }
  }
  async function createPrice(options2) {
    try {
      _log("Creating mock price:", options2);
      await _delay(config.delay);
      if (_shouldSimulateError()) {
        throw new Error("Simulated error creating price");
      }
      if (!options2.productId) {
        throw new Error("Product ID is required");
      }
      if (!options2.unitAmount) {
        throw new Error("Unit amount is required");
      }
      if (!products.has(options2.productId)) {
        throw new Error(`Product ${options2.productId} not found`);
      }
      const priceId = `mock_price_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
      const price = {
        id: priceId,
        productId: options2.productId,
        currency: (options2.currency || "usd").toLowerCase(),
        unitAmount: options2.unitAmount,
        metadata: options2.metadata || {},
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (options2.interval) {
        price.recurring = {
          interval: options2.interval,
          intervalCount: options2.intervalCount || 1
        };
      }
      prices.set(priceId, price);
      const product = products.get(options2.productId);
      if (!product.default_price) {
        product.default_price = priceId;
      }
      _log("Mock price created:", priceId);
      return {
        id: price.id,
        productId: price.productId,
        currency: price.currency,
        unitAmount: price.unitAmount,
        recurring: price.recurring,
        metadata: price.metadata,
        provider: "mock",
        providerData: {
          priceId: price.id
        }
      };
    } catch (error) {
      _log("Error creating mock price:", error);
      throw error;
    }
  }
  async function recordUsage(options2) {
    if (!options2.customerId) throw new Error("customerId is required");
    if (!options2.metricKey) throw new Error("metricKey is required");
    if (typeof options2.quantity !== "number") throw new Error("quantity is required");
    const key = usageKey(options2.customerId, options2.metricKey);
    const event = {
      id: `mock_usage_${Date.now()}_${crypto2.randomBytes(3).toString("hex")}`,
      customerId: options2.customerId,
      metricKey: options2.metricKey,
      quantity: options2.quantity,
      timestamp: options2.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      metadata: options2.metadata || {}
    };
    const { inserted } = await usageStorage.addEvent(key, event, options2.idempotencyKey);
    _log("Mock usage recorded:", { event, inserted, idempotencyKey: options2.idempotencyKey });
    return { id: event.id, success: true, provider: "mock", providerData: { duplicate: !inserted } };
  }
  async function getUsage(options2) {
    const key = usageKey(options2.customerId, options2.metricKey);
    const arr = await usageStorage.getEvents(key);
    return arr.filter((e) => inRange(e.timestamp, options2.start, options2.end));
  }
  async function getUsageAggregate(options2) {
    const events = await getUsage(options2);
    const aggregation = options2.aggregation || "sum";
    let total = 0;
    if (aggregation === "sum") {
      total = events.reduce((acc, e) => acc + e.quantity, 0);
    } else if (aggregation === "count") {
      total = events.length;
    } else if (aggregation === "max") {
      total = events.reduce((acc, e) => Math.max(acc, e.quantity), 0);
    } else {
      total = events.length;
    }
    return { total };
  }
  async function setUsagePolicy(options2) {
    const id = `${options2.customerId}:${options2.metricKey}`;
    const policy = { id, ...options2 };
    await usageStorage.setPolicy(id, policy);
    return policy;
  }
  async function checkUsageLimit(options2) {
    const id = `${options2.customerId}:${options2.metricKey}`;
    const policy = await usageStorage.getPolicy(id);
    if (!policy) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, usage: 0, policy: null };
    }
    const now = /* @__PURE__ */ new Date();
    let start;
    if (policy.window === "day") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (policy.window === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();
    }
    const usage = (await getUsageAggregate({ customerId: options2.customerId, metricKey: options2.metricKey, start, aggregation: "sum" })).total;
    const remaining = Math.max(0, policy.limit - usage);
    return { allowed: remaining > 0, remaining, usage, policy };
  }
  function _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function _shouldSimulateError() {
    return config.simulateErrors && Math.random() < config.errorRate;
  }
  function _log(...args) {
    if (config.debug) {
      console.log("[MockProvider]", ...args);
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

// src/index.ts
var PaymentGateway = class extends EventEmitter {
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
  constructor(options = {}) {
    super();
    this.options = {
      providers: {},
      defaultProvider: null,
      webhookSecret: null,
      products: {},
      prices: {},
      debug: false,
      ...options
    };
    this.providers = {};
    if (this.options.providers) {
      for (const [name, provider] of Object.entries(this.options.providers)) {
        this.registerProvider(name, provider);
      }
    }
    this.defaultProvider = this.options.defaultProvider ?? null;
    this.products = this.options.products || {};
    this.prices = this.options.prices || {};
    this._log("PaymentGateway initialized");
  }
  /**
   * Register a payment provider
   * @param {string} name - Provider name
   * @param {Object} provider - Provider instance
   * @returns {PaymentGateway} - This instance for chaining
   */
  registerProvider(name, provider) {
    if (!name || typeof name !== "string") {
      throw new Error("Provider name must be a string");
    }
    if (!provider || typeof provider !== "object") {
      throw new Error("Provider must be an object");
    }
    const requiredMethods = [
      "createCheckoutSession",
      "createSubscription",
      "getSubscription",
      "cancelSubscription",
      "handleWebhook"
    ];
    for (const method of requiredMethods) {
      if (typeof provider[method] !== "function") {
        throw new Error(`Provider ${name} must implement ${method} method`);
      }
    }
    this.providers[name] = provider;
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
  getProvider(name) {
    const providerName = name || this.defaultProvider;
    if (!providerName) {
      throw new Error("No provider specified and no default provider set");
    }
    const provider = providerName ? this.providers[providerName] : void 0;
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    return provider;
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
  async createCheckoutSession(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (!options.priceId && (options.productId || options.planId)) {
        options.priceId = this._resolvePriceId(options);
      }
      const session = await provider.createCheckoutSession(options);
      this.emit("checkout.created", {
        provider: options.provider || this.defaultProvider,
        session
      });
      return session;
    } catch (error) {
      this._log("Error creating checkout session:", error);
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
  async createSubscription(options) {
    const provider = this.getProvider(options.provider);
    try {
      if (!options.priceId && options.planId) {
        options.priceId = this._resolvePriceId(options);
      }
      const subscription = await provider.createSubscription(options);
      this.emit("subscription.created", {
        provider: options.provider || this.defaultProvider,
        subscription
      });
      return subscription;
    } catch (error) {
      this._log("Error creating subscription:", error);
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
  async getSubscription(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      return await provider.getSubscription(options);
    } catch (error) {
      this._log("Error getting subscription:", error);
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
  async cancelSubscription(options) {
    const provider = this.getProvider(options.provider);
    try {
      const result = await provider.cancelSubscription(options);
      this.emit("subscription.canceled", {
        provider: options.provider || this.defaultProvider,
        subscriptionId: options.subscriptionId,
        result
      });
      return result;
    } catch (error) {
      this._log("Error canceling subscription:", error);
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
  async handleWebhook(options) {
    const provider = this.getProvider(options.provider);
    try {
      const result = await provider.handleWebhook(options);
      const eventType = result.type || result.event;
      if (eventType) {
        this.emit(`webhook.${eventType}`, {
          provider: options.provider || this.defaultProvider,
          result
        });
      }
      return result;
    } catch (error) {
      this._log("Error handling webhook:", error);
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
  async createCustomer(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.createCustomer !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createCustomer`);
      }
      const customer = await provider.createCustomer(options);
      this.emit("customer.created", {
        provider: options.provider || this.defaultProvider,
        customer
      });
      return customer;
    } catch (error) {
      this._log("Error creating customer:", error);
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
  async getCustomer(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.getCustomer !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getCustomer`);
      }
      return await provider.getCustomer(options);
    } catch (error) {
      this._log("Error getting customer:", error);
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
  async updateCustomer(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.updateCustomer !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support updateCustomer`);
      }
      const customer = await provider.updateCustomer(options);
      this.emit("customer.updated", {
        provider: options.provider || this.defaultProvider,
        customer
      });
      return customer;
    } catch (error) {
      this._log("Error updating customer:", error);
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
  async createPaymentMethod(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.createPaymentMethod !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createPaymentMethod`);
      }
      const paymentMethod = await provider.createPaymentMethod(options);
      this.emit("paymentMethod.created", {
        provider: options.provider || this.defaultProvider,
        paymentMethod
      });
      return paymentMethod;
    } catch (error) {
      this._log("Error creating payment method:", error);
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
  async getPaymentMethods(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.getPaymentMethods !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getPaymentMethods`);
      }
      return await provider.getPaymentMethods(options);
    } catch (error) {
      this._log("Error getting payment methods:", error);
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
  async createProduct(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.createProduct !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createProduct`);
      }
      const product = await provider.createProduct(options);
      if (product.id) {
        this.products[product.id] = product;
      }
      this.emit("product.created", {
        provider: options.provider || this.defaultProvider,
        product
      });
      return product;
    } catch (error) {
      this._log("Error creating product:", error);
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
  async createPrice(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.createPrice !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createPrice`);
      }
      const price = await provider.createPrice(options);
      if (price.id) {
        this.prices[price.id] = price;
        const productId = options.productId;
        if (productId) {
          if (!this.prices[productId] || typeof this.prices[productId] !== "object" || "id" in this.prices[productId]) {
            this.prices[productId] = {};
          }
          const interval = options.interval;
          const currency = options.currency;
          const key = `${interval || "one-time"}_${currency || "usd"}`;
          this.prices[productId][key] = price;
        }
      }
      this.emit("price.created", {
        provider: options.provider || this.defaultProvider,
        price
      });
      return price;
    } catch (error) {
      this._log("Error creating price:", error);
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
  async createPayment(options = {}) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.createPayment !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support createPayment`);
      }
      const payment = await provider.createPayment(options);
      this.emit("payment.created", {
        provider: options.provider || this.defaultProvider,
        payment
      });
      return payment;
    } catch (error) {
      this._log("Error creating payment:", error);
      throw error;
    }
  }
  /**
   * Record usage for a customer and metric
   */
  async recordUsage(options) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.recordUsage !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support recordUsage`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.recordUsage(rest);
    } catch (error) {
      this._log("Error recording usage:", error);
      throw error;
    }
  }
  /**
   * Get usage events
   */
  async getUsage(options) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.getUsage !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getUsage`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.getUsage(rest);
    } catch (error) {
      this._log("Error getting usage:", error);
      throw error;
    }
  }
  /**
   * Aggregate usage totals
   */
  async getUsageAggregate(options) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.getUsageAggregate !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support getUsageAggregate`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.getUsageAggregate(rest);
    } catch (error) {
      this._log("Error aggregating usage:", error);
      throw error;
    }
  }
  /**
   * Set a usage policy
   */
  async setUsagePolicy(options) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.setUsagePolicy !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support setUsagePolicy`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.setUsagePolicy(rest);
    } catch (error) {
      this._log("Error setting usage policy:", error);
      throw error;
    }
  }
  /**
   * Check usage against limit
   */
  async checkUsageLimit(options) {
    const provider = this.getProvider(options.provider);
    try {
      if (typeof provider.checkUsageLimit !== "function") {
        throw new Error(`Provider ${options.provider || this.defaultProvider} does not support checkUsageLimit`);
      }
      const { provider: _provider, ...rest } = options;
      return await provider.checkUsageLimit(rest);
    } catch (error) {
      this._log("Error checking usage limit:", error);
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
  _resolvePriceId(options) {
    const { productId, planId, currency = "usd" } = options;
    if (planId && this.prices[planId]) {
      return planId;
    }
    if (productId && planId && this.prices[productId]) {
      const key = `${planId}_${currency}`;
      const productPrices = this.prices[productId];
      if (productPrices && productPrices[key]) {
        return productPrices[key].id;
      }
    }
    if (productId && this.products[productId] && this.products[productId].default_price) {
      return this.products[productId].default_price;
    }
    throw new Error(`Could not resolve price ID for product ${productId} and plan ${planId}`);
  }
  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   * @private
   */
  _log(...args) {
    if (this.options.debug) {
      console.log("[PaymentGateway]", ...args);
    }
  }
};
function createPaymentGateway(options = {}) {
  return new PaymentGateway(options);
}
var src_default = createPaymentGateway;

export { PaymentGateway, createCryptoProvider, createMockProvider, createPayPalProvider, createPaymentGateway, createStripeProvider, src_default as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map