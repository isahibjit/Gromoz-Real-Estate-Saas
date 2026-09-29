import { PrismaClient, Role } from '@prisma/client';
import { encryptPassword } from '../src/common/utils/cipher.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SaaS Platform & Multi-Tenant Seed...');

  // 1. Seed Platform SuperAdmin
  const superAdminEmail = 'superadmin@truroot.com';
  const superAdminPassword = encryptPassword('Admin@123456');

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      fullName: 'Platform Super Administrator',
      role: 'SUPER_ADMIN',
      passwordHash: superAdminPassword,
      isActive: true,
    },
    create: {
      email: superAdminEmail,
      fullName: 'Platform Super Administrator',
      role: 'SUPER_ADMIN',
      passwordHash: superAdminPassword,
      isActive: true,
    },
  });

  console.log(`✅ Platform SuperAdmin created: ${superAdmin.email} (Password: Admin@123456)`);

  // 2. Seed Customer Organization 1: Skyline Realty Group (Active SaaS Tenant)
  const skylineOrg = await prisma.organization.upsert({
    where: { slug: 'skyline' },
    update: {
      name: 'Skyline Realty Group',
      status: 'ACTIVE',
      planTier: 'GROWTH',
      setupFeePaid: true,
      setupFeeAmount: 9999.0,
      pricePerSeatMonth: 500.0,
      allocatedSeats: 10,
      customDomain: 'crm.skylinerealty.com',
      customDomainVerified: true,
      customDomainSslStatus: 'ACTIVE',
      brandingPrimaryColor: '#0D1F3D',
      brandingSecondaryColor: '#E20613',
      industry: 'Property Advisory & Brokerage',
      website: 'https://skylinerealty.com',
      primaryEmail: 'info@skylinerealty.com',
      primaryPhone: '+91 98200 11223',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400050',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: 'Skyline Realty Group',
      slug: 'skyline',
      status: 'ACTIVE',
      planTier: 'GROWTH',
      setupFeePaid: true,
      setupFeeAmount: 9999.0,
      pricePerSeatMonth: 500.0,
      allocatedSeats: 10,
      customDomain: 'crm.skylinerealty.com',
      customDomainVerified: true,
      customDomainSslStatus: 'ACTIVE',
      brandingPrimaryColor: '#0D1F3D',
      brandingSecondaryColor: '#E20613',
      industry: 'Property Advisory & Brokerage',
      website: 'https://skylinerealty.com',
      primaryEmail: 'info@skylinerealty.com',
      primaryPhone: '+91 98200 11223',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400050',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed Skyline Admin User
  const skylineAdmin = await prisma.user.upsert({
    where: { email: 'admin@skylinerealty.com' },
    update: {
      fullName: 'Rajesh Sharma',
      role: 'ADMIN',
      passwordHash: encryptPassword('Admin@123456'),
      isActive: true,
    },
    create: {
      email: 'admin@skylinerealty.com',
      fullName: 'Rajesh Sharma',
      role: 'ADMIN',
      passwordHash: encryptPassword('Admin@123456'),
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: skylineOrg.id,
        userId: skylineAdmin.id,
      },
    },
    update: {
      role: 'ADMIN',
      isOwner: true,
      isActive: true,
    },
    create: {
      organizationId: skylineOrg.id,
      userId: skylineAdmin.id,
      role: 'ADMIN',
      isOwner: true,
      isActive: true,
    },
  });

  // Seed Skyline Sales Agent
  const skylineAgent = await prisma.user.upsert({
    where: { email: 'agent@skylinerealty.com' },
    update: {
      fullName: 'Priya Verma',
      role: 'SALES_AGENT',
      passwordHash: encryptPassword('Agent@123456'),
      isActive: true,
    },
    create: {
      email: 'agent@skylinerealty.com',
      fullName: 'Priya Verma',
      role: 'SALES_AGENT',
      passwordHash: encryptPassword('Agent@123456'),
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: skylineOrg.id,
        userId: skylineAgent.id,
      },
    },
    update: {
      role: 'SALES_AGENT',
      isOwner: false,
      isActive: true,
    },
    create: {
      organizationId: skylineOrg.id,
      userId: skylineAgent.id,
      role: 'SALES_AGENT',
      isOwner: false,
      isActive: true,
    },
  });

  // Seed Initial Skyline Project
  const skylineProject = await prisma.project.create({
    data: {
      organizationId: skylineOrg.id,
      name: 'Skyline SkyVillas',
      location: 'Bandra West, Mumbai',
      developer: 'Skyline Group',
      status: 'Active',
      possession: 'Ready to Move',
      minPrice: 35000000,
      maxPrice: 95000000,
      reraNumber: 'P51800024567',
      description: 'Ultra luxury sea-facing 3 & 4 BHK residences.',
    },
  });

  // Seed Initial Skyline Leads
  await prisma.lead.upsert({
    where: { displayId: 'SKY-1001' },
    update: {
      organizationId: skylineOrg.id,
    },
    create: {
      displayId: 'SKY-1001',
      organizationId: skylineOrg.id,
      name: 'Vikram Malhotra',
      email: 'vikram.malhotra@example.com',
      mobile: '9820012345',
      ownerId: skylineAgent.id,
      remarks: 'Interested in 4 BHK sea-facing SkyVilla.',
    },
  });

  await prisma.lead.upsert({
    where: { displayId: 'SKY-1002' },
    update: {
      organizationId: skylineOrg.id,
    },
    create: {
      displayId: 'SKY-1002',
      organizationId: skylineOrg.id,
      name: 'Ananya Deshmukh',
      email: 'ananya.deshmukh@example.com',
      mobile: '9820054321',
      ownerId: skylineAdmin.id,
      remarks: 'Looking for investment options in Bandra West.',
    },
  });

  // Seed Billing Transaction for Setup Fee
  await prisma.billingTransaction.upsert({
    where: { razorpayPaymentId: 'pay_skyline_setup_001' },
    update: {},
    create: {
      organizationId: skylineOrg.id,
      amount: 14999.0, // 9999 setup + 10 seats * 500
      type: 'SETUP_FEE',
      razorpayPaymentId: 'pay_skyline_setup_001',
      razorpayOrderId: 'order_skyline_setup_001',
      status: 'captured',
      metadata: {
        seats: 10,
        setupFee: 9999.0,
      },
    },
  });

  console.log(`✅ Tenant 1 created: ${skylineOrg.name} (Slug: ${skylineOrg.slug}, Admin: admin@skylinerealty.com / Admin@123456)`);

  // 3. Seed Customer Organization 2: Apex Property Advisors (Pending Setup Tenant)
  const apexOrg = await prisma.organization.upsert({
    where: { slug: 'apex' },
    update: {
      name: 'Apex Property Advisors',
      status: 'SETUP_PENDING',
      planTier: 'STARTER',
      setupFeePaid: false,
      allocatedSeats: 5,
      pricePerSeatMonth: 500.0,
      setupFeeAmount: 9999.0,
    },
    create: {
      name: 'Apex Property Advisors',
      slug: 'apex',
      status: 'SETUP_PENDING',
      planTier: 'STARTER',
      setupFeePaid: false,
      allocatedSeats: 5,
      pricePerSeatMonth: 500.0,
      setupFeeAmount: 9999.0,
    },
  });

  const apexAdmin = await prisma.user.upsert({
    where: { email: 'admin@apexproperties.com' },
    update: {
      fullName: 'Amit Patel',
      role: 'ADMIN',
      passwordHash: encryptPassword('Admin@123456'),
      isActive: true,
    },
    create: {
      email: 'admin@apexproperties.com',
      fullName: 'Amit Patel',
      role: 'ADMIN',
      passwordHash: encryptPassword('Admin@123456'),
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: apexOrg.id,
        userId: apexAdmin.id,
      },
    },
    update: {
      role: 'ADMIN',
      isOwner: true,
      isActive: true,
    },
    create: {
      organizationId: apexOrg.id,
      userId: apexAdmin.id,
      role: 'ADMIN',
      isOwner: true,
      isActive: true,
    },
  });

  console.log(`✅ Tenant 2 created: ${apexOrg.name} (Slug: ${apexOrg.slug}, Status: SETUP_PENDING, Admin: admin@apexproperties.com / Admin@123456)`);

  console.log('\n🚀 SaaS Platform Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
