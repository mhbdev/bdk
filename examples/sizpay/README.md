SizPay Example (REST) using Drizzle ORM and @mhbdev/bdk

This example demonstrates integrating the SizPay payment gateway in REST mode with the BDK abstractions. It uses Drizzle ORM with SQLite for persistence and includes services for payments, invoices, subscriptions, usage, balance/ledger, dunning, reporting, audit, and tax.

Prerequisites
- Node.js 18+
- pnpm

Environment
- Create `examples/sizpay/.env` with:
  - `SIZPAY_MERCHANT_ID="..."`
  - `SIZPAY_TERMINAL_ID="..."`
  - `SIZPAY_USERNAME_B64="..."` (Base64; used as AES-256-CBC key)
  - `SIZPAY_PASSWORD_B64="..."` (Base64; used as AES-256-CBC IV)
  - `SIZPAY_SIGN_KEY="..."` (HMAC-SHA256 secret)
  - `RETURN_URL="http://localhost:3000/sizpay/callback"` (demo callback URL)
  - Optional: `REDIS_URL="redis://localhost:6379"` for dunning worker locking

Setup
- From repo root: `pnpm -w --filter @mhbdev/bdk build`
- From `examples/sizpay`: `pnpm install`
- Initialize DB: `pnpm db:migrate`
- Seed demo data: `pnpm seed`

Run Demo
- Create payment and get redirect URL: `pnpm run:payment`
- Simulate SizPay confirm callback: `pnpm run:confirm`
- Start dunning worker: `pnpm run:dunning-worker`

Notes
- Amounts are treated as Tomans (IRT). Adjust currency according to your business rules.
- Refunds via SizPay REST are not supported; the refund service returns a provider error.
- Webhooks for SizPay are not documented in REST; the webhook service is a stub.
## Local development with Docker

1. Copy `.env.example` to `.env` and fill in SizPay credentials:

```
cp .env.example .env
```

2. Start Postgres and Redis:

```
docker compose up -d
```

3. Run migrations:

```
pnpm db:migrate
```

4. Seed demo data:

```
pnpm seed
```

5. Run the payment demo:

```
pnpm run:payment
```

Optionally, simulate provider confirmation:

```
pnpm run:confirm -- <paymentId>
```