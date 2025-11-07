import { UsageStorageAdapter, PaymentProvider } from '../types.js';

/**
 * Crypto Provider for Payment Gateway
 *
 * Implements the cryptocurrency payment provider interface.
 */

type SupportedCoin = 'btc' | 'eth' | 'sol' | 'usdc';
interface CryptoProviderOptions {
    wallets: Partial<Record<SupportedCoin, string>>;
    exchangeRateProviders: Partial<Record<SupportedCoin, (coin: string, fiat: string) => Promise<number>>>;
    verificationCallback?: (subscription: CryptoSubscription) => Promise<boolean> | boolean;
    debug?: boolean;
    usageStorage?: UsageStorageAdapter;
    usageIdempotencyTtlMs?: number;
}
interface CryptoSubscription {
    id: string;
    customerEmail: string;
    planId: 'monthly' | 'yearly' | string;
    coin: SupportedCoin;
    amount: number;
    cryptoAmount: number;
    exchangeRate: number;
    walletAddress: string;
    status: 'pending' | 'active' | 'canceled';
    createdAt: string;
    startDate: string;
    expirationDate: string;
    metadata: Record<string, unknown>;
    paymentStatus: 'pending' | 'paid';
    transactionId: string | null;
    canceledAt?: string;
}
/**
 * Create a Crypto provider
 * @param {Object} options - Configuration options
 * @param {Object} options.wallets - Wallet addresses for different cryptocurrencies
 * @param {Object} options.exchangeRateProviders - Exchange rate providers for different cryptocurrencies
 * @param {Function} options.verificationCallback - Callback for verifying payments
 * @param {boolean} options.debug - Enable debug mode
 * @returns {Object} - Crypto provider
 */
declare function createCryptoProvider(options?: Partial<CryptoProviderOptions>): PaymentProvider;

export { createCryptoProvider, createCryptoProvider as default };
