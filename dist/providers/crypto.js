import EventEmitter from 'eventemitter3';
import crypto from 'crypto';

// src/providers/crypto.ts

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
      const sessionId = `crypto_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
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
      const subscriptionId = `crypto_sub_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
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
      id: `crypto_usage_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
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
var crypto_default = createCryptoProvider;

export { createCryptoProvider, crypto_default as default };
//# sourceMappingURL=crypto.js.map
//# sourceMappingURL=crypto.js.map