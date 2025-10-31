import { Invoice, InvoiceLineItem } from "../core";

/**
 * Abstract invoice service
 * Extend this for invoice management
 */
export abstract class InvoiceService {
  /**
   * Create a new invoice
   */
  abstract create(
    customerId: string,
    lineItems: InvoiceLineItem[],
    options?: InvoiceCreateOptions
  ): Promise<Invoice>;

  /**
   * Finalize a draft invoice
   */
  abstract finalize(invoiceId: string): Promise<Invoice>;

  /**
   * Mark invoice as paid
   */
  abstract markPaid(invoiceId: string, paymentId: string): Promise<Invoice>;

  /**
   * Void an invoice
   */
  abstract void(invoiceId: string): Promise<Invoice>;

  /**
   * Get invoice by ID
   */
  abstract getById(invoiceId: string): Promise<Invoice | null>;

  /**
   * List invoices for a customer
   */
  abstract listByCustomer(
    customerId: string,
    filters?: InvoiceFilters
  ): Promise<Invoice[]>;
}

export interface InvoiceCreateOptions {
  subscriptionId?: string;
  dueDate?: Date;
  taxRate?: number;
  metadata?: Record<string, any>;
}

export interface InvoiceFilters {
  status?: Invoice['status'][];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}
