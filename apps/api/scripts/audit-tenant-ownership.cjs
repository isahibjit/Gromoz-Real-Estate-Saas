// Read-only migration preflight. Run from apps/api; prints counts, never PII.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const timeout = setTimeout(() => {
  console.error('Tenant ownership audit timed out; no data was changed.');
  process.exit(1);
}, 20000);

async function main() {
  const models = ['lead', 'project', 'team', 'attendanceRecord', 'leaveRequest', 'payrollRecord', 'auditLog', 'portalIntegration', 'housingIntegration'];
  const unassigned = {};
  for (const model of models) {
    unassigned[model] = await prisma[model].count({ where: { organizationId: null } });
  }
  const [organizations, users, usersWithoutMembership, memberships] = await prisma.$transaction([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.user.count({ where: { organizationMemberships: { none: {} } } }),
    prisma.organizationMember.groupBy({ by: ['userId'], _count: { _all: true } }),
  ]);
  console.log(JSON.stringify({ organizations, users, usersWithoutMembership,
    usersWithMultipleMemberships: memberships.filter((row) => row._count._all > 1).length,
    unassigned,
  }, null, 2));
}

main().catch((error) => {
  console.error('Tenant ownership audit failed:', error.code || error.name);
  const message = String(error.message).split(process.env.DATABASE_URL || '\0').join('[database URL redacted]');
  console.error(message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database URL redacted]'));
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
  clearTimeout(timeout);
});
