import { BadRequestException } from '@nestjs/common';

export type InvoiceTemplate = {
  layout: 'CLASSIC' | 'COMPACT';
  logoMode: 'DEFAULT' | 'CUSTOM' | 'NONE';
  logoDataUrl: string;
  accentColor: string;
  heading: string;
  paymentNote: string;
  footer: string;
};
export const DEFAULT_INVOICE_TEMPLATE: Readonly<InvoiceTemplate> = {
  layout: 'CLASSIC',
  logoMode: 'DEFAULT',
  logoDataUrl: '',
  accentColor: '#007C7B',
  heading: 'Invoice',
  paymentNote: '',
  footer: '',
};
export const INVOICE_LOGO_MAX_BYTES = 256 * 1024;

export function invoiceLogoBuffer(dataUrl: string): Buffer {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    dataUrl,
  );
  if (!match || dataUrl.length > 350000)
    throw new BadRequestException('Upload a PNG or JPEG logo up to 256 KB');
  const buffer = Buffer.from(match[2], 'base64');
  if (
    buffer.length > INVOICE_LOGO_MAX_BYTES ||
    buffer.toString('base64') !== match[2]
  )
    throw new BadRequestException('Invalid invoice logo');
  let width = 0,
    height = 0;
  if (
    match[1] === 'png' &&
    buffer.length >= 33 &&
    buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
    buffer.toString('ascii', 12, 16) === 'IHDR'
  ) {
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (
    match[1] === 'jpeg' &&
    buffer.length >= 4 &&
    buffer.readUInt16BE(0) === 0xffd8
  ) {
    let offset = 2;
    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1],
        length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        break;
      }
      offset += 2 + length;
    }
  }
  if (width < 1 || height < 1 || width > 2048 || height > 2048)
    throw new BadRequestException(
      'Use a valid PNG or JPEG logo up to 2048 × 2048 pixels',
    );
  return buffer;
}

export function readInvoiceTemplate(value: unknown): InvoiceTemplate {
  if (value === undefined || value === null)
    return { ...DEFAULT_INVOICE_TEMPLATE };
  if (typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Invalid invoice template');
  const fields = Object.keys(DEFAULT_INVOICE_TEMPLATE);
  if (Object.keys(value).some((key) => !fields.includes(key)))
    throw new BadRequestException('Unknown invoice template field');
  const template = { ...DEFAULT_INVOICE_TEMPLATE, ...value };
  if (
    !['CLASSIC', 'COMPACT'].includes(template.layout) ||
    !['DEFAULT', 'CUSTOM', 'NONE'].includes(template.logoMode) ||
    !/^#[0-9a-f]{6}$/i.test(template.accentColor)
  )
    throw new BadRequestException(
      'Invalid invoice layout, logo option or accent color',
    );
  for (const [key, max] of [
    ['heading', 40],
    ['paymentNote', 600],
    ['footer', 240],
  ] as const) {
    if (
      typeof template[key] !== 'string' ||
      template[key].length > max ||
      /[\x00-\x08\x0b-\x1f]/.test(template[key])
    )
      throw new BadRequestException(`Invalid invoice ${key}`);
    template[key] = template[key].trim();
  }
  if (!template.heading)
    throw new BadRequestException('Invoice heading is required');
  if (/[\r\n]/.test(template.heading))
    throw new BadRequestException('Keep the invoice heading on one line');
  const channels = [
    template.accentColor.slice(1, 3),
    template.accentColor.slice(3, 5),
    template.accentColor.slice(5, 7),
  ].map((hex) => {
    const value = parseInt(hex, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  if (
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    0.183
  )
    throw new BadRequestException(
      'Choose a darker accent color so invoice text remains readable on white',
    );
  if (template.logoMode === 'CUSTOM') {
    if (typeof template.logoDataUrl !== 'string')
      throw new BadRequestException(
        'Upload a logo before selecting custom branding',
      );
    invoiceLogoBuffer(template.logoDataUrl);
  } else template.logoDataUrl = '';
  return template;
}
