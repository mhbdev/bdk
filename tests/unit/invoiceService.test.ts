import { describe, it, expect } from 'vitest';
import { InvoiceService } from '../../src/services/invoice/InvoiceService';
import { Invoice } from '../../src/core/models/types';

describe('InvoiceService', () => {
  it('generates a non-empty PDF buffer', async () => {
    const svc = new InvoiceService();
    const invoice: Invoice = {
      id: 'inv_test',
      customerId: 'c_test',
      currency: 'USD',
      items: [
        { description: 'Base', amount: 1000, currency: 'USD', quantity: 1 },
        { description: 'Usage', amount: 500, currency: 'USD', quantity: 10 },
      ],
      total: 1500,
      status: 'open',
      issuedAt: new Date(),
    };
    const pdf = await svc.generatePdf(invoice);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});