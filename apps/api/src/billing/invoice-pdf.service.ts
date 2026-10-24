import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { invoiceMoney, type InvoiceSnapshot } from './invoice.types';
import {
  invoiceLogoBuffer,
  readInvoiceTemplate,
  type InvoiceTemplate,
} from './invoice-template';

export interface InvoicePdfData {
  number: string;
  mode: string;
  status: string;
  issuedAt: Date;
  dueAt: Date;
  paidAt: Date | null;
  paymentReference: string | null;
  amountMinor: number;
  currency: string;
  snapshot: InvoiceSnapshot;
  historical: boolean;
}
const NAVY = '#0B335B',
  MUTED = '#52677A',
  BORDER = '#DCE5EC';

@Injectable()
export class InvoicePdfService {
  private readonly defaultLogo = readFileSync(
    [
      join(__dirname, 'assets', 'solverix-logo.png'),
      join(process.cwd(), 'src', 'billing', 'assets', 'solverix-logo.png'),
      join(
        process.cwd(),
        'apps',
        'api',
        'src',
        'billing',
        'assets',
        'solverix-logo.png',
      ),
    ].find((path) => existsSync(path)) ?? '',
  );
  snapshotTemplate(value?: unknown): InvoiceTemplate {
    const template = readInvoiceTemplate(value);
    return template.logoMode === 'DEFAULT'
      ? {
          ...template,
          logoMode: 'CUSTOM',
          logoDataUrl: `data:image/png;base64,${this.defaultLogo.toString(
            'base64',
          )}`,
        }
      : template;
  }
  async validateTemplate(template: InvoiceTemplate): Promise<void> {
    if (template.logoMode !== 'CUSTOM') return;
    try {
      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument();
        doc.on('data', () => undefined);
        doc.on('end', resolve);
        doc.on('error', reject);
        try {
          doc.image(invoiceLogoBuffer(template.logoDataUrl), 44, 44, {
            fit: [165, 60],
          });
          doc.end();
        } catch (error) {
          doc.destroy();
          reject(error);
        }
      });
    } catch {
      throw new BadRequestException(
        'The logo could not be decoded. Upload a valid PNG or JPEG.',
      );
    }
  }
  private readonly logo = readFileSync(
    [
      join(__dirname, 'assets', 'gromoze-logo.png'),
      join(process.cwd(), 'src', 'billing', 'assets', 'gromoze-logo.png'),
      join(
        process.cwd(),
        'apps',
        'api',
        'src',
        'billing',
        'assets',
        'gromoze-logo.png',
      ),
    ].find((path) => existsSync(path)) ?? '',
  );

  render(invoice: InvoicePdfData): Promise<Buffer> {
    const template = readInvoiceTemplate(invoice.snapshot.template);
    const accent = template.accentColor;
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 44,
        info: {
          Title: `${invoice.snapshot.seller.name} invoice ${invoice.number}`,
          CreationDate: invoice.issuedAt,
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      const date = (value: Date) =>
        value.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      const heading = (value: string, y: number, x = 44) =>
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(accent)
          .text(value, x, y);
      const line = (y: number) =>
        doc.moveTo(44, y).lineTo(551, y).strokeColor(BORDER).stroke();
      try {
        // Legacy snapshots retain the original supplied Gromoze artwork.
        if (!invoice.snapshot.template)
          doc
            .save()
            .rect(44, 38, 165, 51)
            .clip()
            .image(this.logo, 31, -5, { width: 186 })
            .restore();
        else if (template.logoMode !== 'NONE')
          doc.image(
            template.logoMode === 'CUSTOM'
              ? invoiceLogoBuffer(template.logoDataUrl)
              : this.defaultLogo,
            44,
            38,
            { fit: [200, 60], valign: 'center' },
          );
        doc.font('Helvetica-Bold').fontSize(22);
        const headingSize = Math.min(
          22,
          (22 * 271) / Math.max(1, doc.widthOfString(template.heading)),
        );
        doc
          .font('Helvetica-Bold')
          .fontSize(headingSize)
          .fillColor(NAVY)
          .text(template.heading, 280, 40, {
            width: 271,
            height: 28,
            ellipsis: true,
            align: 'right',
          });
        doc
          .fontSize(10)
          .text(invoice.number, 280, 72, { width: 271, align: 'right' });
        doc
          .fillColor(accent)
          .text(
            invoice.mode === 'TEST'
              ? `TEST INVOICE - ${invoice.status}`
              : invoice.status,
            280,
            91,
            { width: 271, align: 'right' },
          );
        line(118);
        if (template.layout === 'COMPACT')
          doc.rect(44, 114, 507, 3).fill(accent);
        heading('From', 139);
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(NAVY)
          .text(invoice.snapshot.seller.name.replace(/\s+/g, ' '), 44, 159, {
            width: 235,
          });
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(
            [
              invoice.snapshot.seller.address.replace(/\s+/g, ' '),
              invoice.snapshot.seller.email,
              invoice.snapshot.seller.phone,
            ]
              .filter(Boolean)
              .map((value) => value.replace(/\s+/g, ' '))
              .join('\n'),
            44,
            doc.y + 7,
            { width: 235, lineGap: 4 },
          );
        const sellerBottom = doc.y;
        heading('Bill to', 139, 315);
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(NAVY)
          .text(invoice.snapshot.customer.name.replace(/\s+/g, ' '), 315, 159, {
            width: 236,
          });
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(
            [
              invoice.snapshot.customer.address,
              invoice.snapshot.customer.email,
              invoice.snapshot.customer.phone,
            ]
              .filter(Boolean)
              .map((value) => value.replace(/\s+/g, ' '))
              .join('\n'),
            315,
            doc.y + 7,
            { width: 236, lineGap: 4 },
          );
        let y = Math.max(sellerBottom, doc.y) + 25;
        line(y);
        y += 15;
        doc.fillColor(MUTED).text(`Issued: ${date(invoice.issuedAt)}`, 44, y);
        doc.text(`Due: ${date(invoice.dueAt)}`, 315, y);
        y += 30;
        doc
          .fillColor(NAVY)
          .font('Helvetica-Bold')
          .text(invoice.snapshot.planName, 44, y);
        y = doc.y + 20;
        const tableHeader = () => {
          doc.rect(44, y, 507, 27).fill('#F2F6F8');
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(NAVY)
            .text('Description', 54, y + 9, { width: 242 });
          doc.text('Qty', 306, y + 9, { width: 35, align: 'right' });
          doc.text('Unit price', 347, y + 9, { width: 95, align: 'right' });
          doc.text('Amount', 447, y + 9, { width: 94, align: 'right' });
          y += template.layout === 'COMPACT' ? 32 : 38;
        };
        if (y > 600) {
          doc.addPage();
          y = 48;
        }
        tableHeader();
        for (const item of invoice.snapshot.items) {
          const height = Math.max(
            template.layout === 'COMPACT' ? 24 : 30,
            doc.heightOfString(item.description, { width: 242 }) + 15,
          );
          if (y + height > 690) {
            doc.addPage();
            y = 48;
            tableHeader();
          }
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(NAVY)
            .text(item.description, 54, y, { width: 242 });
          doc.text(String(item.quantity), 306, y, {
            width: 35,
            align: 'right',
          });
          doc.text(
            invoiceMoney(item.unitAmountMinor, invoice.currency),
            347,
            y,
            { width: 95, align: 'right' },
          );
          doc.text(invoiceMoney(item.amountMinor, invoice.currency), 447, y, {
            width: 94,
            align: 'right',
          });
          y += height;
          line(y);
          y += 12;
        }
        if (y > 550) {
          doc.addPage();
          y = 48;
        }
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text(
            `Total: ${invoiceMoney(invoice.amountMinor, invoice.currency)}`,
            250,
            y + 8,
            { width: 301, align: 'right' },
          );
        doc
          .fillColor(accent)
          .text(
            `Balance due: ${invoiceMoney(
              invoice.status === 'PAID' || invoice.status === 'VOID'
                ? 0
                : invoice.amountMinor,
              invoice.currency,
            )}`,
            250,
            y + 32,
            { width: 301, align: 'right' },
          );
        y += 73;
        doc.font('Helvetica').fontSize(9).fillColor(MUTED);
        if (invoice.paidAt) {
          doc.text(
            `${
              invoice.historical ? 'Payment recorded' : 'Payment confirmed'
            }: ${date(invoice.paidAt)}`,
            44,
            y,
          );
          y = doc.y + 8;
        }
        if (invoice.paymentReference) {
          doc.text(`Payment reference: ${invoice.paymentReference}`, 44, y);
          y = doc.y + 12;
        }
        if (invoice.historical) {
          doc.text(
            'Historical payment invoice. Issued on the date above; payment date is recorded separately.',
            44,
            y,
            { width: 507 },
          );
          y = doc.y + 12;
        }
        doc.text(invoice.snapshot.note, 44, y, { width: 507, lineGap: 3 });
        doc
          .moveDown()
          .text(
            'Standard commercial invoice. No GST calculation is included.',
            { width: 507 },
          );
        if (invoice.mode === 'TEST')
          doc
            .moveDown()
            .font('Helvetica-Bold')
            .text(
              'Test payment only. This document does not represent a live payment.',
            );
        for (const text of [template.paymentNote, template.footer].filter(
          Boolean,
        )) {
          doc.font('Helvetica').fontSize(9).fillColor(MUTED);
          if (doc.y + doc.heightOfString(text, { width: 507 }) + 18 > 790)
            doc.addPage();
          doc.moveDown().text(text, 44, doc.y + 6, { width: 507, lineGap: 3 });
        }
        doc.end();
      } catch (error) {
        doc.destroy();
        reject(error);
      }
    });
  }
}
