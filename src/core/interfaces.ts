import { BillingInterval, LedgerEntryType, Money, PaymentStatus, SubscriptionStatus, TransactionType } from "./types";

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription plan definition
 */
export interface SubscriptionPlan extends BaseEntity {
  name: string;
  description?: string;
  price: Money;
  interval: BillingInterval;
  intervalCount: number;
  trialPeriodDays?: number;
  features: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Customer subscription instance
 */
export interface Subscription extends BaseEntity {
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
}

/**
 * Payment transaction record
 */
export interface Payment extends BaseEntity {
  customerId: string;
  subscriptionId?: string;
  amount: Money;
  status: PaymentStatus;
  paymentMethodId: string;
  providerId?: string;
  providerTransactionId?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment method (card, bank account, etc.)
 */
export interface PaymentMethod extends BaseEntity {
  customerId: string;
  type: string;
  providerId: string;
  providerMethodId: string;
  isDefault: boolean;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  metadata?: Record<string, any>;
}

/**
 * Customer balance/account
 */
export interface Balance extends BaseEntity {
  customerId: string;
  available: Money;
  pending: Money;
  reserved: Money;
}

/**
 * Ledger entry for double-entry accounting
 */
export interface LedgerEntry extends BaseEntity {
  customerId: string;
  transactionId: string;
  type: LedgerEntryType;
  transactionType: TransactionType;
  amount: Money;
  balance: Money;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Invoice representation
 */
export interface Invoice extends BaseEntity {
  customerId: string;
  subscriptionId?: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  subtotal: Money;
  tax?: Money;
  total: Money;
  dueDate: Date;
  paidAt?: Date;
  lineItems: InvoiceLineItem[];
  metadata?: Record<string, any>;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: Money;
  amount: Money;
  metadata?: Record<string, any>;
}
