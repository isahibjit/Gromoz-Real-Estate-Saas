import { Test } from '@nestjs/testing';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('CrmService.getLeadImportStats', () => {
  it('counts routed connector leads by their originating integration', async () => {
    const db = {
      leadMasterValue: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'magic-source', name: 'MagicBricks', code: 'MAGICBRICKS' },
          { id: 'website-source', name: 'Website', code: 'WEBSITE' },
          { id: 'meta-source', name: 'Meta Ads', code: 'META_ADS' },
          { id: 'housing-source', name: 'Housing.com', code: 'HOUSING' },
          { id: 'google-source', name: 'Google Ads', code: 'GOOGLE_ADS' },
          { id: 'acres-source', name: '99Acres', code: '99ACRES' },
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: 'new-status' }),
      },
      lead: {
        groupBy: jest.fn().mockResolvedValue([
          { sourceId: 'magic-source', _count: { _all: 100 } },
          { sourceId: 'website-source', _count: { _all: 0 } },
          { sourceId: 'meta-source', _count: { _all: 1 } },
          { sourceId: 'housing-source', _count: { _all: 0 } },
          { sourceId: 'google-source', _count: { _all: 8 } },
          { sourceId: 'acres-source', _count: { _all: 1 } },
        ]),
        count: jest.fn().mockResolvedValue(110),
      },
      leadImport: { count: jest.fn().mockResolvedValue(3) },
      portalIntegration: { findMany: jest.fn().mockResolvedValue([]) },
      leadSourceConnection: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([
        { action: 'MAGICBRICKS_LEAD_RECEIVED', count: 12 },
        { action: 'WEBSITE_LEAD_RECEIVED', count: 7 },
        { action: 'META_LEAD_RECEIVED', count: 4 },
        { action: 'HOUSING_LEAD_RECEIVED', count: 2 },
      ]),
    };
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        ...referenceTenantProviders(),
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
      ],
    }).compile();
    const service = module.get(CrmService);

    const stats = await service.getLeadImportStats();

    expect(stats.sourceCounts).toMatchObject({
      magicbricks: 12,
      website: 7,
      meta: 4,
      housing: 2,
      google: 8,
      '99acres': 1,
    });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const [query, leadTenant, auditTenant] = db.$queryRaw.mock.calls[0];
    expect(query.join('?')).toContain('lead."organizationId" = ?');
    expect(query.join('?')).toContain('audit."organizationId" = ?');
    expect([leadTenant, auditTenant]).toEqual(['tenant-a', 'tenant-a']);
  });

  it('does not show source-assigned leads as connector captures when no capture audit exists', async () => {
    const db = {
      leadMasterValue: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'magic-source', name: 'MagicBricks', code: 'MAGICBRICKS' },
          ]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      lead: {
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { sourceId: 'magic-source', _count: { _all: 9 } },
          ]),
        count: jest.fn().mockResolvedValue(9),
      },
      leadImport: { count: jest.fn().mockResolvedValue(0) },
      portalIntegration: { findMany: jest.fn().mockResolvedValue([]) },
      leadSourceConnection: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        ...referenceTenantProviders(),
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
      ],
    }).compile();
    const service = module.get(CrmService);

    const stats = await service.getLeadImportStats();

    expect(stats.sourceCounts.magicbricks).toBe(0);
  });
});
