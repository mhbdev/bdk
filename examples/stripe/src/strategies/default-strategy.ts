import { ProviderSelectionStrategy, ProviderSelectionContext } from '@mhbdev/bdk/providers';
import { PaymentProvider } from '@mhbdev/bdk/core';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';

export class DefaultProviderSelectionStrategy extends ProviderSelectionStrategy {
  constructor(private registry: InMemoryPaymentProviderRegistry) {
    super();
  }

  async selectProvider(context: ProviderSelectionContext): Promise<PaymentProvider> {
    const candidateId = context.paymentMethod?.providerId;
    if (candidateId) {
      const provider = this.registry.getProvider(candidateId);
      if (provider) return provider;
    }
    return this.registry.getDefaultProvider();
  }
}