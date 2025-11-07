import PDFDocument from 'pdfkit';
import { Invoice } from '../../core/models/types';

export class InvoiceService {
  async generatePdf(invoice: Invoice): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice ID: ${invoice.id}`);
      if (invoice.number) doc.text(`Invoice No: ${invoice.number}`);
      doc.text(`Customer: ${invoice.customerId}`);
      doc.text(`Issued: ${invoice.issuedAt.toISOString()}`);
      if (invoice.dueDate) doc.text(`Due: ${invoice.dueDate.toISOString()}`);
      doc.moveDown();

      // Items
      doc.fontSize(12).text('Items:', { underline: true });
      invoice.items.forEach((item) => {
        doc.text(
          `${item.description} x${item.quantity ?? 1} - ${(item.amount / 100).toFixed(2)} ${item.currency}`,
        );
      });
      doc.moveDown();

      const total = (invoice.total / 100).toFixed(2);
      doc.fontSize(14).text(`Total: ${total} ${invoice.currency}`, { align: 'right' });
      doc.end();
    });
  }
}