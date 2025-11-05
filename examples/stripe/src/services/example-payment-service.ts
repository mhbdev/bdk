import { PaymentService, ProcessPaymentOptions, PaymentFilters } from '@mhbdev/bdk/services';
import { Payment, PaymentMethod, Money, PaymentStatus } from '@mhbdev/bdk/core';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from '../strategies/default-strategy';

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export class ExamplePaymentService extends PaymentService {
  private payments = new Map<string, Payment>();
  private paymentMethods = new Map<string, PaymentMethod>();

  constructor(
    private registry: InMemoryPaymentProviderRegistry,
    private strategy: DefaultProviderSelectionStrategy,
  ) {
    super();
  }

  addPaymentMethod(method: PaymentMethod): void {
    this.paymentMethods.set(method.id, method);
  }

  async process(
    customerId: string,
    amount: Money,
    paymentMethodId: string,
    options?: ProcessPaymentOptions
  ): Promise<Payment> {
    const method = this.paymentMethods.get(paymentMethodId);
    if (!method) throw new Error(`Payment method not found: ${paymentMethodId}`);

    const provider = await this.strategy.selectProvider({
      customerId,
      amount,
      paymentMethod: method,
    });

    const result = await provider.createPayment(amount, method, {
      captureMethod: options?.captureMethod,
      description: options?.description,
      metadata: options?.metadata,
    });

    const payment: Payment = {
      id: genId('pay'),
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId,
      subscriptionId: options?.subscriptionId,
      amount,
      status: result.success ? result.status : PaymentStatus.FAILED,
      paymentMethodId,
      providerId: provider.providerId,
      providerTransactionId: result.providerTransactionId,
      failureReason: result.failureReason,
      metadata: options?.metadata,
    };

    this.payments.set(payment.id, payment);
    return payment;
  }

  async refund(paymentId: string, amount?: Money): Promise<Payment> {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);
    if (!payment.providerTransactionId || !payment.providerId) throw new Error('Payment missing provider info');

    const provider = this.registry.getProvider(payment.providerId);
    if (!provider) throw new Error(`Provider not registered: ${payment.providerId}`);

    await provider.refundPayment(payment.providerTransactionId, amount);

    const updated: Payment = {
      ...payment,
      updatedAt: new Date(),
      status: amount && amount.amount < payment.amount.amount ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
    };
    this.payments.set(paymentId, updated);
    return updated;
  }

  async getById(paymentId: string): Promise<Payment | null> {
    return this.payments.get(paymentId) ?? null;
  }

  async listByCustomer(customerId: string, _filters?: PaymentFilters): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.customerId === customerId);
  }

  async retry(_paymentId: string): Promise<Payment> {
    throw new Error('Not implemented in the example');
  }
}