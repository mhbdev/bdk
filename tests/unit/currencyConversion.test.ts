import { describe, it, expect } from 'vitest';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';

describe('CurrencyConversionService', () => {
  it('converts BTC minor units (satoshi) to USD cents using rate', async () => {
    const conv = new CurrencyConversionService();
    conv.setRate('BTC', 'USD', 50_000); // 1 BTC = $50,000
    const satoshis = 25_000_000; // 0.25 BTC
    const cents = await conv.convert(satoshis, 'BTC', 'USD');
    // $12,500 => 1,250,000 cents
    expect(cents).toBe(1_250_000);
  });

  it('converts ETH minor units (wei) to USD cents using rate', async () => {
    const conv = new CurrencyConversionService();
    conv.setRate('ETH', 'USD', 3_000); // 1 ETH = $3,000
    const wei = BigInt('500000000000000000'); // 0.5 ETH in wei
    const weiNumber = Number(wei); // fine for test-scale
    const cents = await conv.convert(weiNumber, 'ETH', 'USD');
    // $1,500 => 150,000 cents
    expect(cents).toBe(150_000);
  });

  it('keeps USDT pegged to USD at 1:1', async () => {
    const conv = new CurrencyConversionService();
    conv.setRate('USDT', 'USD', 1); // 1 USDT = $1
    const minor = 12_345; // $123.45 in USDT minor units
    const cents = await conv.convert(minor, 'USDT', 'USD');
    expect(cents).toBe(12_345);
  });
});