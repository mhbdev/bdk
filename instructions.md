# 🧩 Prompt: “Universal Billing & Payment Abstraction Framework Generator”

You are an expert senior TypeScript architect and software engineer specializing in **billing systems, payment orchestration, metered usage, and SaaS monetization frameworks**.

---

## 🎯 GOAL

Design and implement a **universal, production-ready npm package** that provides a **complete billing and payment abstraction framework** for Node.js/TypeScript applications.

This framework should allow any developer to build and manage **any type of billing or subscription model** (recurring, usage-based, prepaid, hybrid, tiered, per-seat, etc.) on top of it, with built-in support for invoices, payments, entitlements, usage tracking, and provider extensibility.

The goal is to deliver a **developer-friendly, cleanly architected, fully extensible, and documented** abstraction layer that empowers teams to build world-class billing systems without being tied to a single provider.

---

## 🧱 ARCHITECTURAL OVERVIEW

### 🔹 1. Core Abstraction Layer
Define a **provider-neutral domain model** representing all key billing concepts:

- `Customer`, `Product`, `Price`, `Subscription`, `Invoice`, `Transaction`, `UsageRecord`, `Entitlement`, `Feature`, `Plan`, `TaxRule`, `Currency`, etc.
- Strongly typed interfaces for every operation:
  ```ts
  interface BillingProvider {
    createCustomer(data: Customer): Promise<string>;
    createSubscription(sub: Subscription): Promise<Subscription>;
    cancelSubscription(id: string): Promise<void>;
    recordUsage(record: UsageRecord): Promise<void>;
    generateInvoice(inv: Invoice): Promise<Invoice>;
    handleWebhook(event: any): Promise<BillingEvent>;
  }
  ```

### 🔹 2. Provider Integration Layer
Implement provider adapters that map your neutral interfaces to external SDKs:
- Stripe, PayPal, Braintree, Paddle, Coinbase Commerce, Adyen, etc.
- Each adapter should follow dependency injection patterns and be registered dynamically:
  ```ts
  billing.use('stripe', new StripeAdapter({ apiKey }));
  ```

### 🔹 3. Billing Strategy Layer
Implement modular **billing strategy classes** that support multiple models:
- Flat-rate / fixed-price billing
- Usage-based / metered billing
- Tiered pricing
- Seat-based pricing
- Prepaid / credit-based models
- Hybrid (base + usage)
Each strategy implements the `BillingStrategy` interface and can be composed per plan.

### 🔹 4. Usage & Entitlement Layer
Add a flexible usage tracker and entitlement resolver:
- Track metered metrics (API calls, storage, etc.)
- Compute charges at billing intervals
- Map subscriptions → entitlements → features
- Expose API: `billing.getEntitlements(userId)`

### 🔹 5. Invoice & Tax Engine
- Generate invoices (HTML/PDF) using `pdfkit` or similar
- Handle taxes, discounts, and currency conversions
- Integrate pluggable tax services (Stripe Tax, TaxJar, Avalara)
- Allow custom invoice templates and branding

### 🔹 6. Webhook & Event Layer
- Normalize incoming webhook events from providers
- Emit consistent internal billing events (`payment.succeeded`, `subscription.renewed`, etc.)
- Provide utilities for event validation and retries

### 🔹 7. Storage & Persistence Layer
Expose an abstract persistence interface:
```ts
interface BillingStorage {
  saveCustomer(c: Customer): Promise<void>;
  getSubscription(id: string): Promise<Subscription | null>;
  recordInvoice(inv: Invoice): Promise<void>;
}
```
Developers can plug in Postgres, MongoDB, or any custom storage driver.

### 🔹 8. Extensibility System
- Plugin-based provider registration system
- Custom billing strategies, tax adapters, and storage backends can be added without core changes
- Clear configuration schema via environment variables or JSON

---

## ⚙️ TECHNICAL REQUIREMENTS

- **Language:** TypeScript (ES2022)
- **Package:** npm (library format, no framework dependency)
- **Tests:** Jest or Vitest with mocks for provider SDKs
- **Docs:** Full TSDoc + Markdown docs
- **Style:** ESLint + Prettier
- **Folder Structure:**
  ```
  src/
    core/
      interfaces/
      models/
      strategies/
    providers/
      stripe/
      paypal/
      coinbase/
    services/
      usage/
      webhook/
      invoice/
      entitlement/
    storage/
    index.ts
  tests/
    unit/
    integration/
  examples/
  README.md
  package.json
  ```

---

## 💡 DESIGN PRINCIPLES

- ✅ **Provider Agnostic:** Works across all major payment providers.
- ✅ **Billing Model Agnostic:** Supports any pricing model (flat, usage, hybrid, prepaid).
- ✅ **Strongly Typed:** Full TypeScript typing everywhere.
- ✅ **Composable & Extensible:** Developers can plug in new modules easily.
- ✅ **Clean API:** Simple to use, e.g.:
  ```ts
  const billing = new BillingCore({ provider: 'stripe' });
  await billing.createSubscription(customer, plan);
  await billing.recordUsage(userId, 'api_calls', 1200);
  ```
- ✅ **Enterprise-Ready:** Supports multi-currency, taxes, invoicing, and entitlements.
- ✅ **Modular:** Core framework can be used independently of any provider.

---

## 🚀 DELIVERABLES

The AI must produce:

1. A **ready-to-publish npm package** project (`@mhbdev/billing-core`)
2. Fully implemented base architecture
3. Stripe provider implemented end-to-end
4. PayPal provider stubbed and documented
5. Example scripts (`examples/`) demonstrating:
   - Subscription lifecycle
   - Usage-based billing
   - Invoice creation and download
   - Webhook handling
   - Entitlement checks
6. `README.md` with setup, examples, and architectural overview
7. Jest/Vitest tests with coverage for core logic and mocked providers

---

## 🧠 DEVELOPMENT GUIDELINES

- Use composition over inheritance.
- Avoid hardcoding logic; rely on interfaces and dependency injection.
- Emit standardized events across all providers.
- Write clean, idiomatic, well-commented TypeScript.
- Ensure build, lint, and test all pass with no warnings.

---

## 🧭 OPTIONAL ADD-ONS

If the platform supports multi-phase generation, request these next:

1. **Generate a detailed developer guide** for extending the framework with custom providers and billing strategies.  
2. **Implement Tax and Currency Adapters** (Stripe Tax, TaxJar).  
3. **Add support for credit wallets and prepaid usage.**  
4. **Create CLI tool (`billing-cli`)** to manage billing configurations.  
5. **Generate sample SaaS app integration** (Express + Prisma).

---

## 💬 FINAL DELIVERABLE

A **universal, extensible, provider-neutral billing and payment abstraction library** that enables any developer to build, manage, and scale any billing, subscription, or invoicing system **with minimal effort and maximum flexibility**.

The package must be **clean, modular, typed, documented, tested, and developer-friendly** — ready to power real-world production-grade SaaS billing systems.
