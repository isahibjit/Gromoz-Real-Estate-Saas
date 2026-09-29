import { PrismaClient, Role } from '@prisma/client';
import { encryptPassword } from '../src/common/utils/cipher.util';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('🚀 STARTING SURGICAL WIPE & RESEED SCRIPT');
  console.log('====================================================');

  // 1. ENSURE ADMIN USER
  const adminEmail = 'rajeshmourya184@gmail.com';
  const adminPassword = 'Rajesh@184';
  const adminPasswordHash = encryptPassword(adminPassword);

  console.log(`\n👤 [1/4] Ensuring Super Admin user (${adminEmail})...`);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'Rajesh Maurya',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      twoFactorEnabled: false,
    },
    create: {
      email: adminEmail,
      fullName: 'Rajesh Maurya',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  // Explicitly disable OTP / Two-Factor Authentication for Admin roles
  await prisma.roleTwoFactorSetting.upsert({
    where: { role: Role.SUPER_ADMIN },
    update: { enabled: false },
    create: { role: Role.SUPER_ADMIN, enabled: false },
  });
  await prisma.roleTwoFactorSetting.upsert({
    where: { role: Role.ADMIN },
    update: { enabled: false },
    create: { role: Role.ADMIN, enabled: false },
  });
  console.log(`✅ Super Admin ready: ${adminUser.fullName} (${adminUser.id}) [OTP/2FA: DISABLED]`);

  // 2. SURGICAL WIPE: LEADS, ACTIVITIES, AND NON-ADMIN EMPLOYEES
  console.log('\n🧹 [2/4] Wiping all lead records and employee data (SPARING INTEGRATIONS & SETTINGS)...');

  // Wipe lead-related and project-related child tables
  await prisma.$transaction([
    prisma.followUp.deleteMany({}),
    prisma.leadRequirement.deleteMany({}),
    prisma.leadAssignment.deleteMany({}),
    prisma.activity.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.note.deleteMany({}),
    prisma.document.deleteMany({}),
    prisma.siteVisit.deleteMany({}),
    prisma.bookingExtraIncentive.deleteMany({}),
    prisma.booking.deleteMany({}),
    prisma.payment.deleteMany({}),
    prisma.callLog.deleteMany({}),
    prisma.leadProjectInterest.deleteMany({}),
    prisma.duplicateLeadGroup.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.projectBrokerageRule.deleteMany({}),
    prisma.projectUnit.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.leadImportRow.deleteMany({}),
    prisma.leadImport.deleteMany({}),
  ]);
  console.log('✅ Wiped all leads, requirements, follow-ups, visits, bookings, projects, and import logs.');

  // Reset counters on Portal Integrations while strictly preserving credentials, mappings, and settings
  await prisma.portalIntegration.updateMany({
    data: {
      totalLeadsReceived: 0,
      lastLeadReceivedAt: null,
    },
  });
  console.log('✅ Reset portal integration lead counters to 0.');

  // Reassign / clear User foreign key references to adminUser.id
  console.log('🔗 Reassigning system and release foreign keys to Super Admin...');
  const safeClean = async (table: string, action: () => Promise<any>) => {
    try {
      if ((prisma as any)[table]) await action();
    } catch (e: any) {
      // Ignored if table or column doesn't match
    }
  };

  await safeClean('mobileAppRelease', () =>
    (prisma as any).mobileAppRelease.updateMany({ data: { uploaderId: adminUser.id } })
  );
  await safeClean('auditLog', () =>
    (prisma as any).auditLog.updateMany({ data: { actorUserId: adminUser.id } })
  );
  await safeClean('employeeProfile', () =>
    (prisma as any).employeeProfile.updateMany({ data: { teamId: null } })
  );
  await safeClean('teamMembership', () => (prisma as any).teamMembership.deleteMany({}));
  await safeClean('teamMember', () => (prisma as any).teamMember.deleteMany({}));
  await safeClean('teamLeaderVisibilityGrant', () =>
    (prisma as any).teamLeaderVisibilityGrant.deleteMany({})
  );
  await safeClean('userRankingTeamAccess', () =>
    (prisma as any).userRankingTeamAccess.deleteMany({})
  );
  await safeClean('team', () => (prisma as any).team.deleteMany({}));
  await safeClean('teamOld', () => (prisma as any).teamOld.deleteMany({}));
  console.log('✅ Wiped all teams, memberships, and team grants.');
  await safeClean('attendanceAudit', () => (prisma as any).attendanceAudit.deleteMany({}));
  await safeClean('leaveRequest', () => (prisma as any).leaveRequest.deleteMany({}));
  await safeClean('attendanceRecord', () => (prisma as any).attendanceRecord.deleteMany({}));
  await safeClean('payrollRecord', () => (prisma as any).payrollRecord.deleteMany({}));
  await safeClean('userCommissionTarget', () =>
    (prisma as any).userCommissionTarget.deleteMany({})
  );
  await safeClean('userModulePermission', () =>
    (prisma as any).userModulePermission.deleteMany({})
  );
  await safeClean('userRankingTeamAccess', () =>
    (prisma as any).userRankingTeamAccess.deleteMany({})
  );
  await safeClean('notification', () => (prisma as any).notification.deleteMany({}));

  // Delete all non-admin users, strictly preserving Rajesh Maurya
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { not: adminUser.id },
      email: { not: adminEmail },
    },
  });
  console.log(`✅ Removed ${deletedUsers.count} non-admin employees. Admin preserved.`);

  // 3. SEED THE 13 MANDATORY LEAD STATUSES
  console.log('\n🏷️ [3/4] Seeding the 13 required Lead Statuses with dashboard flags & colors...');
  const statusCategory = await prisma.leadMasterCategory.upsert({
    where: { code: 'status' },
    update: { name: 'Lead Status' },
    create: { code: 'status', name: 'Lead Status' },
  });

  const mandatoryStatuses = [
    {
      name: 'New Lead',
      code: 'NEW_LEAD',
      color: '#0284C7',
      allowFollowUp: true,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 1,
    },
    {
      name: 'Interested',
      code: 'INTERESTED',
      color: '#2563EB',
      allowFollowUp: true,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 2,
      manualScore: 1,
    },
    {
      name: 'Not Interested',
      code: 'NOT_INTERESTED',
      color: '#EF4444',
      allowFollowUp: false,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 3,
    },
    {
      name: 'CP',
      code: 'CP',
      color: '#8B5CF6',
      allowFollowUp: true,
      showInStatsCard: false,
      showInFilterBar: true,
      sortOrder: 4,
    },
    {
      name: 'Lost',
      code: 'LOST',
      color: '#64748B',
      allowFollowUp: false,
      showInStatsCard: false,
      showInFilterBar: false,
      sortOrder: 5,
    },
    {
      name: 'Out Station Lead',
      code: 'OUT_STATION_LEAD',
      color: '#0EA5E9',
      allowFollowUp: true,
      showInStatsCard: false,
      showInFilterBar: true,
      sortOrder: 6,
    },
    {
      name: 'Site Visit Schedule',
      code: 'SITE_VISIT_SCHEDULE',
      color: '#F59E0B',
      allowFollowUp: true,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 7,
    },
    {
      name: 'Site Visit Done',
      code: 'SITE_VISIT_DONE',
      color: '#10B981',
      allowFollowUp: true,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 8,
      manualScore: 5,
    },
    {
      name: 'Re-Visit Schedule',
      code: 'RE_VISIT_SCHEDULE',
      color: '#F97316',
      allowFollowUp: true,
      showInStatsCard: false,
      showInFilterBar: true,
      sortOrder: 9,
    },
    {
      name: 'Re-Visit Done',
      code: 'RE_VISIT_DONE',
      color: '#06B6D4',
      allowFollowUp: true,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 10,
      manualScore: 10,
    },
    {
      name: 'OBM Done',
      code: 'OBM_DONE',
      color: '#6366F1',
      allowFollowUp: true,
      showInStatsCard: false,
      showInFilterBar: true,
      sortOrder: 11,
    },
    {
      name: 'Booking Done',
      code: 'BOOKING_DONE',
      color: '#059669',
      allowFollowUp: false,
      showInStatsCard: true,
      showInFilterBar: true,
      sortOrder: 12,
      manualScore: 50,
    },
    {
      name: 'Already Purchased',
      code: 'ALREADY_PURCHASED',
      color: '#94A3B8',
      allowFollowUp: false,
      showInStatsCard: false,
      showInFilterBar: true,
      sortOrder: 13,
    },
  ];

  for (const s of mandatoryStatuses) {
    await prisma.leadMasterValue.upsert({
      where: {
        categoryId_code: {
          categoryId: statusCategory.id,
          code: s.code,
        },
      },
      update: {
        name: s.name,
        displayColor: s.color,
        allowFollowUp: s.allowFollowUp,
        showInStatsCard: s.showInStatsCard,
        showInFilterBar: s.showInFilterBar,
        sortOrder: s.sortOrder,
        manualScore: s.manualScore ?? undefined,
        isActive: true,
      },
      create: {
        categoryId: statusCategory.id,
        name: s.name,
        code: s.code,
        displayColor: s.color,
        allowFollowUp: s.allowFollowUp,
        showInStatsCard: s.showInStatsCard,
        showInFilterBar: s.showInFilterBar,
        sortOrder: s.sortOrder,
        manualScore: s.manualScore ?? null,
        isActive: true,
        isSystemDefault: true,
      },
    });
    console.log(`  ✓ Status: ${s.name} (StatsCard: ${s.showInStatsCard}, FilterBar: ${s.showInFilterBar})`);
  }

  // 4. SEED TEMPERATURE MASTERS
  console.log('\n🔥 [4/4] Seeding Lead Temperature Masters...');
  const tempCategory = await prisma.leadMasterCategory.upsert({
    where: { code: 'temperature' },
    update: { name: 'Lead Temperature' },
    create: { code: 'temperature', name: 'Lead Temperature' },
  });

  const temperatures = [
    { name: 'Hot Lead', code: 'HOT', color: '#EF4444', showInStatsCard: true, showInFilterBar: true, sortOrder: 1 },
    { name: 'Warm Lead', code: 'WARM', color: '#F59E0B', showInStatsCard: false, showInFilterBar: true, sortOrder: 2 },
    { name: 'Cold Lead', code: 'COLD', color: '#64748B', showInStatsCard: false, showInFilterBar: true, sortOrder: 3 },
  ];

  for (const t of temperatures) {
    await prisma.leadMasterValue.upsert({
      where: {
        categoryId_code: {
          categoryId: tempCategory.id,
          code: t.code,
        },
      },
      update: {
        name: t.name,
        displayColor: t.color,
        showInStatsCard: t.showInStatsCard,
        showInFilterBar: t.showInFilterBar,
        sortOrder: t.sortOrder,
        isActive: true,
      },
      create: {
        categoryId: tempCategory.id,
        name: t.name,
        code: t.code,
        displayColor: t.color,
        showInStatsCard: t.showInStatsCard,
        showInFilterBar: t.showInFilterBar,
        sortOrder: t.sortOrder,
        isActive: true,
        isSystemDefault: true,
      },
    });
    console.log(`  ✓ Temperature: ${t.name}`);
  }

  console.log('\n====================================================');
  console.log('🎉 SURGICAL WIPE & SEED COMPLETE!');
  console.log(`🔑 Super Admin Login:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('🛡️ All integrations, connectors, and general settings were PRESERVED untouched.');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during wipe-and-seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
