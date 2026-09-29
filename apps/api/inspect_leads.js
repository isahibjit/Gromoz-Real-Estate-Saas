const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const leadCount = await prisma.lead.count();
  const projectCount = await prisma.project.count();
  console.log('Current DB Lead count:', leadCount);
  console.log('Current DB Project count:', projectCount);

  // Group by sourceId
  const leadsBySource = await prisma.lead.groupBy({
    by: ['sourceId'],
    _count: { id: true },
  });
  console.log('Current DB Leads by sourceId:', leadsBySource);

  const currentLead = await prisma.lead.findFirst({
    include: { requirement: true },
  });
  console.log('Current DB Single Lead:', {
    id: currentLead?.id,
    displayId: currentLead?.displayId,
    name: currentLead?.name,
    mobile: currentLead?.mobile,
    sourceId: currentLead?.sourceId,
    statusId: currentLead?.statusId,
    createdAt: currentLead?.createdAt,
  });

  const sourceMaster = currentLead?.sourceId
    ? await prisma.leadMasterValue.findUnique({ where: { id: currentLead.sourceId } })
    : null;
  console.log('Source Master for current lead:', sourceMaster);

  // Check portal integrations
  const portalIntegrations = await prisma.portalIntegration.findMany();
  console.log('Portal integrations:', portalIntegrations.map(p => ({
    provider: p.provider,
    displayName: p.displayName,
    totalLeadsReceived: p.totalLeadsReceived,
    lastLeadReceivedAt: p.lastLeadReceivedAt,
  })));

  // Analyze backup file
  console.log('\n--- Analyzing pre_wipe_backup_.sql ---');
  try {
    const content = fs.readFileSync('/home/ubuntu/pre_wipe_backup_.sql', 'utf8');
    const lines = content.split('\n');
    let inLead = false;
    let leadCols = [];
    const leadRows = [];

    for (const line of lines) {
      if (line.startsWith('COPY public."Lead" ')) {
        inLead = true;
        const colsPart = line.substring(line.indexOf('(') + 1, line.indexOf(')'));
        leadCols = colsPart.split(',').map(c => c.trim().replace(/"/g, ''));
        continue;
      }
      if (inLead) {
        if (line.trim() === '\\.') {
          inLead = false;
          continue;
        }
        leadRows.push(line.split('\t'));
      }
    }

    console.log(`Total leads in backup: ${leadRows.length}`);
    const sIdx = leadCols.indexOf('sourceId');
    const stIdx = leadCols.indexOf('statusId');
    const sources = {};
    const statuses = {};

    for (const r of leadRows) {
      if (sIdx !== -1 && r[sIdx] !== undefined) {
        const s = r[sIdx];
        sources[s] = (sources[s] || 0) + 1;
      }
      if (stIdx !== -1 && r[stIdx] !== undefined) {
        const st = r[stIdx];
        statuses[st] = (statuses[st] || 0) + 1;
      }
    }
    console.log('Backup Leads by sourceId:', sources);
    console.log('Backup Leads by statusId:', statuses);
  } catch (err) {
    console.error('Error analyzing backup:', err.message);
  }

  await prisma.$disconnect();
}

run();
