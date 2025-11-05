import { TaxService } from '@mhbdev/bdk/services';
import { Money, TaxCalculation, TaxContext, TaxIdValidation, TaxRate } from '@mhbdev/bdk/core';

function money(amount: number, currency: string): Money { return { amount, currency }; }

export class DatabaseTaxService extends TaxService {
  async calculateTax(amount: Money, context: TaxContext): Promise<TaxCalculation> {
    // Simple: flat 0% tax
    const subtotal = amount;
    const taxAmount = money(0, amount.currency);
    const total = money(subtotal.amount + taxAmount.amount, amount.currency);
    return { subtotal, taxAmount, total, taxRates: [], taxExempt: false };
  }
  async validateTaxId(taxId: string, country: string): Promise<TaxIdValidation> {
    return { valid: true, taxId, country };
  }
  async getTaxRates(country: string, state?: string, postalCode?: string): Promise<TaxRate[]> { return []; }
}