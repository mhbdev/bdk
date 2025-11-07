import { describe, it, expect } from 'vitest';
import { InvoiceService } from '../../src/services/invoice/InvoiceService';

describe('InvoiceService branches', () => {
  it('generates PDF with number and due date', async () => {
    const svc = new InvoiceService();
    const buf = await svc.generatePdf({
      id: 'inv1', number: '0001', customerId: 'c', currency: 'USD',
      items: [ { description: 'x', amount: 100, currency: 'USD' } ],
      total: 100,
      status: 'open',
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    });
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('generates PDF without optional fields', async () => {
    const svc = new InvoiceService();
    const buf = await svc.generatePdf({
      id: 'inv2', customerId: 'c', currency: 'USD',
      items: [ { description: 'y', amount: 200, currency: 'USD', quantity: 2 } ],
      total: 200,
      status: 'open',
      issuedAt: new Date(),
    });
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});