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
var paypal_default = createPayPalProvider;

export { createPayPalProvider, paypal_default as default };
//# sourceMappingURL=paypal.js.map
//# sourceMappingURL=paypal.js.map