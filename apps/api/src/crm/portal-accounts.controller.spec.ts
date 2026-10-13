import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AccessService } from '../access/access.service';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { RedisService } from '../redis/redis.service';
import {
  MagicBricksIntegrationsController,
  Public99AcresWebhookController,
} from './crm.controllers';
import { CrmService } from './crm.service';

describe('Portal account route boundaries', () => {
  const access = { hasPermission: jest.fn() };
  const crm = { listMagicBricksAccounts: jest.fn() };
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'portal-route-test-only' })],
      controllers: [MagicBricksIntegrationsController],
      providers: [
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
    crm.listMagicBricksAccounts.mockResolvedValue({ data: { accounts: [] } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers account management only on the authenticated MagicBricks controller', () => {
    expect(
      Reflect.has(MagicBricksIntegrationsController.prototype, 'listAccounts'),
    ).toBe(true);
    expect(
      Reflect.has(Public99AcresWebhookController.prototype, 'listAccounts'),
    ).toBe(false);
    expect(
      Reflect.has(Public99AcresWebhookController.prototype, 'createAccount'),
    ).toBe(false);
  });

  it('rejects unauthenticated account reads', async () => {
    await request(app.getHttpServer())
      .get('/integrations/magicbricks/accounts')
      .expect(401);
    expect(crm.listMagicBricksAccounts).not.toHaveBeenCalled();
  });

  it('requires leads view permission on the account list', async () => {
    const token = jwt.sign({ sub: 'admin', role: 'ADMIN', permissions: [] });
    access.hasPermission.mockResolvedValue(false);
    await request(app.getHttpServer())
      .get('/integrations/magicbricks/accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(crm.listMagicBricksAccounts).not.toHaveBeenCalled();
  });

  it('serves the account list through the guarded route', async () => {
    const token = jwt.sign({ sub: 'admin', role: 'ADMIN', permissions: [] });
    await request(app.getHttpServer())
      .get('/integrations/magicbricks/accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(crm.listMagicBricksAccounts).toHaveBeenCalledWith(false);
    expect(access.hasPermission).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' }),
      'leads',
      'view',
    );
  });
});
