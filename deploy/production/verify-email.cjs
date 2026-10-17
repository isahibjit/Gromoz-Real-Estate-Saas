// Run as the runtime user with the protected environment loaded. Sends only to
// the configured sender's own mailbox, never to workspace/customer addresses.
require('reflect-metadata');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ConfigService } = require('@nestjs/config');
const root = path.resolve(__dirname, '../..');
const { PrismaService } = require(path.join(root, 'apps/api/dist/src/persistence/prisma/prisma.service'));
const { EmailConnectorsService } = require(path.join(root, 'apps/api/dist/src/crm/email-connectors.service'));
const { buildTrialPaymentReminder } = require(path.join(root, 'apps/api/dist/src/billing/trial-reminder.worker'));

async function main() {
  const recipient = process.env.SMTP_FROM || process.env.SMTP_USER;
  assert.ok(recipient && process.env.SMTP_PASS, 'Configure SMTP before verification.');
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    const email = new EmailConnectorsService(prisma, new ConfigService());
    const entityId = `smtp-verification:${new Date().toISOString()}`;
    await email.sendPlatformEmail({
      to: recipient,
      subject: 'Gromoze: production email delivery verification',
      text: 'This is a requested delivery test from the Gromoze production server. Platform SMTP authentication, message submission and email logging are being verified. No payment is due for this test.',
      entityType: 'PlatformEmailVerification', entityId,
    });
    const preview = buildTrialPaymentReminder({
      workspaceName: 'Gromoze verification workspace (test only)',
      ownerName: 'Solverix team', trialEndsAt: new Date(),
    });
    await email.sendPlatformEmail({
      ...preview, to: recipient,
      subject: `[Test preview] ${preview.subject}`,
      text: `TEST PREVIEW ONLY: no real trial has expired and no payment is due for this test.\n\n${preview.text}`,
      html: `<p><strong>Test preview only: no real trial has expired and no payment is due for this test.</strong></p>${preview.html}`,
      entityType: 'PlatformEmailVerification', entityId,
    });
    const accepted = await prisma.emailLog.count({
      where: { entityType: 'PlatformEmailVerification', entityId, recipient, status: 'Sent' },
    });
    assert.equal(accepted, 2, 'Expected both SMTP-accepted test emails in delivery logs.');
    console.log(JSON.stringify({ recipient, smtpAccepted: accepted, deliveryLogsVerified: true, inboxDelivery: 'Check the mailbox; SMTP acceptance does not confirm inbox placement.' }));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(error => {
  // Never dump SMTP configuration, authentication objects or environment data.
  console.error('Email verification failed:', error.name || 'Unknown error');
  process.exitCode = 1;
});
