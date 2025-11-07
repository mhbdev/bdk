import crypto from 'crypto';

// src/providers/mock.ts

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

// src/providers/mock.ts
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
      const sessionId = `mock_session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      let customerId = options2.customerId;
      if (!customerId && options2.customerEmail) {
        for (const [id, customer] of customers.entries()) {
          if (customer.email === options2.customerEmail) {
            customerId = id;
            break;
          }
        }
        if (!customerId) {
          customerId = `mock_cus_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
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
      const subscriptionId = `mock_sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
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
            id: `mock_si_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
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
            const subscriptionId = `mock_sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
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
                  id: `mock_si_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
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
            invoiceId: `mock_inv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
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
      const customerId = `mock_cus_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
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
      const productId = `mock_prod_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
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
      const priceId = `mock_price_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
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
      id: `mock_usage_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
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
var mock_default = createMockProvider;

export { createMockProvider, mock_default as default };
//# sourceMappingURL=mock.js.map
//# sourceMappingURL=mock.js.map