import {
  ArgumentMetadata,
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PermissionGuard } from '../access/permission.guard';
import { AccessService } from '../access/access.service';
import { BillingService } from '../billing/billing.service';
import { PERMISSION_METADATA_KEY } from '../common/decorators/require-permission.decorator';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { OrganizationController } from './organization.controller';
import {
  OrganizationService,
  UpdateWorkspaceSettingsDto,
} from './organization.service';

describe('Workspace settings updates', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateWorkspaceSettingsDto,
  };
  const prisma = { organization: { findUnique: jest.fn(), update: jest.fn() } };
  let service: OrganizationService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingService, useValue: {} },
        { provide: EmailConnectorsService, useValue: {} },
      ],
    }).compile();
    service = module.get(OrganizationService);
  });

  it('accepts a boolean login alert preference and rejects strings', async () => {
    await expect(pipe.transform({ preferences: { loginAlertsEnabled: false } }, metadata)).resolves.toMatchObject({ preferences: { loginAlertsEnabled: false } });
    await expect(pipe.transform({ preferences: { loginAlertsEnabled: 'false' } }, metadata)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('preserves other preferences when changing login alerts', async () => {
    const org = { id: 'tenant-a', name: 'Cedar', slug: 'cedar', workspaceSettingsJson: { preferences: { compactTable: true } } };
    prisma.organization.findUnique.mockResolvedValue(org); prisma.organization.update.mockResolvedValue(org);
    await service.updateWorkspaceSettings('tenant-a', { preferences: { loginAlertsEnabled: false } });
    expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ workspaceSettingsJson: { preferences: { compactTable: true, loginAlertsEnabled: false } } }) }));
  });

  it('accepts the CMS and workspace profile fields with the production validation pipe', async () => {
    const payload = {
      companyName: 'Cedar Realty',
      industry: '',
      website: '',
      primaryEmail: '',
      primaryPhone: '',
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      address1: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      logoUrl: '',
      collapsedLogoUrl: '',
      showLogoInSidebar: true,
      showLogoInLogin: true,
      sidebarLogoHeight: 40,
      sidebarLogoObjectFit: 'contain',
      sidebarLogoBg: 'transparent',
      sidebarLogoRadius: 6,
      sidebarLogoAlign: 'left',
      sidebarHeaderBg: 'transparent',
      subdomain: 'cedar',
      customDomain: '',
      localization: {},
      preferences: {},
      security: {},
      loginCms: { heroHeadlineHighlight: 'Cedar portal' },
    };
    await expect(pipe.transform(payload, metadata)).resolves.toMatchObject(
      payload,
    );
  });

  it.each([
    { customDomainVerified: true },
    { unknownSetting: 'value' },
    { loginCms: [] },
    { preferences: [] },
    { preferences: { loginAlertsEnabled: null } },
    { sidebarLogoHeight: 'large' },
    { sidebarLogoAlign: 'invalid' },
  ])('rejects unsupported or invalid settings: %o', async (payload) => {
    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('saves the CMS without changing other workspace settings or domain verification', async () => {
    const org = {
      id: 'tenant-a',
      name: 'Cedar',
      slug: 'cedar',
      customDomain: 'cedar.example.com',
      customDomainVerified: true,
      workspaceSettingsJson: {
        security: { enforce2FA: true },
        preferences: { compactTable: true },
      },
    };
    prisma.organization.findUnique.mockResolvedValue(org);
    prisma.organization.update.mockResolvedValue(org);
    const loginCms = { heroHeadlineHighlight: 'Cedar portal' };
    await service.updateWorkspaceSettings('tenant-a', { loginCms });
    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-a' },
        data: expect.objectContaining({
          customDomain: 'cedar.example.com',
          customDomainVerified: true,
          workspaceSettingsJson: { ...org.workspaceSettingsJson, loginCms },
        }),
      }),
    );
  });

  it('persists sidebar branding alongside existing settings', async () => {
    const org = {
      id: 'tenant-a',
      name: 'Cedar',
      slug: 'cedar',
      customDomain: null,
      customDomainVerified: false,
      createdAt: new Date('2026-01-01'),
      workspaceSettingsJson: {
        loginCms: { cardTitle: 'Welcome' },
        sidebarBranding: { sidebarLogoBg: '#ffffff' },
      },
    };
    prisma.organization.findUnique.mockResolvedValue(org);
    prisma.organization.update.mockResolvedValue(org);
    await service.updateWorkspaceSettings('tenant-a', {
      sidebarLogoAlign: 'center',
    });
    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceSettingsJson: {
            loginCms: { cardTitle: 'Welcome' },
            sidebarBranding: {
              sidebarLogoBg: '#ffffff',
              sidebarLogoAlign: 'center',
            },
          },
        }),
      }),
    );
    await expect(
      service.getWorkspaceSettings('tenant-a'),
    ).resolves.toMatchObject({ profile: { sidebarLogoBg: '#ffffff' } });
  });

  it('requires workspace settings update permission before allowing changes', async () => {
    const handler = OrganizationController.prototype.updateWorkspaceSettings;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      PermissionGuard,
    );
    expect(Reflect.getMetadata(PERMISSION_METADATA_KEY, handler)).toEqual({
      moduleKey: 'hr_settings',
      action: 'update',
    });
    const access = { hasPermission: jest.fn().mockResolvedValue(false) };
    const guard = new PermissionGuard(
      new Reflector(),
      access as unknown as AccessService,
    );
    const context = {
      getHandler: () => handler,
      getClass: () => OrganizationController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { sub: 'user-a', role: 'TELECALLER' },
          method: 'PATCH',
        }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(access.hasPermission).toHaveBeenCalledWith(
      { sub: 'user-a', role: 'TELECALLER' },
      'hr_settings',
      'update',
    );
    access.hasPermission.mockResolvedValue(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
