import { TenantAccessService } from '../src/common/tenant/tenant-access.service';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';
import { TenantNotificationService } from '../src/crm/notifications/tenant-notification.service';
import { WhatsAppDispatchService } from '../src/crm/notifications/whatsapp-dispatch.service';

// Reference tests use unowned legacy leads. Tenant-specific tests provide their own scopes.
export const referenceTenantProviders = (organizationId = 'tenant-a') => [
  {
    provide: TenantAccessService,
    useValue: {
      organizationId,
      selectedOrganizationId: undefined,
      employeeWhere: () => ({}),
      assertEmployee: jest.fn(),
      assertEmployees: jest.fn(),
      assertTeams: jest.fn(),
    },
  },
  {
    provide: TenantContextService,
    useValue: {
      getTenantId: () => organizationId,
      getTenant: () => ({ organizationId, role: 'ADMIN' }),
    },
  },
  {
    provide: TenantNotificationService,
    useValue: {
      isChannelEnabled: jest.fn().mockResolvedValue(false),
    },
  },
  {
    provide: WhatsAppDispatchService,
    useValue: { enqueueWithClient: jest.fn() },
  },
];
