import { PrismaClient, type Role } from '@prisma/client';
import {
  ACCESS_MODULE_KEYS,
  PAGE_PARENT_MODULE_MAP,
} from './access.constants';

export interface ReconciliationReport {
  dryRun: boolean;
  templatesChecked: number;
  templateRepairs: Array<{
    role: Role;
    pageKey: string;
    parentModuleKey: string;
    action: 'ENABLE_VIEW' | 'CREATE_PARENT';
  }>;
  usersChecked: number;
  userRepairs: Array<{
    userId: string;
    pageKey: string;
    parentModuleKey: string;
    action: 'ENABLE_VIEW' | 'CREATE_PARENT';
  }>;
  totalRepairs: number;
}

export async function reconcileAccessPermissions(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {},
): Promise<ReconciliationReport> {
  const dryRun = options.dryRun ?? false;
  const report: ReconciliationReport = {
    dryRun,
    templatesChecked: 0,
    templateRepairs: [],
    usersChecked: 0,
    userRepairs: [],
    totalRepairs: 0,
  };

  // 1. Reconcile Role Templates (AccessTemplate)
  const templates = await prisma.accessTemplate.findMany({
    select: {
      id: true,
      role: true,
      moduleKey: true,
      canView: true,
    },
    orderBy: [{ role: 'asc' }, { moduleKey: 'asc' }],
  });

  const templatesByRole = new Map<Role, Map<string, typeof templates[0]>>();
  for (const row of templates) {
    if (!templatesByRole.has(row.role)) {
      templatesByRole.set(row.role, new Map());
    }
    templatesByRole.get(row.role)!.set(row.moduleKey, row);
  }

  report.templatesChecked = templatesByRole.size;

  for (const [role, moduleMap] of templatesByRole.entries()) {
    for (const [moduleKey, permRow] of moduleMap.entries()) {
      if (permRow.canView && moduleKey.startsWith('page.')) {
        const parentKey = PAGE_PARENT_MODULE_MAP[moduleKey];
        if (!parentKey || !ACCESS_MODULE_KEYS.has(parentKey)) continue;

        const parentRow = moduleMap.get(parentKey);
        if (!parentRow) {
          report.templateRepairs.push({
            role,
            pageKey: moduleKey,
            parentModuleKey: parentKey,
            action: 'CREATE_PARENT',
          });
          if (!dryRun) {
            await prisma.accessTemplate.create({
              data: {
                role,
                moduleKey: parentKey,
                canView: true,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
                canPunchIn: false,
                canPunchOut: false,
                isSystemDefault: false,
              },
            });
            // Track in local map for subsequent iterations
            moduleMap.set(parentKey, {
              id: 'temp',
              role,
              moduleKey: parentKey,
              canView: true,
            });
          }
        } else if (!parentRow.canView) {
          report.templateRepairs.push({
            role,
            pageKey: moduleKey,
            parentModuleKey: parentKey,
            action: 'ENABLE_VIEW',
          });
          if (!dryRun) {
            await prisma.accessTemplate.update({
              where: { id: parentRow.id },
              data: { canView: true },
            });
            parentRow.canView = true;
          }
        }
      }
    }
  }

  // 2. Reconcile User Module Permissions (UserModulePermission)
  const userPermissions = await prisma.userModulePermission.findMany({
    select: {
      id: true,
      userId: true,
      moduleKey: true,
      canView: true,
      updatedById: true,
    },
    orderBy: [{ userId: 'asc' }, { moduleKey: 'asc' }],
  });

  const userPermissionsByUser = new Map<string, Map<string, typeof userPermissions[0]>>();
  for (const row of userPermissions) {
    if (!userPermissionsByUser.has(row.userId)) {
      userPermissionsByUser.set(row.userId, new Map());
    }
    userPermissionsByUser.get(row.userId)!.set(row.moduleKey, row);
  }

  report.usersChecked = userPermissionsByUser.size;

  for (const [userId, moduleMap] of userPermissionsByUser.entries()) {
    for (const [moduleKey, permRow] of moduleMap.entries()) {
      if (permRow.canView && moduleKey.startsWith('page.')) {
        const parentKey = PAGE_PARENT_MODULE_MAP[moduleKey];
        if (!parentKey || !ACCESS_MODULE_KEYS.has(parentKey)) continue;

        const parentRow = moduleMap.get(parentKey);
        if (!parentRow) {
          report.userRepairs.push({
            userId,
            pageKey: moduleKey,
            parentModuleKey: parentKey,
            action: 'CREATE_PARENT',
          });
          if (!dryRun) {
            await prisma.userModulePermission.create({
              data: {
                userId,
                moduleKey: parentKey,
                canView: true,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
                canPunchIn: false,
                canPunchOut: false,
                updatedById: permRow.updatedById ?? userId,
              },
            });
            moduleMap.set(parentKey, {
              id: 'temp',
              userId,
              moduleKey: parentKey,
              canView: true,
              updatedById: permRow.updatedById ?? userId,
            });
          }
        } else if (!parentRow.canView) {
          report.userRepairs.push({
            userId,
            pageKey: moduleKey,
            parentModuleKey: parentKey,
            action: 'ENABLE_VIEW',
          });
          if (!dryRun) {
            await prisma.userModulePermission.update({
              where: { id: parentRow.id },
              data: { canView: true },
            });
            parentRow.canView = true;
          }
        }
      }
    }
  }

  report.totalRepairs =
    report.templateRepairs.length + report.userRepairs.length;

  return report;
}

if (require.main === module) {
  const isDryRun =
    process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const prisma = new PrismaClient();

  reconcileAccessPermissions(prisma, { dryRun: isDryRun })
    .then((report) => {
      console.log('--- Permission Reconciliation Report ---');
      console.log(`Dry run: ${report.dryRun ? 'YES' : 'NO'}`);
      console.log(`Roles checked: ${report.templatesChecked}`);
      console.log(`Template repairs: ${report.templateRepairs.length}`);
      console.log(`Users checked: ${report.usersChecked}`);
      console.log(`User repairs: ${report.userRepairs.length}`);
      console.log(`Total repairs needed: ${report.totalRepairs}`);
      if (report.totalRepairs > 0) {
        console.log('Repairs details:', {
          templateRepairs: report.templateRepairs,
          userRepairs: report.userRepairs,
        });
      }
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error('Reconciliation failed:', err);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}
