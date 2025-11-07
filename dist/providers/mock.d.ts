import { UsageStorageAdapter, PaymentProvider } from '../types.js';

/**
 * Mock Provider for Payment Gateway
 *
 * Implements a mock payment provider for testing purposes.
 */

/**
 * Create a Mock provider
 * @param {Object} options - Configuration options
 * @param {boolean} options.simulateErrors - Whether to simulate errors
 * @param {number} options.errorRate - Error rate (0-1)
 * @param {number} options.delay - Delay in milliseconds
 * @param {boolean} options.debug - Enable debug mode
 * @returns {Object} - Mock provider
 */
interface MockProviderOptions {
    simulateErrors: boolean;
    errorRate: number;
    delay: number;
    debug: boolean;
    usageStorage?: UsageStorageAdapter;
    usageIdempotencyTtlMs?: number;
}
declare function createMockProvider(options?: Partial<MockProviderOptions>): PaymentProvider;

export { createMockProvider, createMockProvider as default };
