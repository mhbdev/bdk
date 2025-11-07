import { Currency } from '../../core/models/types';

export interface CurrencyRateProvider {
  getRate(from: Currency, to: Currency): Promise<number>; // target major units per 1 source major unit
}

export class CurrencyConversionService {
  private rates = new Map<string, number>(); // key: `${from}_${to}`
  private provider?: CurrencyRateProvider;

  // Decimals mapping to convert minor<->major units; crypto included
  private static decimals: Record<Currency, number> = {
    USD: 100,
    EUR: 100,
    GBP: 100,
    JPY: 100,
    AUD: 100,
    CAD: 100,
    BTC: 100_000_000, // satoshis
    ETH: 1_000_000_000_000_000_000, // wei
    USDT: 100, // typical 2 decimals
  };

  constructor(opts?: { initialRates?: Record<string, number>; provider?: CurrencyRateProvider }) {
    if (opts?.initialRates) {
      for (const [k, v] of Object.entries(opts.initialRates)) this.rates.set(k, v);
    }
    this.provider = opts?.provider;
  }

  setRate(from: Currency, to: Currency, rate: number): void {
    this.rates.set(this.key(from, to), rate);
  }

  async getRate(from: Currency, to: Currency): Promise<number> {
    const key = this.key(from, to);
    const cached = this.rates.get(key);
    if (cached != null) return cached;
    if (!this.provider) throw new Error(`No rate for ${key} and no provider configured`);
    const fetched = await this.provider.getRate(from, to);
    this.rates.set(key, fetched);
    return fetched;
  }

  /**
   * Convert minor units from one currency to another using stored/provider rate.
   * Rate is target major units per 1 source major unit.
   */
  async convert(amountMinor: number, from: Currency, to: Currency): Promise<number> {
    if (from === to) return amountMinor;
    const rate = await this.getRate(from, to);
    const fromDec = CurrencyConversionService.decimals[from];
    const toDec = CurrencyConversionService.decimals[to];
    const amountFromMajor = amountMinor / fromDec;
    const amountToMajor = amountFromMajor * rate;
    const amountToMinor = Math.round(amountToMajor * toDec);
    return amountToMinor;
  }

  private key(from: Currency, to: Currency): string {
    return `${from}_${to}`;
  }
}