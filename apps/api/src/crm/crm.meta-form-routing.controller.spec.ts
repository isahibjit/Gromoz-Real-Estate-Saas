import { TenantGuard } from '../common/tenant/tenant.guard';
import type { ExecutionContext } from '@nestjs/common';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MetaIntegrationsController } from './crm.controllers';
import { CrmService } from './crm.service';
import {
  AccessService,
  normalizeHierarchicalPermissions,
} from '../access/access.service';
import { RedisService } from '../redis/redis.service';

describe('Meta form routing HTTP authorization', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const access = { hasPermission: jest.fn().mockResolvedValue(true) };
  const crm = {
    getMetaIntegration: jest.fn().mockResolvedValue({ data: { pages: [] } }),
    listMetaLeadForms: jest.fn().mockResolvedValue({ data: [] }),
    listMetaDeliveryLogs: jest.fn().mockResolvedValue({ data: [] }),
    saveMetaPageForms: jest.fn().mockResolvedValue({ data: {} }),
    saveMetaFormRouting: jest.fn().mockResolvedValue({
      data: { formRoutingOverrides: { page: { form: { sourceId: null } } } },
    }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'meta-form-routing-test-only' })],
      controllers: [MetaIntegrationsController],
      providers: [
        ...referenceTenantProviders(),
        { provide: CrmService, useValue: crm },
        { provide: AccessService, useValue: access },
        {
          provide: RedisService,
          useValue: { get: jest.fn().mockResolvedValue(null) },
        },
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          req.tenant = {
            organizationId: 'tenant-a',
            userId: req.user.sub,
            role: req.user.role,
          };
          return true;
        },
      })
      .compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    access.hasPermission.mockResolvedValue(true);
  });
  afterAll(async () => {
    await app.close();
  });
  const endpoint = '/integrations/meta/pages/page/forms/form/routing';

  it.each(['MANAGER', 'TEAM_LEADER'])(
    'allows %s to load Meta setup, forms, and delivery logs with leads view permission',
    async (role) => {
      const token = jwt.sign({ sub: 'import-manager', role });
      for (const path of [
        '/integrations/meta',
        '/integrations/meta/forms?pageId=page',
        '/integrations/meta/delivery-logs',
      ]) {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      }
      expect(access.hasPermission).toHaveBeenCalledTimes(3);
      expect(access.hasPermission).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
        'leads',
        'view',
      );
      expect(crm.getMetaIntegration).toHaveBeenCalledWith('import-manager');
    },
  );

  it.each(['MANAGER', 'TEAM_LEADER'])(
    'allows %s to save page and form routing only with leads update permission',
    async (role) => {
      const token = jwt.sign({ sub: 'import-manager', role });
      await request(app.getHttpServer())
        .patch('/integrations/meta/pages/page/forms')
        .set('Authorization', `Bearer ${token}`)
        .send({ formIds: ['form'] })
        .expect(200);
      await request(app.getHttpServer())
        .patch(endpoint)
        .set('Authorization', `Bearer ${token}`)
        .send({ sourceId: null })
        .expect(200);
      expect(access.hasPermission).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
        'leads',
        'update',
      );
      expect(crm.saveMetaFormRouting).toHaveBeenCalledWith(
        'page',
        'form',
        { sourceId: null },
        'import-manager',
      );
    },
  );

  it.each(['MANAGER', 'TEAM_LEADER'])(
    'denies %s Meta setup when leads view permission is missing',
    async (role) => {
      access.hasPermission.mockResolvedValue(false);
      const token = jwt.sign({ sub: 'import-manager', role });
      await request(app.getHttpServer())
        .get('/integrations/meta')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(crm.getMetaIntegration).not.toHaveBeenCalled();
    },
  );

  it.each(['MANAGER', 'TEAM_LEADER'])(
    'lets %s Import Leads visibility load setup without granting routing writes',
    async (role) => {
      const permissions = normalizeHierarchicalPermissions([
        {
          moduleKey: 'page.import_leads',
          canView: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPunchIn: false,
          canPunchOut: false,
        },
      ]);
      access.hasPermission.mockImplementation(
        (_user: unknown, moduleKey: string, action: string) =>
          Promise.resolve(
            action === 'view' &&
              permissions.some(
                (permission) =>
                  permission.moduleKey === moduleKey && permission.canView,
              ),
          ),
      );
      const token = jwt.sign({ sub: 'import-manager', role });
      await request(app.getHttpServer())
        .get('/integrations/meta')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(endpoint)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
      expect(crm.saveMetaFormRouting).not.toHaveBeenCalled();
    },
  );

  it.each([
    'getConfig',
    'saveConfig',
    'regenerateVerifyToken',
    'saveFieldMapping',
    'startOAuth',
    'listForms',
    'deliveryLogs',
    'addManualPage',
    'toggleAccountPause',
    'togglePagePause',
    'toggleFormPause',
    'savePageForms',
    'disconnectAccount',
    'saveFormRouting',
  ] as const)('allows both management roles consistently on %s', (method) => {
    expect(
      Reflect.getMetadata(
        'roles',
        MetaIntegrationsController.prototype[method],
      ),
    ).toEqual(expect.arrayContaining(['MANAGER', 'TEAM_LEADER']));
  });

  it('returns 200 for an authenticated allowed role with leads update permission', async () => {
    const token = jwt.sign({ sub: 'admin', role: 'ADMIN' });
    const response = await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceId: null })
      .expect(200);
    expect(response.body.data.formRoutingOverrides.page.form).toEqual({
      sourceId: null,
    });
    expect(crm.saveMetaFormRouting).toHaveBeenCalledWith(
      'page',
      'form',
      { sourceId: null },
      'admin',
    );
    expect(access.hasPermission).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'admin' }),
      'leads',
      'update',
    );
  });

  it('returns 401 without authentication and performs no save', async () => {
    await request(app.getHttpServer()).patch(endpoint).send({}).expect(401);
    expect(crm.saveMetaFormRouting).not.toHaveBeenCalled();
  });

  it('returns 403 for roles excluded from existing Meta configuration access', async () => {
    const token = jwt.sign({ sub: 'telecaller', role: 'TELECALLER' });
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);
    expect(crm.saveMetaFormRouting).not.toHaveBeenCalled();
  });

  it('returns 403 when the allowed role lacks the update permission', async () => {
    access.hasPermission.mockResolvedValue(false);
    const token = jwt.sign({ sub: 'marketing', role: 'MARKETING' });
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);
    expect(crm.saveMetaFormRouting).not.toHaveBeenCalled();
  });
});
