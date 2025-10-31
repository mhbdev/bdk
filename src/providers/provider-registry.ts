import { PaymentProvider } from "../core/abstract-classes";

/**
 * Registry for managing multiple payment providers
 */
export abstract class PaymentProviderRegistry {
  /**
   * Register a payment provider
   */
  abstract register(provider: PaymentProvider): void;

  /**
   * Get a provider by ID
   */
  abstract getProvider(providerId: string): PaymentProvider | undefined;

  /**
   * Get the default provider
   */
  abstract getDefaultProvider(): PaymentProvider;

  /**
   * Set the default provider
   */
  abstract setDefaultProvider(providerId: string): void;

  /**
   * List all registered providers
   */
  abstract listProviders(): PaymentProvider[];
}
