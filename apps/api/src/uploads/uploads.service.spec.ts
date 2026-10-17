import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('UploadsService local storage URLs', () => {
  const file = {
    buffer: Buffer.from('image'),
    mimetype: 'image/png',
    size: 5,
    originalname: 'logo.png',
  };

  it('uses the public frontend origin for uploaded images', async () => {
    const service = new UploadsService(
      new ConfigService({ FRONTEND_URL: 'https://crm.gromoze.com' }),
    );
    const uploaded = await service.uploadImage(file, 'admin');
    expect(uploaded.url).toMatch(
      /^https:\/\/crm\.gromoze\.com\/uploads\/admin-\d+\.png$/,
    );
  });

  it('uses the same public URL for files without retaining a frontend path', async () => {
    const service = new UploadsService(
      new ConfigService({ FRONTEND_URL: 'https://crm.gromoze.com/login' }),
    );
    const uploaded = await service.uploadFile(
      file.buffer,
      'brochure.pdf',
      'application/pdf',
    );
    expect(uploaded.url).toMatch(
      /^https:\/\/crm\.gromoze\.com\/uploads\/system-\d+\.pdf$/,
    );
  });

  it('preserves the direct local API URL when no public origin is configured', async () => {
    const service = new UploadsService(new ConfigService({ PORT: '5003' }));
    const uploaded = await service.uploadImage(file);
    expect(uploaded.url).toMatch(
      /^http:\/\/localhost:5003\/uploads\/system-\d+\.png$/,
    );
  });
});
