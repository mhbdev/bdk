import { db } from '../db/client';
import { payments, paymentMethods } from '../db/schema';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { PaymentService, ProcessPaymentOptions, PaymentFilters } from '@mhbdev/bdk/services';
import { Payment, PaymentMethod } from '@mhbdev/bdk/core';
import { Money, PaymentStatus } from '@mhbdev/bdk/core';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from '../strategies/default-strategy';
import { randomUUID } from 'crypto';

export class DatabasePaymentService extends PaymentService {
  constructor(
    private readonly registry: InMemoryPaymentProviderRegistry,
    private readonly strategy: DefaultProviderSelectionStrategy,
  ) { super(); }

  async process(customerId: string, amount: Money, paymentMethodId: string, options?: ProcessPaymentOptions): Promise<Payment> {
    const pmRow = (await db.select().from(paymentMethods).where(eq(paymentMethods.id, paymentMethodId)).execute()).at(0);
    if (!pmRow) throw new Error('Payment method not found');
    const paymentMethod: PaymentMethod = {
      id: pmRow.id,
      customerId: pmRow.customerId,
      type: pmRow.type,
      providerId: pmRow.providerId,
      providerMethodId: pmRow.providerMethodId,
      isDefault: !!pmRow.isDefault,
      lastFour: pmRow.lastFour || undefined,
      expiryMonth: pmRow.expiryMonth || undefined,
      expiryYear: pmRow.expiryYear || undefined,
      metadata: pmRow.metadata || undefined,
      createdAt: new Date(pmRow.createdAt!),
      updatedAt: new Date(pmRow.updatedAt!),
    };

    const provider = await this.strategy.selectProvider({ customerId, amount, paymentMethod });
    const result = await provider.createPayment(amount, paymentMethod, options);

    const id = randomUUID();
    const now = new Date();
    const row = {
      id,
      customerId,
      subscriptionId: options?.subscriptionId || null,
      amount: amount.amount.toString(),
      currency: amount.currency,
      status: result.success ? result.status : PaymentStatus.FAILED,
      paymentMethodId,
      providerId: provider.providerId,
      providerTransactionId: result.providerTransactionId || null,
      failureReason: result.failureReason || null,
      metadata: options?.metadata || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(payments).values(row).execute();

    const payment: Payment = {
      id,
      customerId,
      subscriptionId: options?.subscriptionId || undefined,
      amount,
      status: row.status as PaymentStatus,
      paymentMethodId,
      providerId: provider.providerId,
      providerTransactionId: result.providerTransactionId || undefined,
      failureReason: result.failureReason || undefined,
      metadata: options?.metadata || undefined,
      createdAt: new Date(row.createdAt!),
      updatedAt: new Date(row.updatedAt!),
    };
    return payment;
  }

  async refund(paymentId: string, amount?: Money, reason?: string): Promise<Payment> {
    const p = await this.getById(paymentId);
    if (!p) throw new Error('Payment not found');
    if (!p.providerTransactionId || !p.providerId) throw new Error('Missing provider info');
    const provider = this.registry.getProvider(p.providerId);
    if (!provider) throw new Error('Provider not registered');
    try {
      await provider.refundPayment(p.providerTransactionId, amount);
      const now = new Date();
      await db.update(payments).set({ status: PaymentStatus.REFUNDED, updatedAt: now, failureReason: reason || null }).where(eq(payments.id, paymentId)).execute();
      return { ...p, status: PaymentStatus.REFUNDED, updatedAt: now };
    } catch (e: any) {
      const now = new Date();
      await db.update(payments).set({ failureReason: e?.message || 'Refund unsupported', updatedAt: now }).where(eq(payments.id, paymentId)).execute();
      return { ...p, failureReason: e?.message || 'Refund unsupported', updatedAt: now };
    }
  }

  async getById(paymentId: string): Promise<Payment | null> {
    const row = (await db.select().from(payments).where(eq(payments.id, paymentId)).execute()).at(0);
    if (!row) return null;
    return {
      id: row.id,
      customerId: row.customerId,
      subscriptionId: row.subscriptionId || undefined,
      amount: { amount: Number(row.amount), currency: row.currency },
      status: row.status as PaymentStatus,
      paymentMethodId: row.paymentMethodId,
      providerId: row.providerId || undefined,
      providerTransactionId: row.providerTransactionId || undefined,
      failureReason: row.failureReason || undefined,
      metadata: row.metadata || undefined,
      createdAt: new Date(row.createdAt!),
      updatedAt: new Date(row.updatedAt!),
    };
  }

  async listByCustomer(customerId: string, filters?: PaymentFilters): Promise<Payment[]> {
    const where = [eq(payments.customerId, customerId)];
    if (filters?.status?.length) where.push(inArray(payments.status, filters.status as string[]));
    if (filters?.dateFrom) where.push(gte(payments.createdAt, filters.dateFrom));
    if (filters?.dateTo) where.push(lte(payments.createdAt, filters.dateTo));
    const rows = await db.select().from(payments).where(and(...where)).execute();
    return rows.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      subscriptionId: row.subscriptionId || undefined,
      amount: { amount: Number(row.amount), currency: row.currency },
      status: row.status as PaymentStatus,
      paymentMethodId: row.paymentMethodId,
      providerId: row.providerId || undefined,
      providerTransactionId: row.providerTransactionId || undefined,
      failureReason: row.failureReason || undefined,
      metadata: row.metadata || undefined,
      createdAt: new Date(row.createdAt!),
      updatedAt: new Date(row.updatedAt!),
    }));
  }

  async retry(paymentId: string): Promise<Payment> {
    const p = await this.getById(paymentId);
    if (!p) throw new Error('Payment not found');
    if (!p.providerTransactionId || !p.providerId) throw new Error('Missing provider info');
    const provider = this.registry.getProvider(p.providerId);
    if (!provider) throw new Error('Provider not registered');
    const result = await provider.capturePayment(p.providerTransactionId);
    const newStatus = result.success ? result.status : PaymentStatus.FAILED;
    const failureReason = result.failureReason || undefined;
    const now = new Date();
    await db.update(payments).set({ status: newStatus, failureReason: failureReason || null, updatedAt: now }).where(eq(payments.id, paymentId)).execute();
    return { ...p, status: newStatus, failureReason, updatedAt: now };
  }
}