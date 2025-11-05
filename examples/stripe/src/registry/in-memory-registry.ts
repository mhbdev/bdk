import { PaymentProvider } from '@mhbdev/bdk/core';
import { PaymentProviderRegistry } from '@mhbdev/bdk/providers';

export class InMemoryPaymentProviderRegistry extends PaymentProviderRegistry {
  private providers = new Map<string, PaymentProvider>();
  private defaultProviderId: string | null = null;

  register(provider: PaymentProvider): void {
    this.providers.set(provider.providerId, provider);
    if (!this.defaultProviderId) {
      this.defaultProviderId = provider.providerId;
    }
  }

  getProvider(providerId: string): PaymentProvider | undefined {
    return this.providers.get(providerId);
  }

  getDefaultProvider(): PaymentProvider {
    if (!this.defaultProviderId) {
      throw new Error('No default provider set');
    }
    const provider = this.providers.get(this.defaultProviderId);
    if (!provider) throw new Error(`Default provider '${this.defaultProviderId}' not registered`);
    return provider;
  }

  setDefaultProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider '${providerId}' not registered`);
    }
    this.defaultProviderId = providerId;
  }

  listProviders(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }
}