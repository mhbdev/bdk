import { Money, Payment, PaymentStatus } from "../core";

/**
 * Abstract payment processing service
 * Extend this to implement payment handling logic
 */
export abstract class PaymentService {
  /**
   * Process a payment
   */
  abstract process(
    customerId: string,
    amount: Money,
    paymentMethodId: string,
    options?: ProcessPaymentOptions
  ): Promise<Payment>;

  /**
   * Refund a payment
   */
  abstract refund(
    paymentId: string,
    amount?: Money,
    reason?: string
  ): Promise<Payment>;

  /**
   * Get payment by ID
   */
  abstract getById(paymentId: string): Promise<Payment | null>;

  /**
   * List payments for a customer
   */
  abstract listByCustomer(
    customerId: string,
    filters?: PaymentFilters
  ): Promise<Payment[]>;

  /**
   * Retry a failed payment
   */
  abstract retry(paymentId: string): Promise<Payment>;
}

export interface ProcessPaymentOptions {
  subscriptionId?: string;
  description?: string;
  captureMethod?: 'automatic' | 'manual';
  metadata?: Record<string, any>;
}

export interface PaymentFilters {
  status?: PaymentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}