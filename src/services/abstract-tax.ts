import { Money, TaxCalculation, TaxContext, TaxIdValidation, TaxRate } from "../core";

/**
 * Abstract tax calculation service
 */
export abstract class TaxService {
  /**
   * Calculate tax for an amount
   */
  abstract calculateTax(
    amount: Money,
    context: TaxContext
  ): Promise<TaxCalculation>;

  /**
   * Validate tax ID (VAT, GST, etc.)
   */
  abstract validateTaxId(
    taxId: string,
    country: string
  ): Promise<TaxIdValidation>;

  /**
   * Get applicable tax rates
   */
  abstract getTaxRates(
    country: string,
    state?: string,
    postalCode?: string
  ): Promise<TaxRate[]>;
}