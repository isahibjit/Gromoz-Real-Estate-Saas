import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ServiceUnavailableException } from '@nestjs/common';
import { OrganizationService } from './organization.service';

describe('public commercial plans', () => {
  const originalDirectory = process.cwd();
  let directory: string;
  let service: OrganizationService;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gromoze-plans-'));
    process.chdir(directory);
    service = Object.create(
      OrganizationService.prototype,
    ) as OrganizationService;
  });

  afterEach(() => {
    process.chdir(originalDirectory);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('returns only public pricing for active plans and honors billing options', async () => {
    fs.mkdirSync('storage');
    fs.writeFileSync(
      'storage/commercial_plans.json',
      JSON.stringify([
        {
          name: 'Growth',
          status: 'Active',
          description: 'For teams',
          secret: 'internal',
          pricing: {
            model: 'Per User',
            currency: 'INR',
            monthlyPricePerSeat: 0,
            annualPricePerSeat: 400,
            setupFee: 100,
            allowMonthlyBilling: true,
            allowAnnualBilling: false,
            secret: 'private',
          },
        },
        {
          name: 'Draft',
          status: 'Draft',
          pricing: { model: 'Per User', currency: 'INR' },
        },
        {
          name: 'Archived',
          status: 'Archived',
          pricing: { model: 'Per User', currency: 'INR' },
        },
      ]),
    );
    await expect(service.getPublicCommercialPlans()).resolves.toEqual([
      {
        name: 'Growth',
        description: 'For teams',
        model: 'Per User',
        currency: 'INR',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        setupFee: 100,
      },
    ]);
  });

  it('does not create or publish default plans when the file is missing', async () => {
    await expect(service.getPublicCommercialPlans()).resolves.toEqual([]);
    expect(fs.existsSync('storage/commercial_plans.json')).toBe(false);
  });

  it('reports invalid stored data instead of publishing fallback prices', async () => {
    fs.mkdirSync('storage');
    fs.writeFileSync('storage/commercial_plans.json', '{');
    await expect(service.getPublicCommercialPlans()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
