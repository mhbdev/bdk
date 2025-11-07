import { PaymentProvider } from '../types.js';

/**
 * PayPal provider for @mhbdev/bdk
 */
/**
 * Create a PayPal provider
 * @param {Object} options - PayPal options
 * @param {string} options.clientId - PayPal client ID
 * @param {string} options.clientSecret - PayPal client secret
 * @param {boolean} options.sandbox - Whether to use sandbox environment (default: false)
 * @param {Object} options.webhookId - PayPal webhook ID for verification
 * @returns {Object} PayPal provider
 */

interface PayPalProviderOptions {
    clientId: string;
    clientSecret: string;
    sandbox?: boolean;
    webhookId?: string | null;
    debug?: boolean;
}
declare function createPayPalProvider(options: PayPalProviderOptions): PaymentProvider;

export { createPayPalProvider, createPayPalProvider as default };
