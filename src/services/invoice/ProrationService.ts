import { Currency, Invoice, InvoiceItem, Plan } from '../../core/models/types';

export interface ProrationInput {
  oldAmount: number; // minor units
  newAmount: number; // minor units
  periodStart: Date;
  periodEnd: Date;
  changeDate: Date;
  currency: Currency;
  customerId: string;
  subscriptionId?: string;
}

export interface ProrationResult {
  credit: number; // for unused portion of old plan
  debit: number;  // for remaining portion of new plan
  net: number;    // debit - credit
  fraction: number; // remaining period fraction [0,1]
  items: InvoiceItem[];
}

export class ProrationService {
  /**
   * Calculates proration differential using time-based fraction of remaining cycle.
   * Fraction = (periodEnd - changeDate) / (periodEnd - periodStart).
   */
  calculate(input: Omit<ProrationInput, 'customerId' | 'subscriptionId'>): Omit<ProrationResult, 'items'> {
    const totalMs = input.periodEnd.getTime() - input.periodStart.getTime();
    if (totalMs <= 0) {
      return { credit: 0, debit: 0, net: 0, fraction: 0 };
    }
    const remainingMs = Math.max(0, input.periodEnd.getTime() - input.changeDate.getTime());
    const fraction = Math.min(1, Math.max(0, remainingMs / totalMs));
    const credit = Math.round(input.oldAmount * fraction);
    const debit = Math.round(input.newAmount * fraction);
    const net = debit - credit;
    return { credit, debit, net, fraction };
  }

  /**
   * Produces proration invoice items (credit as negative, debit as positive) and total.
   */
  generateInvoice(input: ProrationInput): Invoice {
    const { credit, debit, net } = this.calculate({
      oldAmount: input.oldAmount,
      newAmount: input.newAmount,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      changeDate: input.changeDate,
      currency: input.currency,
    });
    const items: InvoiceItem[] = [
      { description: 'Proration credit (unused old plan)', amount: -credit, currency: input.currency },
      { description: 'Proration debit (remaining new plan)', amount: debit, currency: input.currency },
    ];
    const invoice: Invoice = {
      id: `inv_proration_${Date.now()}`,
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      currency: input.currency,
      items,
      total: net,
      status: 'open',
      issuedAt: input.changeDate,
    };
    return invoice;
  }

  /**
   * Helper to compute unit amounts from `Plan` definitions (flat/base pricing only).
   * Returns minor unit amount for the plan's base price multiplied by seats.
   */
  private resolvePlanAmount(plan: Plan, seats = 1): number {
    // Prefer an explicitly marked base price; otherwise pick the first flat price in plan currency.
    const currency = plan.currency;
    const basePrice = plan.pricing.find((p) => p.type === 'flat' && p.currency === currency);
    if (!basePrice) {
      throw new Error(`ProrationService: Plan '${plan.id}' must include a flat/base price in currency ${currency}`);
    }
    const qty = Math.max(1, seats);
    return basePrice.unitAmount * qty;
  }

  /**
   * Calculates and generates a proration invoice directly from old/new plans and seat count.
   */
  generateInvoiceFromPlans(params: {
    oldPlan: Plan;
    newPlan: Plan;
    seats?: number;
    periodStart: Date;
    periodEnd: Date;
    changeDate: Date;
    customerId: string;
    subscriptionId?: string;
  }): Invoice {
    if (params.oldPlan.currency !== params.newPlan.currency) {
      throw new Error('ProrationService: Currency mismatch between old and new plans');
    }
    const currency = params.newPlan.currency;
    const oldAmount = this.resolvePlanAmount(params.oldPlan, params.seats);
    const newAmount = this.resolvePlanAmount(params.newPlan, params.seats);
    const base: ProrationInput = {
      oldAmount,
      newAmount,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      changeDate: params.changeDate,
      currency,
      customerId: params.customerId,
      subscriptionId: params.subscriptionId,
    };
    return this.generateInvoice(base);
  }
}