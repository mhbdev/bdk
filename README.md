# @mhbdev/bdk

Unified payment gateway abstraction for multiple payment providers.

## Features

- **Multiple Providers**: Support for Stripe, PayPal, cryptocurrency, and custom payment providers
- **Unified API**: Consistent interface across different payment providers
- **Checkout Sessions**: Create checkout sessions for one-time payments or subscriptions
- **Subscription Management**: Create, retrieve, and cancel subscriptions
- **Webhook Handling**: Process webhook events from payment providers
- **Customer Management**: Create and manage customers
- **Product & Price Management**: Create and manage products and prices
- **Event System**: Subscribe to payment events
- **Extensible**: Easy to add new payment providers
- **Usage Tracking**: Record usage, aggregate windows, enforce policies

## Installation

```bash
npm install @mhbdev/bdk
```

## Basic Usage

```javascript
import { 
  createPaymentGateway, 
  createStripeProvider 
} from '@mhbdev/bdk';

// Create a Stripe provider
const stripeProvider = createStripeProvider({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
});

// Create a payment gateway with Stripe provider
const gateway = createPaymentGateway({
  providers: {
    stripe: stripeProvider
  },
  defaultProvider: 'stripe'
});

// Create a checkout session
const session = await gateway.createCheckoutSession({
  customerEmail: 'customer@example.com',
  priceId: 'price_1234567890',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  mode: 'subscription'
});

console.log('Checkout URL:', session.url);
```

## API Reference

### Creating a Payment Gateway

```javascript
import { 
  createPaymentGateway, 
  createStripeProvider,
  createPayPalProvider,
  createCryptoProvider,
  createMockProvider
} from '@mhbdev/bdk';

// Create providers
const stripeProvider = createStripeProvider({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
});

const cryptoProvider = createCryptoProvider({
  wallets: {
    btc: process.env.BTC_WALLET_ADDRESS,
    eth: process.env.ETH_WALLET_ADDRESS,
    sol: process.env.SOL_WALLET_ADDRESS,
    usdc: process.env.USDC_WALLET_ADDRESS
  },
  exchangeRateProviders: {
    btc: async () => 50000, // Example rate
    eth: async () => 3000,
    sol: async () => 100,
    usdc: async () => 1
  }
});

// Create a payment gateway with multiple providers
const gateway = createPaymentGateway({
  providers: {
    stripe: stripeProvider,
    crypto: cryptoProvider
  },
  defaultProvider: 'stripe',
  debug: true
});
```

### Checkout Sessions

#### Creating a Checkout Session

```javascript
// Create a checkout session with the default provider
const session = await gateway.createCheckoutSession({
  customerEmail: 'customer@example.com',
  priceId: 'price_1234567890',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  metadata: {
    orderId: '12345'
  },
  mode: 'subscription' // or 'payment' for one-time payments
});

// Create a checkout session with a specific provider
const cryptoSession = await gateway.createCheckoutSession({
  provider: 'crypto',
  customerEmail: 'customer@example.com',
  amount: 100, // $100 USD
  coin: 'btc',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
});

console.log('Checkout URL:', session.url);
```

### Subscriptions

#### Creating a Subscription

```javascript
// Create a subscription
const subscription = await gateway.createSubscription({
  customerId: 'cus_1234567890',
  priceId: 'price_1234567890',
  metadata: {
    plan: 'premium'
  }
});

console.log('Subscription created:', subscription.id);
```

#### Getting a Subscription

```javascript
// Get a subscription by ID
const subscription = await gateway.getSubscription({
  subscriptionId: 'sub_1234567890'
});

// Get a subscription for a customer
const customerSubscription = await gateway.getSubscription({
  customerId: 'cus_1234567890'
});

console.log('Subscription status:', subscription.status);
```

#### Canceling a Subscription

```javascript
// Cancel a subscription immediately
const result = await gateway.cancelSubscription({
  subscriptionId: 'sub_1234567890'
});

// Cancel a subscription at the end of the billing period
const result = await gateway.cancelSubscription({
  subscriptionId: 'sub_1234567890',
  atPeriodEnd: true
});

console.log('Subscription canceled:', result.success);
```

### Webhook Handling

```javascript
// Handle a webhook event
app.post('/webhook/stripe', async (req, res) => {
  try {
    const result = await gateway.handleWebhook({
      provider: 'stripe',
      body: req.body,
      headers: req.headers
    });
    
    console.log('Webhook processed:', result.event);
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook error');
  }
});

// Listen for webhook events
gateway.on('webhook.checkout.completed', (data) => {
  console.log('Checkout completed:', data);
  // Fulfill order, send confirmation email, etc.
});

gateway.on('webhook.subscription.created', (data) => {
  console.log('Subscription created:', data);
  // Update user permissions, etc.
});

gateway.on('webhook.subscription.deleted', (data) => {
  console.log('Subscription canceled:', data);
  // Update user permissions, etc.
});
```

// Provider-level events (for providers exposing on/off)
// Crypto provider emits subscription/payment events you can subscribe to directly
const crypto = gateway.getProvider('crypto');
crypto.on?.('subscription.paid', (payload) => {
  console.log('Crypto subscription paid:', payload);
});
crypto.on?.('payment.completed', (payload) => {
  console.log('Crypto payment completed:', payload);
});

// Webhook result shape
// result.handled: boolean
// result.type: standardized event type (e.g., 'checkout.completed')
// result.event: provider's event name when applicable (same as type)
// result.id: provider event id (if available)
// result.provider: provider name (e.g., 'stripe', 'paypal', 'crypto', 'mock')
// result.data: provider-specific payload wrapper

### Customer Management

```javascript
// Create a customer
const customer = await gateway.getProvider('stripe').createCustomer({
  email: 'customer@example.com',
  name: 'John Doe',
  metadata: {
    source: 'website'
  }
});

// Get a customer
const customer = await gateway.getProvider('stripe').getCustomer({
  customerId: 'cus_1234567890'
});

// Get a customer by email
const customer = await gateway.getProvider('stripe').getCustomer({
  email: 'customer@example.com'
});

// Update a customer
const customer = await gateway.getProvider('stripe').updateCustomer({
  customerId: 'cus_1234567890',
  name: 'Jane Doe',
  metadata: {
    updated: 'true'
  }
});
```

### Product & Price Management

```javascript
// Create a product
const product = await gateway.getProvider('stripe').createProduct({
  name: 'Premium Plan',
  description: 'Access to all premium features',
  metadata: {
    features: 'all'
  }
});

// Create a price
const price = await gateway.getProvider('stripe').createPrice({
  productId: product.id,
  unitAmount: 1000, // $10.00
  currency: 'usd',
  interval: 'month',
  intervalCount: 1,
  metadata: {
    plan: 'monthly'
  }
});
```

## Provider-Specific Features

### Stripe Provider

```javascript
import { createStripeProvider } from '@mhbdev/bdk';

const stripeProvider = createStripeProvider({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  debug: true
});

// Get Stripe publishable key
const publishableKey = stripeProvider.getPublishableKey();

// Create a payment method
const paymentMethod = await stripeProvider.createPaymentMethod({
  customerId: 'cus_1234567890',
  type: 'card',
  data: {
    number: '4242424242424242',
    exp_month: 12,
    exp_year: 2025,
    cvc: '123'
  }
});

// Get payment methods
const paymentMethods = await stripeProvider.getPaymentMethods({
  customerId: 'cus_1234567890',
  type: 'card'
});
```

### Crypto Provider

```javascript
import { createCryptoProvider } from '@mhbdev/bdk';

const cryptoProvider = createCryptoProvider({
  wallets: {
    btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    sol: '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8',
    usdc: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
  },
  exchangeRateProviders: {
    btc: async () => {
      const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
      const data = await response.json();
      return parseFloat(data.data.rates.USD);
    },
    eth: async () => {
      const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH');
      const data = await response.json();
      return parseFloat(data.data.rates.USD);
    },
    sol: async () => {
      const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=SOL');
      const data = await response.json();
      return parseFloat(data.data.rates.USD);
    },
    usdc: async () => 1 // USDC is pegged to USD
  },
  verificationCallback: async (payment) => {
    // Verify payment on blockchain
    // Return true if payment is verified
    return true;
  },
  debug: true
});

// Verify a payment
const verified = await cryptoProvider.verifyPayment({
  subscriptionId: 'crypto_sub_1234567890',
  transactionId: '0x1234567890abcdef'
});

// Subscribe to provider-level events
cryptoProvider.on?.('subscription.paid', (data) => {
  console.log('Subscription paid:', data);
});
cryptoProvider.on?.('payment.completed', (data) => {
  console.log('Payment completed:', data);
});
```

### Mock Provider

```javascript
import { createMockProvider } from '@mhbdev/bdk';

const mockProvider = createMockProvider({
  simulateErrors: false,
  errorRate: 0.1,
  delay: 500,
  debug: true
});

// Use for testing
const session = await mockProvider.createCheckoutSession({
  customerEmail: 'test@example.com',
  amount: 1000,
  currency: 'usd'
});
```

## Creating Custom Providers

You can create custom providers by implementing the provider interface:

```javascript
function createCustomProvider(options = {}) {
  // Implement required methods
  return {
    createCheckoutSession: async (options) => { /* ... */ },
    createSubscription: async (options) => { /* ... */ },
    getSubscription: async (options) => { /* ... */ },
    cancelSubscription: async (options) => { /* ... */ },
    handleWebhook: async (options) => { /* ... */ },
    // Optional hooks and helpers
    on: (event, listener) => { /* ... */ },
    off: (event, listener) => { /* ... */ },
    verifyPayment: async (opts) => { /* ... */ }
  };
}

// Register the custom provider
const gateway = createPaymentGateway({
  providers: {
    custom: createCustomProvider()
  },
  defaultProvider: 'custom'
});
```

## Usage Tracking & Policies

The gateway includes optional usage metering utilities you can use alongside subscriptions.

```javascript
// Record usage events
await gateway.getProvider('crypto').recordUsage?.({
  customerId: 'cus_123',
  metricKey: 'api_calls',
  quantity: 5,
  timestamp: new Date().toISOString(),
  // For providers like Stripe, you may need subscriptionItemId
  // subscriptionItemId: 'si_123'
  idempotencyKey: 'usage-123'
});

// Query usage events
const events = await gateway.getProvider('crypto').getUsage?.({
  customerId: 'cus_123',
  metricKey: 'api_calls',
  start: new Date(Date.now() - 86400000).toISOString(),
  end: new Date().toISOString()
});

// Aggregate usage over a window
const aggregate = await gateway.getProvider('crypto').getUsageAggregate?.({
  customerId: 'cus_123',
  metricKey: 'api_calls',
  window: 'month',
  aggregation: 'sum'
});

// Set a usage policy
const policy = await gateway.getProvider('crypto').setUsagePolicy?.({
  customerId: 'cus_123',
  metricKey: 'api_calls',
  limit: 10000,
  window: 'month',
  resetAnchor: '2025-01-01T00:00:00.000Z'
});

// Check usage limits
const limit = await gateway.getProvider('crypto').checkUsageLimit?.({
  customerId: 'cus_123',
  metricKey: 'api_calls'
});
console.log('Allowed?', limit.allowed, 'Remaining:', limit.remaining);
```

Notes:
- Crypto provider config supports `usageIdempotencyTtlMs` to control idempotency window.
- `UsageStorageAdapter` can be provided to customize storage; in-memory is default.

## Types and Shapes

Key types returned across providers:
- `CheckoutSession`: includes `id`, `url`, `status`, `customerEmail`, `amountTotal`, `amount`, `currency`, `expiresAt`, `provider`, and `providerData`.
- `Subscription`: includes `id`, `customerId`, optional `customerEmail`, `status`, period fields, `planId`, `startDate`, `endDate`, `items`, plus `provider` and `providerData`.
- `WebhookResult`: includes `handled`, optional `id`, `type`, `event`, `provider`, and `data`.

## Events Overview

Gateway emits events you can subscribe to with `gateway.on(event, listener)`:
- `checkout.created`, `checkout.completed`
- `subscription.created`, `subscription.updated`, `subscription.deleted`
- `webhook.<event>` (e.g., `webhook.checkout.completed`)

Provider-level events (when available) can be subscribed via `provider.on(event, listener)`.
- Crypto provider: `subscription.paid`, `payment.completed`

## Testing and Mocking

- Use the mock provider for local tests that simulate common flows.
- The mock provider supports configurable error rates and delays.
- Example tests are under `test/` and demonstrate checkout, subscription, webhooks, and usage metering.

## Installation & Build

- Install with `npm install @mhbdev/bdk`.
- Build artifacts and type definitions are generated via `npm run build`.
- Providers are published under `dist/providers/` with ESM and DTS outputs.

## Examples

See the [examples](./examples) directory for complete usage examples.

## License

MIT