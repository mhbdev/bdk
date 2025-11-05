# BDK Examples

This directory contains usage examples built on top of the BDK abstractions. To keep things simple, the first example integrates Stripe as a payment provider and demonstrates a registry, selection strategy, and a minimal payment service.

## Stripe Example

Location: `examples/stripe`

Prerequisites:
- Set `STRIPE_API_KEY` in your environment (use a test key like `sk_test_...`).

Run:
1. Build the SDK (from repo root): `pnpm build`
2. Change directory: `cd examples/stripe`
3. Install deps (links local SDK): `pnpm install`
4. Start: `pnpm dev` (or `npm run dev`)

The script will:
- Create a Stripe customer and payment method (test card)
- Register and select the Stripe provider
- Process a test payment via the BDK-style payment service
- Optionally perform a refund

Notes:
- This example uses Stripe test data and is safe to run against a test account.
- It illustrates how to implement `PaymentProvider`, a registry, and strategy, then wire them through a minimal `PaymentService`.