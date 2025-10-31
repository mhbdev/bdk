import { Balance, LedgerEntry, Money, TransactionType } from "../core";

/**
 * Abstract balance/ledger service
 * Extend this for account balance tracking
 */
export abstract class BalanceService {
  /**
   * Get customer balance
   */
  abstract getBalance(customerId: string): Promise<Balance>;

  /**
   * Add credit to customer account
   */
  abstract addCredit(
    customerId: string,
    amount: Money,
    description?: string
  ): Promise<LedgerEntry>;

  /**
   * Deduct from customer account
   */
  abstract deduct(
    customerId: string,
    amount: Money,
    transactionType: TransactionType,
    description?: string
  ): Promise<LedgerEntry>;

  /**
   * Get ledger entries for customer
   */
  abstract getLedger(
    customerId: string,
    filters?: LedgerFilters
  ): Promise<LedgerEntry[]>;

  /**
   * Reserve funds (for pending charges)
   */
  abstract reserve(
    customerId: string,
    amount: Money,
    transactionId: string
  ): Promise<Balance>;

  /**
   * Release reserved funds
   */
  abstract releaseReserve(
    customerId: string,
    transactionId: string
  ): Promise<Balance>;
}

export interface LedgerFilters {
  transactionType?: TransactionType[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}