export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'BTC' | 'ETH' | 'USDT';

export interface Money {
  /** Amount in minor units (e.g., cents) */
  amount: number;
  currency: Currency;
}

export interface Customer {
  id: string;
  externalId?: string;
  email: string;
  name?: string;
  defaultCurrency?: Currency;
  metadata?: Record<string, any>;
}

export interface Feature {
  key: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  features?: Feature[];
  metadata?: Record<string, any>;
}

export type BillingInterval = 'day' | 'week' | 'month' | 'year';

export interface PriceTier {
  upTo: number; // inclusive quantity threshold
  unitAmount: number; // minor units per unit
}

export type PriceType = 'flat' | 'usage';

export interface Price {
  id: string;
  type: PriceType;
  currency: Currency;
  unitAmount: number; // minor units
  billingInterval?: BillingInterval; // for recurring
  metric?: string; // for usage-based pricing
  tiers?: PriceTier[]; // optional tiered pricing
  metadata?: Record<string, any>; // e.g., provider price ids
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  currency: Currency;
  pricing: Price[];
  strategy: 'flat' | 'usage' | 'hybrid' | 'tiered' | 'seat' | 'prepaid';
  basePriceId?: string; // for hybrid/base + usage
  seatsIncluded?: number;
  metadata?: Record<string, any>; // provider-specific mapping
}

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'unpaid';

export interface SubscriptionItem {
  priceId: string;
  quantity?: number;
  metadata?: Record<string, any>; // e.g., provider subscription item id
}

export interface Subscription {
  id: string;
  externalId?: string; // Provider subscription id
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date;
  items?: SubscriptionItem[];
  metadata?: Record<string, any>;
}

export interface UsageRecord {
  id: string;
  customerId: string;
  subscriptionId: string;
  metric: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>; // e.g., provider subscription item id
}

export interface InvoiceItem {
  description: string;
  amount: number; // minor units
  quantity?: number;
  currency: Currency;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Invoice {
  id: string;
  externalId?: string; // Provider invoice id
  customerId: string;
  subscriptionId?: string;
  number?: string;
  currency: Currency;
  items: InvoiceItem[];
  total: number; // minor units
  status: InvoiceStatus;
  issuedAt: Date;
  dueDate?: Date;
  taxAmount?: number;
  discounts?: number;
  pdfUrl?: string;
  metadata?: Record<string, any>;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  amount: number; // minor units
  currency: Currency;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  provider: string;
  externalId?: string;
  createdAt: Date;
}

export interface Entitlement {
  featureKey: string;
  limit?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface BillingEvent {
  id: string;
  type:
    | 'payment.succeeded'
    | 'payment.failed'
    | 'subscription.created'
    | 'subscription.renewed'
    | 'subscription.canceled'
    | 'invoice.generated'
    | 'invoice.paid'
    | 'invoice.payment_failed'
    | 'usage.recorded';
  provider: string;
  createdAt: Date;
  payload: any;
}