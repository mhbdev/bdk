import { BalanceService, LedgerFilters } from '@mhbdev/bdk/services';
import { Balance, LedgerEntry, LedgerEntryType, Money, TransactionType } from '@mhbdev/bdk/core';
import { db } from '../db/client';
import { balances, ledgerEntries } from '../db/schema';
import { eq } from 'drizzle-orm';

function uuid() { return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex'); }
function money(amount: number, currency: string): Money { return { amount, currency }; }

export class DatabaseBalanceService extends BalanceService {
  async getBalance(customerId: string): Promise<Balance> {
    const bRows = await db.select().from(balances).where(eq(balances.customerId, customerId)).limit(1).execute();
    const b = bRows[0];
    if (!b) return await this._initialize(customerId);
    return toBalance(b);
  }

  async addCredit(customerId: string, amount: Money, description?: string): Promise<LedgerEntry> {
    const bal = await this.getBalance(customerId);
    const newAvailable = bal.available.amount + amount.amount;
    await db.update(balances).set({ availableAmount: String(newAvailable), updatedAt: new Date() }).where(eq(balances.id, bal.id)).execute();
    return await this._appendLedger(customerId, TransactionType.CREDIT, LedgerEntryType.CREDIT, amount, newAvailable, description);
  }

  async deduct(customerId: string, amount: Money, transactionType: TransactionType, description?: string): Promise<LedgerEntry> {
    const bal = await this.getBalance(customerId);
    const newAvailable = bal.available.amount - amount.amount;
    await db.update(balances).set({ availableAmount: String(newAvailable), updatedAt: new Date() }).where(eq(balances.id, bal.id)).execute();
    return await this._appendLedger(customerId, transactionType, LedgerEntryType.DEBIT, amount, newAvailable, description);
  }

  async getLedger(customerId: string, filters?: LedgerFilters): Promise<LedgerEntry[]> {
    const rows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.customerId, customerId)).execute();
    return rows.map(toLedger);
  }

  async reserve(customerId: string, amount: Money, transactionId: string): Promise<Balance> {
    const bal = await this.getBalance(customerId);
    await db.update(balances).set({ reservedAmount: String(bal.reserved.amount + amount.amount), updatedAt: new Date() }).where(eq(balances.id, bal.id)).execute();
    return await this.getBalance(customerId);
  }

  async releaseReserve(customerId: string, transactionId: string): Promise<Balance> {
    const bal = await this.getBalance(customerId);
    await db.update(balances).set({ reservedAmount: '0', updatedAt: new Date() }).where(eq(balances.id, bal.id)).execute();
    return await this.getBalance(customerId);
  }

  private async _initialize(customerId: string): Promise<Balance> {
    const id = uuid();
    const now = new Date();
    await db.insert(balances).values({ id, customerId, availableAmount: '0', availableCurrency: 'IRT', pendingAmount: '0', pendingCurrency: 'IRT', reservedAmount: '0', reservedCurrency: 'IRT', createdAt: now, updatedAt: now }).execute();
    return { id, customerId, available: money(0, 'IRT'), pending: money(0, 'IRT'), reserved: money(0, 'IRT'), createdAt: now, updatedAt: now };
  }

  private async _appendLedger(customerId: string, transactionType: TransactionType, type: LedgerEntryType, amount: Money, newBalance: number, description?: string): Promise<LedgerEntry> {
    const id = uuid();
    const now = new Date();
    const entry: LedgerEntry = { id, customerId, transactionId: id, type, transactionType, amount, balance: money(newBalance, amount.currency), description, metadata: undefined, createdAt: now, updatedAt: now };
    await db.insert(ledgerEntries).values({ id, customerId, transactionId: id, type, transactionType, amount: String(amount.amount), currency: amount.currency, balanceAmount: String(newBalance), balanceCurrency: amount.currency, description: description || null, metadata: null, createdAt: now, updatedAt: now }).execute();
    return entry;
  }
}

function toBalance(row: any): Balance {
  return { id: row.id, customerId: row.customerId, available: money(Number(row.availableAmount), row.availableCurrency), pending: money(Number(row.pendingAmount), row.pendingCurrency), reserved: money(Number(row.reservedAmount), row.reservedCurrency), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
}
function toLedger(row: any): LedgerEntry { return { id: row.id, customerId: row.customerId, transactionId: row.transactionId, type: row.type as LedgerEntryType, transactionType: row.transactionType as TransactionType, amount: money(Number(row.amount), row.currency), balance: money(Number(row.balanceAmount), row.balanceCurrency), description: row.description || undefined, metadata: row.metadata || undefined, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }; }