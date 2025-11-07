import { Currency } from '../../../core/models/types';
import { CurrencyRateProvider } from '../CurrencyConversionService';

type CacheEntry = { value: number; expiresAt: number };

export interface CoinbaseRateProviderOptions {
  ttlMs?: number; // cache time-to-live
  maxRetries?: number; // number of fetch retries
  backoffMs?: number; // base backoff in ms
}

/**
 * CoinbaseRateProvider fetches rates from Coinbase public API and caches them.
 * It supports multiple fiat targets (USD, EUR, GBP, JPY, AUD, CAD) and crypto.
 * It computes inverses when only the reverse rate is cached/fetched.
 */
export class CoinbaseRateProvider implements CurrencyRateProvider {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;
  private maxRetries: number;
  private backoffMs: number;

  constructor(opts?: CoinbaseRateProviderOptions) {
    this.ttlMs = opts?.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
    this.maxRetries = opts?.maxRetries ?? 3;
    this.backoffMs = opts?.backoffMs ?? 200;
  }

  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;
    const key = this.key(from, to);
    const cached = this.getCached(key);
    if (cached != null) return cached;

    // If inverse is cached and valid, compute inverse
    const invKey = this.key(to, from);
    const inverse = this.getCached(invKey);
    if (inverse != null) {
      const inv = 1 / inverse;
      this.setCache(key, inv);
      return inv;
    }

    // Fetch rates for `from` and cache all returned pairs
    const rates = await this.fetchRatesFor(from);
    const value = rates[to];
    if (value == null) {
      // Try fetching `to` and using inverse if `from`->`to` missing
      const toRates = await this.fetchRatesFor(to);
      const toFrom = toRates[from];
      if (toFrom == null) throw new Error(`Rate not available for ${from}->${to}`);
      const inv = 1 / toFrom;
      this.setCache(key, inv);
      return inv;
    }
    this.setCache(key, value);
    return value;
  }

  private async fetchRatesFor(base: Currency): Promise<Record<string, number>> {
    const url = `https://api.coinbase.com/v2/exchange-rates?currency=${base}`;
    let attempt = 0;
    let lastErr: any;
    while (attempt < this.maxRetries) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: any = await res.json();
        const raw = json?.data?.rates;
        if (!raw || typeof raw !== 'object') throw new Error('Invalid payload');

        // Normalize to number and cache all pairs with TTL
        const normalized: Record<string, number> = {};
        for (const [k, v] of Object.entries(raw)) {
          const num = typeof v === 'string' ? parseFloat(v) : (v as number);
          if (!Number.isFinite(num)) continue;
          normalized[k] = num;
          // Cache base->k
          this.setCache(this.key(base, k as Currency), num);
          // Also cache inverse k->base
          this.setCache(this.key(k as Currency, base), 1 / num);
        }
        return normalized;
      } catch (e) {
        lastErr = e;
        attempt++;
        if (attempt >= this.maxRetries) break;
        const wait = this.backoffMs * attempt;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw new Error(`Failed to fetch rates for ${base}: ${lastErr}`);
  }

  private key(from: Currency, to: Currency): string {
    return `${from}_${to}`;
  }

  private getCached(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private setCache(key: string, value: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}