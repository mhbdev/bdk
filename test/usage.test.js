import { describe, it, expect } from 'vitest';
import { createMockProvider } from '../src/providers/mock.ts';
import { createCryptoProvider } from '../src/providers/crypto.ts';

describe('Usage Idempotency and Aggregation', () => {
  describe('Mock Provider', () => {
    it('deduplicates recordUsage when idempotencyKey is provided', async () => {
      const provider = createMockProvider({ debug: true });
      const base = { customerId: 'cus_1', metricKey: 'emails.sent', quantity: 1 };
      await provider.recordUsage({ ...base, idempotencyKey: 'idem-1' });
      await provider.recordUsage({ ...base, idempotencyKey: 'idem-1' });
      const events = await provider.getUsage({ customerId: 'cus_1', metricKey: 'emails.sent' });
      expect(events.length).toBe(1);
    });

    it('records multiple events when no idempotencyKey is used', async () => {
      const provider = createMockProvider({ debug: true });
      const base = { customerId: 'cus_2', metricKey: 'api.calls', quantity: 1 };
      await provider.recordUsage(base);
      await provider.recordUsage(base);
      const events = await provider.getUsage({ customerId: 'cus_2', metricKey: 'api.calls' });
      expect(events.length).toBe(2);
    });

    it('aggregates usage totals correctly', async () => {
      const provider = createMockProvider({ debug: true });
      await provider.recordUsage({ customerId: 'cus_3', metricKey: 'storage.gb', quantity: 2 });
      await provider.recordUsage({ customerId: 'cus_3', metricKey: 'storage.gb', quantity: 3 });
      const agg = await provider.getUsageAggregate({ customerId: 'cus_3', metricKey: 'storage.gb', aggregation: 'sum' });
      expect(agg.total).toBe(5);
    });

    it('checks usage limit against policy', async () => {
      const provider = createMockProvider({ debug: true });
      await provider.setUsagePolicy({ customerId: 'cus_4', metricKey: 'jobs.processed', limit: 5, window: 'month' });
      await provider.recordUsage({ customerId: 'cus_4', metricKey: 'jobs.processed', quantity: 3 });
      const res = await provider.checkUsageLimit({ customerId: 'cus_4', metricKey: 'jobs.processed' });
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(2);
      expect(res.usage).toBe(3);
    });
  });

  describe('Crypto Provider', () => {
    const baseOptions = {
      wallets: { btc: 'btc_wallet_address' },
      exchangeRateProviders: { btc: async () => 20000 },
      debug: true
    };

    it('deduplicates recordUsage when idempotencyKey is provided', async () => {
      const provider = createCryptoProvider(baseOptions);
      const base = { customerId: 'cus_c1', metricKey: 'emails.sent', quantity: 1 };
      await provider.recordUsage({ ...base, idempotencyKey: 'idem-1' });
      await provider.recordUsage({ ...base, idempotencyKey: 'idem-1' });
      const events = await provider.getUsage({ customerId: 'cus_c1', metricKey: 'emails.sent' });
      expect(events.length).toBe(1);
    });

    it('aggregates usage totals correctly', async () => {
      const provider = createCryptoProvider(baseOptions);
      await provider.recordUsage({ customerId: 'cus_c2', metricKey: 'storage.gb', quantity: 2 });
      await provider.recordUsage({ customerId: 'cus_c2', metricKey: 'storage.gb', quantity: 3 });
      const agg = await provider.getUsageAggregate({ customerId: 'cus_c2', metricKey: 'storage.gb', aggregation: 'sum' });
      expect(agg.total).toBe(5);
    });
  });
});