import { PaymentProvider } from '../types.js';

/**
 * Stripe Provider for Payment Gateway
 *
 * Implements the Stripe payment provider interface.
 */
/**
 * Create a Stripe provider
 * @param {Object} options - Configuration options
 * @param {string} options.secretKey - Stripe secret key
 * @param {string} options.publishableKey - Stripe publishable key
 * @param {string} options.webhookSecret - Stripe webhook secret
 * @param {Object} options.products - Product configuration
 * @param {Object} options.prices - Price configuration
 * @param {boolean} options.debug - Enable debug mode
 * @returns {Object} - Stripe provider
 */
interface StripeProviderOptions {
    secretKey: string | null;
    publishableKey: string | null;
    webhookSecret: string | null;
    products: Record<string, unknown>;
    prices: Record<string, unknown>;
    debug: boolean;
}
declare function createStripeProvider(options?: Partial<StripeProviderOptions>): PaymentProvider;

export { createStripeProvider, createStripeProvider as default };
