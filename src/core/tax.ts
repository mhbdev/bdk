import { Money } from "./types";

export interface TaxContext {
  customerId: string;
  customerCountry: string;
  customerState?: string;
  customerPostalCode?: string;
  customerTaxId?: string;
  productType?: string;
  isDigitalGood?: boolean;
}

export interface TaxCalculation {
  subtotal: Money;
  taxAmount: Money;
  total: Money;
  taxRates: AppliedTaxRate[];
  taxExempt: boolean;
  taxExemptReason?: string;
}

export interface AppliedTaxRate {
  name: string;
  rate: number;
  jurisdiction: string;
  amount: Money;
}

export interface TaxRate {
  jurisdiction: string;
  rate: number;
  type: string;
  applicableTo: string[];
}

export interface TaxIdValidation {
  valid: boolean;
  taxId: string;
  country: string;
  companyName?: string;
  address?: string;
}
