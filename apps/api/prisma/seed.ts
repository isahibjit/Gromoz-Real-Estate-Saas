import { Prisma, PrismaClient, Role } from '@prisma/client';
import { encryptPassword } from '../src/common/utils/cipher.util';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/access/access.constants';

const prisma = new PrismaClient();

const employeeLookupPermissionModules = [
  'lead_masters',
  'projects',
  'payroll',
  'payslips',
] as const;

async function main() {
  const email = 'admin@gmail.com';
  const passwordHash = encryptPassword('admin@123');

  const seedMasterValues = async (
    categoryCode: string,
    values: string[],
    group: string,
  ) => {
    const category = await prisma.leadMasterCategory.upsert({
      where: { code: categoryCode },
      update: {},
      create: {
        code: categoryCode,
        name: categoryCode.replace(/_/g, ' '),
      },
    });

    for (const [index, name] of values.entries()) {
      const code = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .toUpperCase();
      await prisma.leadMasterValue.upsert({
        where: {
          categoryId_code: {
            categoryId: category.id,
            code,
          },
        },
        update: {
          name,
          group,
          isActive: true,
        },
        create: {
          categoryId: category.id,
          name,
          code,
          group,
          statusType: 'System Default',
          isActive: true,
          isSystemDefault: true,
          sortOrder: index + 1,
        },
      });
    }
  };

  const upsertUser = async (
    email: string,
    fullName: string,
    role: Role,
    metadata?: Prisma.InputJsonValue,
  ) =>
    prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        fullName,
        role,
        isActive: true,
        metadata,
      },
      create: {
        email,
        passwordHash,
        fullName,
        role,
        isActive: true,
        metadata,
      },
    });

  const seedAccessTemplates = async () => {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        await prisma.accessTemplate.upsert({
          where: {
            role_moduleKey: {
              role: role as Role,
              moduleKey: permission.moduleKey,
            },
          },
          update: {
            canView: permission.canView,
            canCreate: permission.canCreate,
            canUpdate: permission.canUpdate,
            canDelete: permission.canDelete,
            canPunchIn: permission.canPunchIn,
            canPunchOut: permission.canPunchOut,
            isSystemDefault: true,
          },
          create: {
            role: role as Role,
            moduleKey: permission.moduleKey,
            canView: permission.canView,
            canCreate: permission.canCreate,
            canUpdate: permission.canUpdate,
            canDelete: permission.canDelete,
            canPunchIn: permission.canPunchIn,
            canPunchOut: permission.canPunchOut,
            isSystemDefault: true,
          },
        });
      }
    }
  };

  const seedEmployeeLookupPermissions = async (updatedById: string) => {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [Role.TELECALLER, Role.SALES_AGENT],
        },
      },
      select: {
        id: true,
      },
    });

    for (const user of users) {
      for (const moduleKey of employeeLookupPermissionModules) {
        await prisma.userModulePermission.upsert({
          where: {
            userId_moduleKey: {
              userId: user.id,
              moduleKey,
            },
          },
          update: {
            canView: true,
            updatedById,
          },
          create: {
            userId: user.id,
            moduleKey,
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canPunchIn: false,
            canPunchOut: false,
            updatedById,
          },
        });
      }
    }
  };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const addHours = (base: Date, hours: number) =>
    new Date(base.getTime() + hours * 60 * 60 * 1000);
  const addDays = (base: Date, days: number) =>
    new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  const pctAmount = (base: number, pct: number) =>
    Math.round(((base * pct) / 100) * 100) / 100;
  const monthKeyFor = (value: Date) =>
    `${value.getFullYear()}-${value.getMonth() + 1}`;
  const calculateBookingFinance = (
    agreementValue: number,
    rule: {
      baseBrokeragePct: number;
      ladderBrokeragePct: number;
      aopBrokeragePct: number;
      gstPct: number;
      tdsPct: number;
      passbackDefaultAmount: number;
    },
    passbackAmount = rule.passbackDefaultAmount,
  ) => {
    const baseBrokerageAmount = pctAmount(
      agreementValue,
      rule.baseBrokeragePct,
    );
    const ladderBrokerageAmount = pctAmount(
      agreementValue,
      rule.ladderBrokeragePct,
    );
    const aopBrokerageAmount = pctAmount(
      agreementValue,
      rule.aopBrokeragePct,
    );
    const grossBrokerageAmount =
      baseBrokerageAmount + ladderBrokerageAmount + aopBrokerageAmount;
    const gstAmount = pctAmount(grossBrokerageAmount, rule.gstPct);
    const tdsAmount = pctAmount(grossBrokerageAmount, rule.tdsPct);
    return {
      baseBrokeragePct: rule.baseBrokeragePct,
      ladderBrokeragePct: rule.ladderBrokeragePct,
      aopBrokeragePct: rule.aopBrokeragePct,
      gstPct: rule.gstPct,
      tdsPct: rule.tdsPct,
      passbackAmount,
      baseBrokerageAmount,
      ladderBrokerageAmount,
      aopBrokerageAmount,
      grossBrokerageAmount,
      gstAmount,
      tdsAmount,
      netBrokerageAmount: Math.max(
        grossBrokerageAmount + gstAmount - tdsAmount - passbackAmount,
        0,
      ),
    };
  };

  const projects = [
    {
      id: 'ocean-heights',
      name: 'Ocean Heights',
      location: 'Andheri (E), Mumbai',
      developer: 'Truroot Realty',
      status: 'High Demand',
      possession: 'Ready by Dec 2025',
      minPrice: 11800000,
      maxPrice: 25000000,
      configurations: ['2 BHK', '3 BHK'],
      amenities: [
        'Parking',
        'Gym',
        'Swimming Pool',
        'Club House',
        'Kids Play Area',
      ],
      description:
        'Premium residential towers near New Link Road with strong demand from west Mumbai families.',
      imageUrl:
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=900&h=520',
      imageGallery: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=900&h=520',
        'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520',
      ],
      salesOwnerId: undefined,
      demandScore: 95,
      latitude: 19.1197,
      longitude: 72.8468,
      geofenceRadiusM: 180,
      units: [
        {
          id: 'ocean-b-1203',
          tower: 'Tower B',
          unitNumber: '1203',
          configuration: '2 BHK',
          carpetAreaSqft: 842,
          floor: '12',
          facing: 'West',
          price: 13200000,
          availability: 'Available',
          bookingStatus: 'Open',
        },
        {
          id: 'ocean-a-904',
          tower: 'Tower A',
          unitNumber: '904',
          configuration: '2 BHK',
          carpetAreaSqft: 815,
          floor: '9',
          facing: 'East',
          price: 12600000,
          availability: 'Hold',
          bookingStatus: 'Family revisit',
        },
        {
          id: 'ocean-c-1601',
          tower: 'Tower C',
          unitNumber: '1601',
          configuration: '3 BHK',
          carpetAreaSqft: 1184,
          floor: '16',
          facing: 'Sea View',
          price: 21800000,
          availability: 'Available',
          bookingStatus: 'Open',
        },
      ],
    },
    {
      id: 'skyline-enclave',
      name: 'Skyline Enclave',
      location: 'Goregaon (E), Mumbai',
      developer: 'Truroot Realty',
      status: 'Active',
      possession: 'Mar 2026',
      minPrice: 10500000,
      maxPrice: 14000000,
      configurations: ['2 BHK', '3 BHK'],
      amenities: ['Gym', 'Jogging Track', 'Co-working Lounge', 'Parking'],
      description:
        'Transit-friendly project near the western express corridor with compact premium units.',
      imageUrl:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520',
      imageGallery: [
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520',
      ],
      salesOwnerId: undefined,
      demandScore: 88,
      latitude: 19.1648,
      longitude: 72.8574,
      geofenceRadiusM: 150,
      units: [
        {
          id: 'skyline-c-702',
          tower: 'Tower C',
          unitNumber: '702',
          configuration: '2 BHK',
          carpetAreaSqft: 768,
          floor: '7',
          facing: 'East',
          price: 11200000,
          availability: 'Available',
          bookingStatus: 'Open',
        },
        {
          id: 'skyline-a-1104',
          tower: 'Tower A',
          unitNumber: '1104',
          configuration: '3 BHK',
          carpetAreaSqft: 1038,
          floor: '11',
          facing: 'Garden',
          price: 13800000,
          availability: 'Booked',
          bookingStatus: 'Token received',
        },
      ],
    },
    {
      id: 'lakeview-residency',
      name: 'Lakeview Residency',
      location: 'Powai, Mumbai',
      developer: 'Lakeview Infra',
      status: 'Under Construction',
      possession: 'Sep 2026',
      minPrice: 9200000,
      maxPrice: 21000000,
      configurations: ['1 BHK', '2 BHK', '3 BHK'],
      amenities: ['Lake Deck', 'Gym', 'Multipurpose Hall', 'EV Parking'],
      description:
        'Urban lake-facing community with flexible inventory for first-time buyers and investors.',
      imageUrl:
        'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=900&h=520',
      imageGallery: [
        'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=900&h=520',
      ],
      salesOwnerId: undefined,
      demandScore: 81,
      latitude: 19.1176,
      longitude: 72.906,
      geofenceRadiusM: 170,
      units: [
        {
          id: 'lake-b-504',
          tower: 'Tower B',
          unitNumber: '504',
          configuration: '2 BHK',
          carpetAreaSqft: 742,
          floor: '5',
          facing: 'Lake',
          price: 11600000,
          availability: 'Available',
          bookingStatus: 'Open',
        },
        {
          id: 'lake-a-1802',
          tower: 'Tower A',
          unitNumber: '1802',
          configuration: '3 BHK',
          carpetAreaSqft: 1125,
          floor: '18',
          facing: 'Lake',
          price: 19600000,
          availability: 'Available',
          bookingStatus: 'Open',
        },
      ],
    },
    {
      id: 'palm-springs',
      name: 'Palm Springs',
      location: 'Andheri (W), Mumbai',
      developer: 'Palm Habitat',
      status: 'Ready To Move',
      possession: 'Immediate',
      minPrice: 28000000,
      maxPrice: 55000000,
      configurations: ['3 BHK', '4 BHK'],
      amenities: ['Club House', 'Pool', 'Concierge', 'Private Parking'],
      description:
        'Ready luxury inventory for high-value buyers seeking larger west Mumbai apartments.',
      imageUrl:
        'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520',
      imageGallery: [
        'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520',
      ],
      salesOwnerId: undefined,
      demandScore: 76,
      latitude: 19.1363,
      longitude: 72.8267,
      geofenceRadiusM: 160,
      units: [
        {
          id: 'palm-d-1102',
          tower: 'Tower D',
          unitNumber: '1102',
          configuration: '3 BHK',
          carpetAreaSqft: 1356,
          floor: '11',
          facing: 'West',
          price: 31000000,
          availability: 'Available',
          bookingStatus: 'Negotiation',
        },
        {
          id: 'palm-e-2101',
          tower: 'Tower E',
          unitNumber: '2101',
          configuration: '4 BHK',
          carpetAreaSqft: 1920,
          floor: '21',
          facing: 'Sea View',
          price: 52000000,
          availability: 'Sold',
          bookingStatus: 'Closed',
        },
      ],
    },
    {
      id: 'sunset-residency',
      name: 'Sunset Residency',
      location: 'Malad, Mumbai',
      developer: 'Sunset Homes',
      status: 'Ready To Move',
      possession: 'Immediate',
      minPrice: 9800000,
      maxPrice: 16500000,
      configurations: ['2 BHK'],
      amenities: ['Parking', 'Gym', 'Terrace Garden'],
      description:
        'Ready-to-move mid-market project with quick booking inventory in Malad.',
      imageUrl:
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=900&h=520',
      imageGallery: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=900&h=520',
      ],
      salesOwnerId: undefined,
      demandScore: 72,
      latitude: 19.1861,
      longitude: 72.8487,
      geofenceRadiusM: 150,
      units: [
        {
          id: 'sunset-a-604',
          tower: 'Tower A',
          unitNumber: '604',
          configuration: '2 BHK',
          carpetAreaSqft: 724,
          floor: '6',
          facing: 'West',
          price: 10500000,
          availability: 'Available',
          bookingStatus: 'Open',
        },
      ],
    },
  ];

  for (const project of projects) {
    const { units, ...projectData } = project;
    await prisma.project.upsert({
      where: { id: project.id },
      update: projectData,
      create: projectData,
    });

    for (const unit of units) {
      await prisma.projectUnit.upsert({
        where: { id: unit.id },
        update: { ...unit, projectId: project.id },
        create: { ...unit, projectId: project.id },
      });
    }
  }

  const brokerageRules = [
    {
      projectId: 'ocean-heights',
      baseBrokeragePct: 2,
      ladderBrokeragePct: 0.5,
      aopBrokeragePct: 0.25,
      gstPct: 18,
      tdsPct: 5,
      passbackDefaultAmount: 75000,
      salesIncentivePct: 8,
      preSalesIncentivePct: 3,
      teamLeaderIncentivePct: 2,
    },
    {
      projectId: 'skyline-enclave',
      baseBrokeragePct: 1.8,
      ladderBrokeragePct: 0.35,
      aopBrokeragePct: 0.2,
      gstPct: 18,
      tdsPct: 5,
      passbackDefaultAmount: 50000,
      salesIncentivePct: 7,
      preSalesIncentivePct: 2.5,
      teamLeaderIncentivePct: 1.5,
    },
    {
      projectId: 'lakeview-residency',
      baseBrokeragePct: 1.6,
      ladderBrokeragePct: 0.4,
      aopBrokeragePct: 0.15,
      gstPct: 18,
      tdsPct: 5,
      passbackDefaultAmount: 40000,
      salesIncentivePct: 6,
      preSalesIncentivePct: 2,
      teamLeaderIncentivePct: 1,
    },
    {
      projectId: 'palm-springs',
      baseBrokeragePct: 2.25,
      ladderBrokeragePct: 0.75,
      aopBrokeragePct: 0.35,
      gstPct: 18,
      tdsPct: 5,
      passbackDefaultAmount: 150000,
      salesIncentivePct: 9,
      preSalesIncentivePct: 3.5,
      teamLeaderIncentivePct: 2.5,
    },
    {
      projectId: 'sunset-residency',
      baseBrokeragePct: 1.5,
      ladderBrokeragePct: 0.25,
      aopBrokeragePct: 0.1,
      gstPct: 18,
      tdsPct: 5,
      passbackDefaultAmount: 30000,
      salesIncentivePct: 5,
      preSalesIncentivePct: 2,
      teamLeaderIncentivePct: 1,
    },
  ];

  for (const rule of brokerageRules) {
    await prisma.projectBrokerageRule.upsert({
      where: { projectId: rule.projectId },
      update: {
        ...rule,
        updatedById: null,
      },
      create: {
        ...rule,
        updatedById: null,
      },
    });
  }
  const brokerageRuleByProjectId = new Map(
    brokerageRules.map((rule) => [rule.projectId, rule]),
  );

  await seedMasterValues(
    'property_type',
    ['Apartment', 'Villa', 'Plot', 'Commercial'],
    'Property',
  );
  await seedMasterValues(
    'project_location',
    [
      'Andheri (E), Mumbai',
      'Goregaon (E), Mumbai',
      'Powai, Mumbai',
      'Andheri (W), Mumbai',
      'Malad, Mumbai',
      'Bandra, Mumbai',
    ],
    'Project',
  );
  await seedMasterValues(
    'project_configuration',
    ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', 'Studio', 'Penthouse'],
    'Inventory',
  );
  await seedMasterValues(
    'possession_timeline',
    [
      'Immediate',
      'Within 3 Months',
      'Within 6 Months',
      'Within 12 Months',
      'Ready to Move',
      'Under Construction',
    ],
    'Timeline',
  );
  await seedMasterValues(
    'project_zone',
    [
      'Central',
      'Harbour Line',
      'Western',
      'Western Line',
      'Eastern',
      'East',
      'West',
      'South Mumbai',
      'Thane',
      'Navi Mumbai',
    ],
    'Location',
  );
  await seedMasterValues(
    'lead_budget_range',
    [
      '50 Lakh - 75 Lakh',
      '75 Lakh - 1 Cr',
      '1 Cr - 1.5 Cr',
      '1.5 Cr - 2 Cr',
      '2 Cr - 3 Cr',
      '3 Cr+',
    ],
    'Budget',
  );
  await seedMasterValues(
    'carpet_area_range',
    [
      '400 - 600 sq ft',
      '600 - 800 sq ft',
      '800 - 1000 sq ft',
      '1000 - 1500 sq ft',
      '1500 - 2000 sq ft',
      '2000+ sq ft',
    ],
    'Area',
  );
  await seedMasterValues(
    'project_amenity',
    [
      'Gym',
      'Parking',
      'Club House',
      'Swimming Pool',
      'Landscaped Garden',
      "Children's Play Area",
      'Jogging Track',
      'Security',
      'Lake Deck',
      'EV Parking',
      'Terrace Garden',
    ],
    'Amenity',
  );
  await seedMasterValues(
    'project_status',
    ['Active', 'Ready To Move', 'Under Construction', 'High Demand'],
    'Project Status',
  );
  await seedMasterValues(
    'project_developer',
    ['Truroot Realty', 'Lakeview Infra', 'Palm Habitat', 'Sunset Homes'],
    'Developer',
  );
  await seedMasterValues(
    'unit_tower',
    ['Tower A', 'Tower B', 'Tower C', 'Tower D', 'Tower E', 'Tower Z'],
    'Tower',
  );
  await seedMasterValues(
    'unit_facing',
    ['East', 'West', 'North', 'South', 'Garden', 'Sea View', 'Lake', 'Road'],
    'Facing',
  );
  await seedMasterValues(
    'unit_availability',
    ['Available', 'Hold', 'Booked', 'Sold'],
    'Inventory Status',
  );
  await seedMasterValues(
    'unit_booking_status',
    ['Open', 'Family revisit', 'Negotiation', 'Token received', 'Closed'],
    'Booking Status',
  );

  const telecallerEmail = 'telecaller@gmail.com';
  const salesManagerEmail = 'sales.manager@gmail.com';
  const teamLeaderEmail = 'team.leader@gmail.com';
  const managerEmail = 'manager@gmail.com';
  const adminUser = await upsertUser(email, 'Admin User', Role.SUPER_ADMIN);
  const salesManager = await upsertUser(
    salesManagerEmail,
    'Sales Manager Test',
    Role.SALES_MANAGER,
  );
  const teamLeaderUser = await upsertUser(
    teamLeaderEmail,
    'Team Leader Test',
    Role.TEAM_LEADER,
  );
  const managerUser = await upsertUser(
    managerEmail,
    'Manager Test',
    Role.MANAGER,
  );
  const telecallerUser = await upsertUser(
    telecallerEmail,
    'Pre Sales Test',
    Role.TELECALLER,
  );

  const fieldExecutiveSeeds = [
    {
      email: 'field.executive@gmail.com',
      fullName: 'Khushvinder Kaur',
      tracking: {
        latitude: 19.1197,
        longitude: 72.8468,
        accuracy: 14,
        speed: 10,
        heading: 122,
        trackedAt: addHours(todayStart, 10.5).toISOString(),
        startedAt: addHours(todayStart, 9).toISOString(),
        isTracking: true,
      },
    },
    {
      email: 'field.executive.two@gmail.com',
      fullName: 'Ravi Kumar',
      tracking: {
        latitude: 19.1648,
        longitude: 72.8574,
        accuracy: 19,
        speed: 0,
        heading: 0,
        trackedAt: addHours(todayStart, 11.2).toISOString(),
        startedAt: addHours(todayStart, 9).toISOString(),
        isTracking: true,
      },
    },
    {
      email: 'field.executive.three@gmail.com',
      fullName: 'Sneha Iyer',
      tracking: {
        latitude: 19.1861,
        longitude: 72.8487,
        accuracy: 22,
        speed: 0,
        heading: 0,
        trackedAt: addHours(todayStart, 10).toISOString(),
        startedAt: addHours(todayStart, 9).toISOString(),
        isTracking: false,
      },
    },
  ] as const;

  const fieldExecutives = [] as Array<{
    id: string;
    email: string;
    fullName: string;
  }>;
  for (const executive of fieldExecutiveSeeds) {
    const user = await upsertUser(
      executive.email,
      executive.fullName,
      Role.SALES_AGENT,
      { fieldTracking: executive.tracking },
    );
    fieldExecutives.push({
      id: user.id,
      email: executive.email,
      fullName: executive.fullName,
    });
  }

  await seedAccessTemplates();
  await seedEmployeeLookupPermissions(adminUser.id);

  const incentiveVisibilityDefaults = [
    { roleScope: 'SALES', visibilityScope: 'OWN', canEdit: false },
    { roleScope: 'PRE_SALES', visibilityScope: 'OWN', canEdit: false },
    {
      roleScope: 'TEAM_LEADER',
      visibilityScope: 'OWN_AND_TEAM',
      canEdit: true,
    },
  ];
  for (const setting of incentiveVisibilityDefaults) {
    await prisma.incentiveVisibilitySetting.upsert({
      where: { roleScope: setting.roleScope },
      update: {
        visibilityScope: setting.visibilityScope,
        canEdit: setting.canEdit,
        updatedById: adminUser.id,
      },
      create: {
        ...setting,
        updatedById: adminUser.id,
      },
    });
  }

  const existingPayrollSetting = await prisma.payrollSetting.findFirst({
    select: { id: true },
  });
  if (existingPayrollSetting) {
    await prisma.payrollSetting.update({
      where: { id: existingPayrollSetting.id },
      data: {
        workingDays: [1, 2, 3, 4, 5, 6],
        divisorType: 'FIXED',
        fixedDivisor: 30,
        minimumDealsToQualify: 3,
        salesIncentivePct: 2.5,
        preSalesIncentivePct: 1,
        teamLeaderIncentivePct: 0.5,
      },
    });
  } else {
    await prisma.payrollSetting.create({
      data: {
        workingDays: [1, 2, 3, 4, 5, 6],
        divisorType: 'FIXED',
        fixedDivisor: 30,
        minimumDealsToQualify: 3,
        salesIncentivePct: 2.5,
        preSalesIncentivePct: 1,
        teamLeaderIncentivePct: 0.5,
      },
    });
  }

  const generalShift = await prisma.shiftTemplate.upsert({
    where: { name: 'General shift' },
    update: {
      startTimeMinutes: 9 * 60 + 30,
      endTimeMinutes: 18 * 60 + 30,
      workingDays: [1, 2, 3, 4, 5, 6],
      lateGraceMinutes: 15,
      lateThresholdCount: 3,
      latePenaltyStatus: 'Half Day',
      isActive: true,
    },
    create: {
      name: 'General shift',
      startTimeMinutes: 9 * 60 + 30,
      endTimeMinutes: 18 * 60 + 30,
      workingDays: [1, 2, 3, 4, 5, 6],
      lateGraceMinutes: 15,
      lateThresholdCount: 3,
      latePenaltyStatus: 'Half Day',
      isActive: true,
    },
  });

  const telecallingShift = await prisma.shiftTemplate.upsert({
    where: { name: 'Telecalling shift' },
    update: {
      startTimeMinutes: 10 * 60,
      endTimeMinutes: 19 * 60,
      workingDays: [0, 1, 2, 3, 4, 5],
      lateGraceMinutes: 10,
      lateThresholdCount: 3,
      latePenaltyStatus: 'Half Day',
      isActive: true,
    },
    create: {
      name: 'Telecalling shift',
      startTimeMinutes: 10 * 60,
      endTimeMinutes: 19 * 60,
      workingDays: [0, 1, 2, 3, 4, 5],
      lateGraceMinutes: 10,
      lateThresholdCount: 3,
      latePenaltyStatus: 'Half Day',
      isActive: true,
    },
  });

  const fieldOpsShift = await prisma.shiftTemplate.upsert({
    where: { name: 'Field operations shift' },
    update: {
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 18 * 60,
      workingDays: [1, 2, 3, 4, 5, 6],
      lateGraceMinutes: 20,
      lateThresholdCount: 3,
      latePenaltyStatus: 'Half Day',
      isActive: true,
    },
    create: {
      name: 'Field operations shift',
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 18 * 60,
      workingDays: [1, 2, 3, 4, 5, 6],
      lateGraceMinutes: 20,
      lateThresholdCount: 3,
      latePenaltyStatus: 'Half Day',
      isActive: true,
    },
  });

  // Seed status and source masters
  await seedMasterValues(
    'status',
    [
      'New Lead',
      'Contacted',
      'Interested',
      'Follow-Up',
      'Site Visit',
      'Proposal',
      'Negotiation',
      'Booked',
      'Lost',
    ],
    'Status',
  );

  await prisma.leadMasterValue.updateMany({
    where: { categoryRef: { code: 'status' }, code: 'SITE_VISIT' },
    data: { triggerAction: 'CREATE_SITE_VISIT', manualScore: 5 },
  });
  await prisma.leadMasterValue.updateMany({
    where: { categoryRef: { code: 'status' }, code: 'BOOKED' },
    data: { triggerAction: 'CREATE_BOOKING', manualScore: 50 },
  });
  await prisma.leadMasterValue.updateMany({
    where: { categoryRef: { code: 'status' }, code: 'INTERESTED' },
    data: { manualScore: 1 },
  });
  await prisma.leadMasterValue.updateMany({
    where: {
      categoryRef: { code: 'status' },
      OR: [
        { code: { in: ['RE_VISIT_DONE', 'REVISIT_DONE'] } },
        { name: { in: ['Re-Visit Done', 'Revisit Done'] } },
      ],
    },
    data: { manualScore: 10 },
  });
  await prisma.leadMasterValue.updateMany({
    where: {
      categoryRef: { code: 'status' },
      OR: [
        { code: { in: ['FOLLOW_UP', 'FOLLOW_UP_SCHEDULED'] } },
        { name: { in: ['Follow-Up', 'Follow-up Scheduled'] } },
      ],
    },
    data: {
      followUpNotificationEnabled: true,
      followUpRenotifyMinutes: 3,
    },
  });
  await prisma.leadMasterValue.updateMany({
    where: {
      categoryRef: { code: 'status' },
      OR: [
        { code: { in: ['LOST', 'LOST_LEAD', 'NOT_INTERESTED'] } },
        { name: { in: ['Lost', 'Lost Lead', 'Not Interested'] } },
      ],
    },
    data: {
      allowFollowUp: false,
      followUpNotificationEnabled: false,
      followUpRenotifyMinutes: null,
    },
  });

  await seedMasterValues(
    'source',
    ['MagicBricks', '99Acres', 'Google Ads', 'Meta Ads', 'Referral', 'Walk-in'],
    'Source',
  );

  const statuses = await prisma.leadMasterValue.findMany({
    where: { categoryRef: { code: 'status' } },
  });
  const sources = await prisma.leadMasterValue.findMany({
    where: { categoryRef: { code: 'source' } },
  });

  const getStatusId = (name: string) =>
    statuses.find((s) => s.name === name)?.id;
  const getSourceId = (name: string) =>
    sources.find((s) => s.name === name)?.id;

  const fieldOpsTeam = await prisma.team.upsert({
    where: { code: 'FIELD-OPS-MUM' },
    update: {
      name: 'Field Operations Mumbai',
      description:
        'Primary field execution team for site visits, on-site tracking, and buyer handoff.',
      leaderId: teamLeaderUser.id,
      isActive: true,
    },
    create: {
      name: 'Field Operations Mumbai',
      code: 'FIELD-OPS-MUM',
      description:
        'Primary field execution team for site visits, on-site tracking, and buyer handoff.',
      leaderId: teamLeaderUser.id,
      isActive: true,
    },
  });

  const leadsData = [
    {
      displayId: 'TR000001',
      name: 'Rohan Sharma',
      email: 'rohan.sharma@gmail.com',
      mobile: '9876543210',
      createdAt: addHours(todayStart, 8),
      sourceId: getSourceId('Google Ads'),
      stageId: getStatusId('New Lead'),
      statusId: getStatusId('New Lead'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[0]?.id,
      assignedAt: addDays(now, -5),
      nextFollowUpAt: addHours(todayStart, 18),
      remarks: 'Interested in 2 BHK in Andheri West.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '2 BHK',
        minBudget: 12000000,
        maxBudget: 15000000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Andheri (E), Mumbai',
        preferredProjectId: 'ocean-heights',
      },
      interests: ['ocean-heights'],
    },
    {
      displayId: 'TR000002',
      name: 'Priya Patel',
      email: 'priya.patel@yahoo.com',
      mobile: '9812345678',
      createdAt: addHours(todayStart, 8.75),
      sourceId: getSourceId('Meta Ads'),
      stageId: getStatusId('Interested'),
      statusId: getStatusId('Interested'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[0]?.id,
      assignedAt: addDays(now, -6),
      nextFollowUpAt: addDays(now, 1),
      remarks: 'Looking for premium 3 BHK with pool view.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '3 BHK',
        minBudget: 20000000,
        maxBudget: 25000000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Powai, Mumbai',
        preferredProjectId: 'lakeview-residency',
      },
      interests: ['lakeview-residency'],
    },
    {
      displayId: 'TR000003',
      name: 'Vikram Malhotra',
      email: 'vikram.m@outlook.com',
      mobile: '9765432109',
      createdAt: addHours(todayStart, 9.5),
      sourceId: getSourceId('MagicBricks'),
      stageId: getStatusId('Site Visit'),
      statusId: getStatusId('Site Visit'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[1]?.id,
      assignedAt: addDays(now, -4),
      nextFollowUpAt: addHours(todayStart, 16),
      remarks: 'Site visit scheduled for Skyline Enclave.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '3 BHK',
        minBudget: 12000000,
        maxBudget: 14000000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Goregaon (E), Mumbai',
        preferredProjectId: 'skyline-enclave',
      },
      interests: ['skyline-enclave'],
    },
    {
      displayId: 'TR000004',
      name: 'Anjali Desai',
      email: 'anjali.desai@gmail.com',
      mobile: '9654321098',
      createdAt: addHours(todayStart, 10.25),
      sourceId: getSourceId('Referral'),
      stageId: getStatusId('Negotiation'),
      statusId: getStatusId('Negotiation'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[2]?.id,
      assignedAt: addDays(now, -10),
      nextFollowUpAt: addDays(now, 2),
      remarks: 'Price negotiation in progress for Palm Springs.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '3 BHK',
        minBudget: 28000000,
        maxBudget: 35000000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Andheri (W), Mumbai',
        preferredProjectId: 'palm-springs',
      },
      interests: ['palm-springs'],
    },
    {
      displayId: 'TR000005',
      name: 'Siddharth Nair',
      email: 'sid.nair@gmail.com',
      mobile: '9543210987',
      createdAt: addHours(todayStart, 11),
      sourceId: getSourceId('99Acres'),
      stageId: getStatusId('Booked'),
      statusId: getStatusId('Booked'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[1]?.id,
      assignedAt: addDays(now, -14),
      remarks: 'Token amount paid. Waiting for registration.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '2 BHK',
        minBudget: 10000000,
        maxBudget: 12000000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Goregaon (E), Mumbai',
        preferredProjectId: 'skyline-enclave',
      },
      interests: ['skyline-enclave'],
    },
    {
      displayId: 'TR000006',
      name: 'Meera Joshi',
      email: 'meera.joshi@gmail.com',
      mobile: '9898989898',
      createdAt: addHours(todayStart, 11.75),
      sourceId: getSourceId('Walk-in'),
      stageId: getStatusId('Follow-Up'),
      statusId: getStatusId('Follow-Up'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[0]?.id,
      assignedAt: addDays(now, -3),
      nextFollowUpAt: addHours(todayStart, 14),
      remarks: 'Requested a family site visit this afternoon.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '2 BHK',
        minBudget: 9500000,
        maxBudget: 11500000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Malad, Mumbai',
        preferredProjectId: 'sunset-residency',
      },
      interests: ['sunset-residency'],
    },
    {
      displayId: 'TR000007',
      name: 'Arjun Mehta',
      email: 'arjun.mehta@gmail.com',
      mobile: '9777777777',
      createdAt: addHours(todayStart, 12.5),
      sourceId: getSourceId('MagicBricks'),
      stageId: getStatusId('Site Visit'),
      statusId: getStatusId('Site Visit'),
      ownerId: adminUser.id,
      managerId: salesManager.id,
      telecallerId: telecallerUser.id,
      fieldExecutiveId: fieldExecutives[2]?.id,
      assignedAt: addDays(now, -2),
      nextFollowUpAt: addDays(now, 1),
      remarks: 'Looking for 3 BHK in a ready luxury inventory.',
      requirement: {
        propertyType: 'Apartment',
        configuration: '3 BHK',
        minBudget: 28000000,
        maxBudget: 33000000,
        budgetUnit: 'Lakh',
        preferredLocation: 'Andheri (W), Mumbai',
        preferredProjectId: 'palm-springs',
      },
      interests: ['palm-springs'],
    },
  ];

  const seededLeadIds: string[] = [];
  for (const lead of leadsData) {
    const { requirement, interests, ...leadFields } = lead;

    const createdLead = await prisma.lead.upsert({
      where: { displayId: leadFields.displayId },
      update: {
        ...leadFields,
        createdAt: leadFields.createdAt,
      },
      create: {
        ...leadFields,
        requirement: {
          create: requirement,
        },
      },
    });
    seededLeadIds.push(createdLead.id);

    for (const projectId of interests) {
      const matchPercent = Math.floor(Math.random() * 20) + 80;
      await prisma.leadProjectInterest.upsert({
        where: {
          id: `${createdLead.id}-${projectId}`,
        },
        update: {
          matchPercent,
        },
        create: {
          id: `${createdLead.id}-${projectId}`,
          leadId: createdLead.id,
          projectId,
          isPrimary: true,
          matchPercent,
        },
      });
    }
  }

  const seededLeads = await prisma.lead.findMany({
    where: { displayId: { in: leadsData.map((lead) => lead.displayId) } },
    include: { requirement: true },
  });
  const leadByDisplayId = new Map(
    seededLeads.map((lead) => [lead.displayId, lead]),
  );

  await prisma.leadAssignment.deleteMany({
    where: {
      leadId: { in: seededLeadIds },
      assigneeType: { in: ['telecaller', 'field-executive'] },
    },
  });
  await prisma.leadAssignment.createMany({
    data: seededLeads.flatMap((lead) => [
      ...(lead.telecallerId
        ? [
            {
              leadId: lead.id,
              fromUserId: null,
              toUserId: lead.telecallerId,
              assigneeType: 'telecaller',
              strategy: 'manual',
              reason: 'Initial telecalling allocation',
              assignedById: adminUser.id,
              assignedAt: addDays(now, -7),
              isCurrent: true,
            },
          ]
        : []),
      ...(lead.fieldExecutiveId
        ? [
            {
              leadId: lead.id,
              fromUserId: lead.telecallerId ?? adminUser.id,
              toUserId: lead.fieldExecutiveId,
              assigneeType: 'field-executive',
              strategy: 'round-robin',
              reason: 'Site visit handoff',
              assignedById: salesManager.id,
              assignedAt: addDays(now, -3),
              isCurrent: true,
            },
          ]
        : []),
    ]),
    skipDuplicates: true,
  });

  type SiteVisitSeed = {
    displayId: string;
    leadDisplayId: string;
    projectId: string;
    unitId: string;
    status: string;
    visitType: string;
    scheduledAt: Date;
    assignedExecutiveId?: string;
    meetingPoint: string;
    transportMode: string;
    visitorCount: number;
    specialRequest?: string;
    notes?: string;
    feedback?: string;
    reminderEnabled?: boolean;
    reminderAt?: Date;
    checkedInAt?: Date;
    checkedOutAt?: Date;
    checkedInLatitude?: number;
    checkedInLongitude?: number;
    checkedInAccuracyM?: number;
    checkedOutLatitude?: number;
    checkedOutLongitude?: number;
    checkedOutAccuracyM?: number;
  };

  const siteVisitSeeds: SiteVisitSeed[] = [
    {
      displayId: 'SV-000001',
      leadDisplayId: 'TR000003',
      projectId: 'skyline-enclave',
      unitId: 'skyline-a-1104',
      status: 'Scheduled',
      visitType: 'Site Visit',
      scheduledAt: addHours(todayStart, 15),
      assignedExecutiveId: fieldExecutives[1]?.id,
      meetingPoint: 'Sales Gallery',
      transportMode: 'Own Vehicle',
      visitorCount: 2,
      specialRequest: 'Show balcony and parking access.',
      notes: 'Client wants to see the flat layout and facing.',
      reminderEnabled: true,
      reminderAt: addHours(todayStart, 13.5),
    },
    {
      displayId: 'SV-000002',
      leadDisplayId: 'TR000002',
      projectId: 'lakeview-residency',
      unitId: 'lake-b-504',
      status: 'Completed',
      visitType: 'Site Visit',
      scheduledAt: addDays(todayStart, -3),
      assignedExecutiveId: fieldExecutives[0]?.id,
      meetingPoint: 'Visitor Lounge',
      transportMode: 'Company Cab',
      visitorCount: 3,
      notes:
        'Visited the site, liked Powai lake view. Decision pending with family.',
      feedback: 'Interested in the location. Will discuss with spouse.',
      checkedInAt: addDays(todayStart, -3),
      checkedOutAt: addHours(addDays(todayStart, -3), 1.1),
      checkedInLatitude: 19.1176,
      checkedInLongitude: 72.906,
      checkedInAccuracyM: 18,
      checkedOutLatitude: 19.1176,
      checkedOutLongitude: 72.906,
      checkedOutAccuracyM: 14,
    },
    {
      displayId: 'SV-000003',
      leadDisplayId: 'TR000006',
      projectId: 'sunset-residency',
      unitId: 'sunset-a-604',
      status: 'Confirmed',
      visitType: 'Site Visit',
      scheduledAt: addHours(todayStart, 10),
      assignedExecutiveId: fieldExecutives[0]?.id,
      meetingPoint: 'Sales Gallery',
      transportMode: 'Own Vehicle',
      visitorCount: 2,
      notes: 'Confirm family arrival before leaving for site.',
      reminderEnabled: true,
      reminderAt: addHours(todayStart, 8.5),
    },
    {
      displayId: 'SV-000004',
      leadDisplayId: 'TR000001',
      projectId: 'ocean-heights',
      unitId: 'ocean-c-1601',
      status: 'Completed',
      visitType: 'Re-Visit',
      scheduledAt: addDays(todayStart, -1),
      assignedExecutiveId: fieldExecutives[0]?.id,
      meetingPoint: 'Sales Gallery',
      transportMode: 'Own Vehicle',
      visitorCount: 4,
      feedback: 'Family shortlisted the west-facing unit.',
      checkedInAt: addHours(addDays(todayStart, -1), 10.1),
      checkedOutAt: addHours(addDays(todayStart, -1), 11.2),
      checkedInLatitude: 19.1197,
      checkedInLongitude: 72.8468,
      checkedInAccuracyM: 18,
      checkedOutLatitude: 19.1197,
      checkedOutLongitude: 72.8468,
      checkedOutAccuracyM: 16,
    },
    {
      displayId: 'SV-000005',
      leadDisplayId: 'TR000007',
      projectId: 'palm-springs',
      unitId: 'palm-d-1102',
      status: 'Upcoming',
      visitType: 'Virtual Visit',
      scheduledAt: addDays(todayStart, 1),
      assignedExecutiveId: fieldExecutives[2]?.id,
      meetingPoint: 'Video Call Link',
      transportMode: 'Video Call',
      visitorCount: 1,
      notes: 'Share clubhouse and tower approach visuals first.',
      reminderEnabled: true,
      reminderAt: addHours(addDays(todayStart, 1), 9),
    },
  ];

  for (const visit of siteVisitSeeds) {
    const lead = leadByDisplayId.get(visit.leadDisplayId);
    if (!lead || !visit.assignedExecutiveId) continue;
    await prisma.siteVisit.upsert({
      where: { displayId: visit.displayId },
      update: {
        leadId: lead.id,
        projectId: visit.projectId,
        unitId: visit.unitId,
        status: visit.status,
        visitType: visit.visitType,
        scheduledAt: visit.scheduledAt,
        assignedExecutiveId: visit.assignedExecutiveId,
        meetingPoint: visit.meetingPoint,
        transportMode: visit.transportMode,
        visitorCount: visit.visitorCount,
        specialRequest: visit.specialRequest,
        notes: visit.notes,
        feedback: visit.feedback,
        reminderEnabled: visit.reminderEnabled ?? false,
        reminderAt: visit.reminderAt,
        checkedInAt: visit.checkedInAt,
        checkedOutAt: visit.checkedOutAt,
        checkedInLatitude: visit.checkedInLatitude,
        checkedInLongitude: visit.checkedInLongitude,
        checkedInAccuracyM: visit.checkedInAccuracyM,
        checkedOutLatitude: visit.checkedOutLatitude,
        checkedOutLongitude: visit.checkedOutLongitude,
        checkedOutAccuracyM: visit.checkedOutAccuracyM,
      },
      create: {
        displayId: visit.displayId,
        leadId: lead.id,
        projectId: visit.projectId,
        unitId: visit.unitId,
        status: visit.status,
        visitType: visit.visitType,
        scheduledAt: visit.scheduledAt,
        assignedExecutiveId: visit.assignedExecutiveId,
        meetingPoint: visit.meetingPoint,
        transportMode: visit.transportMode,
        visitorCount: visit.visitorCount,
        specialRequest: visit.specialRequest,
        notes: visit.notes,
        feedback: visit.feedback,
        reminderEnabled: visit.reminderEnabled ?? false,
        reminderAt: visit.reminderAt,
        checkedInAt: visit.checkedInAt,
        checkedOutAt: visit.checkedOutAt,
        checkedInLatitude: visit.checkedInLatitude,
        checkedInLongitude: visit.checkedInLongitude,
        checkedInAccuracyM: visit.checkedInAccuracyM,
        checkedOutLatitude: visit.checkedOutLatitude,
        checkedOutLongitude: visit.checkedOutLongitude,
        checkedOutAccuracyM: visit.checkedOutAccuracyM,
        createdById: adminUser.id,
      },
    });
  }

  const followUpPairs = [
    { leadDisplayId: 'TR000001', assignedToId: fieldExecutives[0]?.id, typeId: 'Call', statusId: 'Scheduled', scheduledAt: addHours(todayStart, 18), nextAction: 'Confirm next site revisit timing' },
    { leadDisplayId: 'TR000002', assignedToId: fieldExecutives[0]?.id, typeId: 'Call', statusId: 'Scheduled', scheduledAt: addDays(todayStart, 1), nextAction: 'Share unit walkthrough and pricing sheet' },
    { leadDisplayId: 'TR000003', assignedToId: fieldExecutives[1]?.id, typeId: 'Call', statusId: 'Scheduled', scheduledAt: addHours(todayStart, 16), nextAction: 'Confirm arrival for Skyline Enclave' },
    { leadDisplayId: 'TR000006', assignedToId: fieldExecutives[0]?.id, typeId: 'Site Visit', statusId: 'Scheduled', scheduledAt: addHours(todayStart, 10), nextAction: 'Start field visit and capture feedback' },
    { leadDisplayId: 'TR000007', assignedToId: fieldExecutives[2]?.id, typeId: 'Email', statusId: 'Scheduled', scheduledAt: addDays(todayStart, 1), nextAction: 'Send virtual visit brochure and plan' },
  ];

  await prisma.followUp.deleteMany({
    where: {
      assignedToId: { in: fieldExecutives.map((item) => item.id) },
      leadId: { in: seededLeadIds },
    },
  });
  const followUpRecords = followUpPairs.flatMap((item) => {
    const lead = leadByDisplayId.get(item.leadDisplayId);
    if (!lead || !item.assignedToId) return [];
    return [
      {
        leadId: lead.id,
        assignedToId: item.assignedToId,
        typeId: item.typeId,
        statusId: item.statusId,
        scheduledAt: item.scheduledAt,
        nextAction: item.nextAction,
        setReminder: true,
      },
    ];
  });
  await prisma.followUp.createMany({
    data: followUpRecords,
  });

  await prisma.activity.deleteMany({
    where: {
      actorId: { in: fieldExecutives.map((item) => item.id) },
      leadId: { in: seededLeadIds },
    },
  });
  const activityRecords = [
      {
        leadId: leadByDisplayId.get('TR000001')?.id,
        actorId: fieldExecutives[0]?.id,
        type: 'site_visit',
        title: 'Completed Ocean Heights revisit',
        description: 'Family shortlisted the west-facing sea view unit.',
      },
      {
        leadId: leadByDisplayId.get('TR000006')?.id,
        actorId: fieldExecutives[0]?.id,
        type: 'site_visit',
        title: 'Prepared Sunset Residency visit',
        description: 'Meeting point and family arrival confirmed.',
      },
      {
        leadId: leadByDisplayId.get('TR000003')?.id,
        actorId: fieldExecutives[1]?.id,
        type: 'follow_up',
        title: 'Confirmed Skyline visit logistics',
        description: 'Customer requested balcony and parking walkthrough.',
      },
      {
        leadId: leadByDisplayId.get('TR000007')?.id,
        actorId: fieldExecutives[2]?.id,
        type: 'virtual_visit',
        title: 'Planned luxury virtual visit',
        description: 'Will share Palm Springs amenity deck over video call.',
      },
    ].flatMap((item) =>
      item.leadId && item.actorId ? [item] : [],
    );
  await prisma.activity.createMany({
    data: activityRecords,
  });

  await prisma.notification.deleteMany({
    where: {
      OR: [
        { entityType: 'SiteVisit', entityId: { in: siteVisitSeeds.map((item) => item.displayId) } },
        { entityType: 'FieldOpsSeed' },
        { entityType: 'DashboardSeed' },
      ],
    },
  });
  const notificationRecords = [
      {
        userId: adminUser.id,
        type: 'FOLLOW_UP_ALERT',
        title: 'Overdue follow-up requires admin attention',
        description: 'Rohan Sharma has a follow-up risk and needs queue review.',
        entityType: 'DashboardSeed',
        entityId: 'FOLLOW-UP-RISK-TODAY',
      },
      {
        userId: salesManager.id,
        type: 'SITE_VISIT_ALERT',
        title: 'Today site visits need execution tracking',
        description: 'Sunset Residency and Skyline Enclave are active in today’s field plan.',
        entityType: 'DashboardSeed',
        entityId: 'SITE-VISIT-PLAN-TODAY',
      },
      {
        userId: fieldExecutives[0]?.id,
        type: 'SITE_VISIT',
        title: 'Today visit confirmed',
        description: 'Sunset Residency visit is scheduled for 10:00 AM.',
        entityType: 'SiteVisit',
        entityId: 'SV-000003',
      },
      {
        userId: fieldExecutives[1]?.id,
        type: 'SITE_VISIT',
        title: 'Prepare for Skyline visit',
        description: 'Customer wants balcony and parking walkthrough.',
        entityType: 'SiteVisit',
        entityId: 'SV-000001',
      },
      {
        userId: salesManager.id,
        type: 'FIELD_TRACKING',
        title: 'Field team live tracking active',
        description: 'Executives are seeded with active tracking metadata for today.',
        entityType: 'FieldOpsSeed',
        entityId: 'FIELD-OPS-MUM',
      },
    ].flatMap((item) => (item.userId ? [item] : []));
  await prisma.notification.createMany({
    data: notificationRecords,
  });

  const bookingSeeds = [
    {
      leadDisplayId: 'TR000005',
      projectId: 'skyline-enclave',
      unitId: 'skyline-a-1104',
      bookingAmount: 1200000,
      agreementValue: 13800000,
      bookingDate: addDays(todayStart, -2),
      status: 'Booked',
      closedById: fieldExecutives[1]?.id,
      remarks:
        'Registration documents collected. Base brokerage partly received from builder.',
      payments: [
        {
          kind: 'BROKERAGE',
          component: 'BASE_BROKERAGE',
          amount: 180000,
          status: 'Received',
          method: 'NEFT',
          referenceNo: 'BR-SKY-001',
          remarks: 'First base brokerage receipt',
          receivedDate: addDays(todayStart, -1),
        },
        {
          kind: 'INCENTIVE',
          component: 'SALES_INCENTIVE',
          amount: 12000,
          status: 'Received',
          method: 'Payroll',
          referenceNo: 'INC-SALES-SKY-001',
          remarks: 'Sales incentive advance paid',
          receivedDate: todayStart,
          recipientUserId: fieldExecutives[1]?.id,
        },
      ],
    },
    {
      leadDisplayId: 'TR000001',
      projectId: 'ocean-heights',
      unitId: 'ocean-c-1601',
      bookingAmount: 500000,
      agreementValue: 21800000,
      bookingDate: addDays(todayStart, 2),
      status: 'Scheduled',
      closedById: fieldExecutives[0]?.id,
      remarks:
        'Token collection planned. Brokerage remains pending until booking confirmation.',
      payments: [],
    },
    {
      leadDisplayId: 'TR000004',
      projectId: 'palm-springs',
      unitId: 'palm-e-2101',
      bookingAmount: 2500000,
      agreementValue: 52000000,
      bookingDate: addDays(todayStart, -8),
      status: 'Booked',
      closedById: fieldExecutives[2]?.id,
      remarks:
        'Luxury inventory closed. AOP brokerage received, incentive balance pending.',
      payments: [
        {
          kind: 'BROKERAGE',
          component: 'AOP_BROKERAGE',
          amount: 175000,
          status: 'Received',
          method: 'Cheque',
          referenceNo: 'BR-PALM-AOP-001',
          remarks: 'AOP brokerage received against Palm Springs booking',
          receivedDate: addDays(todayStart, -6),
        },
        {
          kind: 'BROKERAGE',
          component: 'BASE_BROKERAGE',
          amount: 400000,
          status: 'Received',
          method: 'NEFT',
          referenceNo: 'BR-PALM-BASE-001',
          remarks: 'Partial base brokerage receipt',
          receivedDate: addDays(todayStart, -5),
        },
        {
          kind: 'INCENTIVE',
          component: 'PRE_SALES_INCENTIVE',
          amount: 25000,
          status: 'Received',
          method: 'Payroll',
          referenceNo: 'INC-PRE-PALM-001',
          remarks: 'Pre-sales incentive released',
          receivedDate: addDays(todayStart, -4),
          recipientUserId: telecallerUser.id,
        },
      ],
    },
  ];

  for (const bookingSeed of bookingSeeds) {
    const lead = leadByDisplayId.get(bookingSeed.leadDisplayId);
    if (!lead || !bookingSeed.closedById) continue;
    const project = projects.find((item) => item.id === bookingSeed.projectId);
    const unit = project?.units.find((item) => item.id === bookingSeed.unitId);
    const rule = brokerageRuleByProjectId.get(bookingSeed.projectId);
    if (!project || !unit || !rule) continue;
    const sourceName =
      sources.find((source) => source.id === lead.sourceId)?.name ?? undefined;
    const finance = calculateBookingFinance(
      bookingSeed.agreementValue,
      rule,
      rule.passbackDefaultAmount,
    );
    const existingBooking = await prisma.booking.findFirst({
      where: { leadId: lead.id, unitId: bookingSeed.unitId },
    });
    const booking = existingBooking
      ? await prisma.booking.update({
        where: { id: existingBooking.id },
        data: {
          projectId: bookingSeed.projectId,
          bookingAmount: bookingSeed.bookingAmount,
          agreementValue: bookingSeed.agreementValue,
          bookingDate: bookingSeed.bookingDate,
          status: bookingSeed.status,
          closedById: bookingSeed.closedById,
          remarks: bookingSeed.remarks,
          leadCreatedAtSnapshot: lead.createdAt,
          leadSourceSnapshot: sourceName,
          customerNameSnapshot: lead.name,
          customerMobileSnapshot: `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`,
          projectNameSnapshot: project.name,
          towerWingSnapshot: unit.tower,
          flatNoSnapshot: unit.unitNumber,
          configurationSnapshot:
            unit.configuration ?? lead.requirement?.configuration,
          ...finance,
        },
      })
      : await prisma.booking.create({
        data: {
          leadId: lead.id,
          projectId: bookingSeed.projectId,
          unitId: bookingSeed.unitId,
          bookingAmount: bookingSeed.bookingAmount,
          agreementValue: bookingSeed.agreementValue,
          bookingDate: bookingSeed.bookingDate,
          status: bookingSeed.status,
          closedById: bookingSeed.closedById,
          remarks: bookingSeed.remarks,
          leadCreatedAtSnapshot: lead.createdAt,
          leadSourceSnapshot: sourceName,
          customerNameSnapshot: lead.name,
          customerMobileSnapshot: `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`,
          projectNameSnapshot: project.name,
          towerWingSnapshot: unit.tower,
          flatNoSnapshot: unit.unitNumber,
          configurationSnapshot:
            unit.configuration ?? lead.requirement?.configuration,
          ...finance,
        },
      });

    const incentiveSeeds = [
      {
        roleType: 'SALES',
        recipientUserId: lead.fieldExecutiveId ?? bookingSeed.closedById,
        percentage: rule.salesIncentivePct,
      },
      {
        roleType: 'PRE_SALES',
        recipientUserId: lead.telecallerId,
        percentage: rule.preSalesIncentivePct,
      },
      {
        roleType: 'TEAM_LEADER',
        recipientUserId: salesManager.id,
        percentage: rule.teamLeaderIncentivePct,
      },
    ].filter((item) => item.recipientUserId);

    await prisma.bookingIncentive.deleteMany({
      where: { bookingId: booking.id },
    });
    await prisma.bookingIncentive.createMany({
      data: incentiveSeeds.map((item) => ({
        bookingId: booking.id,
        roleType: item.roleType,
        recipientUserId: item.recipientUserId,
        percentage: item.percentage,
        amount: pctAmount(finance.netBrokerageAmount, item.percentage),
        extraAmount:
          bookingSeed.projectId === 'palm-springs' && item.roleType === 'SALES'
            ? 35000
            : 0,
        paymentStatus:
          bookingSeed.status === 'Booked' && item.roleType !== 'TEAM_LEADER'
            ? 'Paid'
            : 'Pending',
        paymentDate:
          bookingSeed.status === 'Booked' && item.roleType !== 'TEAM_LEADER'
            ? bookingSeed.bookingDate
            : null,
      })),
    });

    await prisma.payment.deleteMany({
      where: { bookingId: booking.id },
    });
    if (bookingSeed.payments.length) {
      await prisma.payment.createMany({
        data: bookingSeed.payments.map((payment) => ({
          bookingId: booking.id,
          leadId: lead.id,
          amount: payment.amount,
          paymentDate: payment.receivedDate,
          receivedDate: payment.receivedDate,
          status: payment.status,
          kind: payment.kind,
          component: payment.component,
          recipientUserId: payment.recipientUserId,
          method: payment.method,
          referenceNo: payment.referenceNo,
          remarks: payment.remarks,
        })),
      });
    }

    if (bookingSeed.status === 'Booked') {
      await prisma.projectUnit.update({
        where: { id: bookingSeed.unitId },
        data: { availability: 'Booked', bookingStatus: 'Token received' },
      });
    }
  }

  const targetYear = now.getFullYear();
  const targetMonth = now.getMonth() + 1;
  const commissionTargets = [
    ...fieldExecutives.map((executive, index) => ({
      userId: executive.id,
      roleScope: 'SALES',
      targetValue: index === 2 ? 2 : 3,
    })),
    {
      userId: telecallerUser.id,
      roleScope: 'PRE_SALES',
      targetValue: 5,
    },
    {
      userId: salesManager.id,
      roleScope: 'TEAM_LEADER',
      targetValue: 8,
    },
  ];

  for (const target of commissionTargets) {
    await prisma.userCommissionTarget.upsert({
      where: {
        userId_roleScope_year_month: {
          userId: target.userId,
          roleScope: target.roleScope,
          year: targetYear,
          month: targetMonth,
        },
      },
      update: {
        targetValue: target.targetValue,
        updatedById: adminUser.id,
      },
      create: {
        userId: target.userId,
        roleScope: target.roleScope,
        year: targetYear,
        month: targetMonth,
        targetValue: target.targetValue,
        updatedById: adminUser.id,
      },
    });
  }

  const hrEmployees = await prisma.user.findMany({
    where: {
      role: {
        in: [
          Role.SUPER_ADMIN,
          Role.ADMIN,
          Role.SALES_MANAGER,
          Role.TEAM_LEADER,
          Role.MANAGER,
          Role.TELECALLER,
          Role.SALES_AGENT,
        ],
      },
    },
    select: { id: true, role: true },
  });
  const seededPhonesByUserId = new Map<string, string>([
    [adminUser.id, '9999999990'],
    [telecallerUser.id, '9999999991'],
    [fieldExecutives[0]?.id, '9999999992'],
    [salesManager.id, '9999999993'],
    [teamLeaderUser.id, '9999999994'],
    [managerUser.id, '9999999995'],
    [fieldExecutives[1]?.id, '9999999996'],
    [fieldExecutives[2]?.id, '9999999997'],
  ].filter((entry): entry is [string, string] => Boolean(entry[0])));
  for (const employee of hrEmployees) {
    const designation = employee.role === Role.TELECALLER
      ? 'Pre-sales executive'
      : employee.role === Role.SALES_AGENT
        ? 'Field Executive'
        : employee.role === Role.TEAM_LEADER
          ? 'Team Leader'
          : employee.role === Role.MANAGER
            ? 'Manager'
            : employee.role === Role.SALES_MANAGER
          ? 'Sales Manager'
          : 'Administrator';
    const shiftId = employee.role === Role.TELECALLER
      ? telecallingShift.id
      : employee.role === Role.SALES_AGENT
        ? fieldOpsShift.id
        : generalShift.id;
    
    const existing = await prisma.employeeProfile.findUnique({ where: { userId: employee.id } });
    const employeeCode = existing?.employeeCode || `EMP-${employee.id.slice(0, 8).toUpperCase()}`;
    const phone = seededPhonesByUserId.get(employee.id) ?? existing?.phone ?? null;
    const reportingToId =
      employee.role === Role.SALES_AGENT || employee.role === Role.TELECALLER
        ? managerUser.id
        : undefined;
    const justificationMultiplier =
      employee.id === salesManager.id
        ? 4
        : employee.role === Role.TEAM_LEADER
          ? 3.5
          : employee.role === Role.SALES_AGENT
            ? 3
            : employee.role === Role.TELECALLER
              ? 2.5
              : 0;

    await prisma.employeeProfile.upsert({
      where: { userId: employee.id },
      update: {
        designation,
        employmentStatus: 'Active',
        phone,
        reportingToId,
        teamId:
          employee.role === Role.SALES_AGENT || employee.role === Role.TELECALLER
            ? fieldOpsTeam.id
            : undefined,
        shiftId,
      },
      create: {
        userId: employee.id,
        employeeCode,
        designation,
        joiningDate: new Date(Date.UTC(2025, 0, 1)),
        employmentStatus: 'Active',
        phone,
        monthlyBasic: employee.role === Role.SALES_AGENT ? 35000 : 30000,
        monthlyAllowances: 5000,
        reportingToId,
        teamId:
          employee.role === Role.SALES_AGENT || employee.role === Role.TELECALLER
            ? fieldOpsTeam.id
            : undefined,
        shiftId,
      },
    });
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "EmployeeProfile"
        SET "justificationMultiplier" = CAST(${String(justificationMultiplier)} AS DECIMAL)
        WHERE "userId" = ${employee.id}
      `,
    );
  }

  const seededIncentives = await prisma.bookingIncentive.findMany({
    where: { booking: { status: 'Booked' } },
    include: {
      booking: {
        select: {
          id: true,
          leadId: true,
          bookingDate: true,
          netBrokerageAmount: true,
        },
      },
    },
  });
  const seededRecipientIds = Array.from(
    new Set(
      seededIncentives
        .map((incentive) => incentive.recipientUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const seededProfiles = seededRecipientIds.length
    ? await prisma.employeeProfile.findMany({
        where: { userId: { in: seededRecipientIds } },
        select: { userId: true, monthlyBasic: true },
      })
    : [];
  const seededMultiplierRows = seededRecipientIds.length
    ? await prisma.$queryRaw<
        Array<{ userId: string; justificationMultiplier: unknown }>
      >(
        Prisma.sql`
          SELECT "userId", "justificationMultiplier"
          FROM "EmployeeProfile"
          WHERE "userId" IN (${Prisma.join(seededRecipientIds)})
        `,
      )
    : [];
  const seededProfileByUserId = new Map(
    seededProfiles.map((profile) => [profile.userId, profile]),
  );
  const seededMultiplierByUserId = new Map(
    seededMultiplierRows.map((row) => [
      row.userId,
      Number(row.justificationMultiplier ?? 0),
    ]),
  );
  const incentivesByRecipientMonth = new Map<string, typeof seededIncentives>();
  for (const incentive of seededIncentives) {
    if (!incentive.recipientUserId) continue;
    const key = `${incentive.recipientUserId}:${monthKeyFor(incentive.booking.bookingDate)}`;
    const existingRows = incentivesByRecipientMonth.get(key) ?? [];
    existingRows.push(incentive);
    incentivesByRecipientMonth.set(key, existingRows);
  }
  for (const incentiveRows of incentivesByRecipientMonth.values()) {
    const recipientUserId = incentiveRows[0]?.recipientUserId;
    const profile = recipientUserId
      ? seededProfileByUserId.get(recipientUserId)
      : null;
    let remainingJustification =
      Number(profile?.monthlyBasic ?? 0) *
      Number(
        recipientUserId ? seededMultiplierByUserId.get(recipientUserId) ?? 0 : 0,
      );
    const rowsByBooking = new Map<string, typeof incentiveRows>();
    for (const row of incentiveRows) {
      const existingRows = rowsByBooking.get(row.bookingId) ?? [];
      existingRows.push(row);
      rowsByBooking.set(row.bookingId, existingRows);
    }
    for (const bookingRows of Array.from(rowsByBooking.values()).sort(
      (left, right) =>
        left[0].booking.bookingDate.getTime() -
        right[0].booking.bookingDate.getTime(),
    )) {
      const brokerageAmount = Number(bookingRows[0].booking.netBrokerageAmount ?? 0);
      const commissionableBrokerage = Math.max(
        brokerageAmount - remainingJustification,
        0,
      );
      remainingJustification = Math.max(
        remainingJustification - brokerageAmount,
        0,
      );
      for (const row of bookingRows) {
        const amount = pctAmount(
          commissionableBrokerage,
          Number(row.percentage ?? 0),
        );
        await prisma.bookingIncentive.update({
          where: { id: row.id },
          data: { amount },
        });
        if (String(row.paymentStatus).toLowerCase() === 'paid') {
          await prisma.payment.updateMany({
            where: {
              bookingId: row.bookingId,
              recipientUserId: row.recipientUserId,
              kind: 'INCENTIVE',
              component: `${row.roleType}_INCENTIVE`,
            },
            data: { amount },
          });
        }
      }
    }
  }

  const holidayDate = addDays(todayStart, 2);
  await prisma.holiday.upsert({
    where: { holidayDate },
    update: {
      name: 'Founders day',
      description: 'Seeded company holiday for HR attendance demos.',
      type: 'Company Holiday',
      createdById: adminUser.id,
    },
    create: {
      holidayDate,
      name: 'Founders day',
      description: 'Seeded company holiday for HR attendance demos.',
      type: 'Company Holiday',
      createdById: adminUser.id,
    },
  });

  const approvedLeaveStart = addDays(todayStart, -1);
  const existingLeave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: fieldExecutives[2]?.id,
      startDate: approvedLeaveStart,
      endDate: approvedLeaveStart,
    },
    select: { id: true },
  });
  if (fieldExecutives[2]) {
    if (existingLeave) {
      await prisma.leaveRequest.update({
        where: { id: existingLeave.id },
        data: {
          leaveType: 'Casual Leave',
          days: new Prisma.Decimal(1),
          reason: 'Seeded approved leave for attendance demo.',
          note: 'Auto-seeded HR sample',
          status: 'Approved',
          reviewerId: adminUser.id,
          reviewerNote: 'Approved in seed data',
          reviewedAt: addHours(approvedLeaveStart, 8),
          cancelledAt: null,
        },
      });
    } else {
      await prisma.leaveRequest.create({
        data: {
          employeeId: fieldExecutives[2].id,
          leaveType: 'Casual Leave',
          startDate: approvedLeaveStart,
          endDate: approvedLeaveStart,
          days: new Prisma.Decimal(1),
          reason: 'Seeded approved leave for attendance demo.',
          note: 'Auto-seeded HR sample',
          status: 'Approved',
          reviewerId: adminUser.id,
          reviewerNote: 'Approved in seed data',
          reviewedAt: addHours(approvedLeaveStart, 8),
        },
      });
    }
  }

  await prisma.attendanceRecord.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: telecallerUser.id,
        attendanceDate: todayStart,
      },
    },
    update: {
      status: 'Present',
      checkInAt: addHours(todayStart, 10.35),
      checkOutAt: addHours(todayStart, 19.1),
      source: 'PUNCH',
      shiftId: telecallingShift.id,
      isLate: true,
      lateMinutes: 11,
      lateSequenceInMonth: 1,
      derivedStatusReason: 'Punched in after the shift grace window.',
      note: 'Seeded Pre Sales punch sample',
    },
    create: {
      employeeId: telecallerUser.id,
      attendanceDate: todayStart,
      status: 'Present',
      checkInAt: addHours(todayStart, 10.35),
      checkOutAt: addHours(todayStart, 19.1),
      source: 'PUNCH',
      shiftId: telecallingShift.id,
      isLate: true,
      lateMinutes: 11,
      lateSequenceInMonth: 1,
      derivedStatusReason: 'Punched in after the shift grace window.',
      note: 'Seeded Pre Sales punch sample',
    },
  });

  if (fieldExecutives[0]) {
    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: fieldExecutives[0].id,
          attendanceDate: todayStart,
        },
      },
      update: {
        status: 'Present',
        checkInAt: addHours(todayStart, 8.95),
        checkOutAt: addHours(todayStart, 18.25),
        source: 'PUNCH',
        shiftId: fieldOpsShift.id,
        isLate: false,
        lateMinutes: 0,
        lateSequenceInMonth: null,
        derivedStatusReason: 'On-time punch-in within assigned field shift.',
        note: 'Seeded field executive punch sample',
      },
      create: {
        employeeId: fieldExecutives[0].id,
        attendanceDate: todayStart,
        status: 'Present',
        checkInAt: addHours(todayStart, 8.95),
        checkOutAt: addHours(todayStart, 18.25),
        source: 'PUNCH',
        shiftId: fieldOpsShift.id,
        isLate: false,
        lateMinutes: 0,
        lateSequenceInMonth: null,
        derivedStatusReason: 'On-time punch-in within assigned field shift.',
        note: 'Seeded field executive punch sample',
      },
    });
  }

  if (fieldExecutives[1]) {
    const yesterday = addDays(todayStart, -1);
    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: fieldExecutives[1].id,
          attendanceDate: yesterday,
        },
      },
      update: {
        status: 'Half Day',
        checkInAt: addHours(yesterday, 9.75),
        checkOutAt: addHours(yesterday, 14.5),
        source: 'PUNCH',
        shiftId: fieldOpsShift.id,
        isLate: true,
        lateMinutes: 25,
        lateSequenceInMonth: 3,
        derivedStatusReason: 'Third late punch of the month triggered half-day penalty.',
        note: 'Seeded threshold penalty sample',
      },
      create: {
        employeeId: fieldExecutives[1].id,
        attendanceDate: yesterday,
        status: 'Half Day',
        checkInAt: addHours(yesterday, 9.75),
        checkOutAt: addHours(yesterday, 14.5),
        source: 'PUNCH',
        shiftId: fieldOpsShift.id,
        isLate: true,
        lateMinutes: 25,
        lateSequenceInMonth: 3,
        derivedStatusReason: 'Third late punch of the month triggered half-day penalty.',
        note: 'Seeded threshold penalty sample',
      },
    });
  }

  await prisma.attendanceRecord.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: salesManager.id,
        attendanceDate: addDays(todayStart, -2),
      },
    },
    update: {
      status: 'Manual Correction',
      source: 'MANUAL',
      shiftId: generalShift.id,
      isLate: false,
      lateMinutes: 0,
      lateSequenceInMonth: null,
      derivedStatusReason: 'Seeded manual correction example.',
      note: 'Adjusted by admin for demo purposes',
      checkInAt: addHours(addDays(todayStart, -2), 9.5),
      checkOutAt: addHours(addDays(todayStart, -2), 18.2),
    },
    create: {
      employeeId: salesManager.id,
      attendanceDate: addDays(todayStart, -2),
      status: 'Manual Correction',
      source: 'MANUAL',
      shiftId: generalShift.id,
      isLate: false,
      lateMinutes: 0,
      lateSequenceInMonth: null,
      derivedStatusReason: 'Seeded manual correction example.',
      note: 'Adjusted by admin for demo purposes',
      checkInAt: addHours(addDays(todayStart, -2), 9.5),
      checkOutAt: addHours(addDays(todayStart, -2), 18.2),
    },
  });

  console.log(`Seeded admin user: ${email}`);
  console.log(`Seeded sales manager user: ${salesManagerEmail}`);
  console.log(`Seeded Pre Sales user: ${telecallerEmail}`);
  console.log(
    'Seeded field executive logins: field.executive@gmail.com, field.executive.two@gmail.com, field.executive.three@gmail.com / admin@123',
  );
  console.log(`Seeded ${projects.length} projects with inventory`);
  console.log(
    `Seeded ${leadsData.length} leads with requirements and project interests`,
  );
  console.log(
    'Seeded field executive team, lead assignments, live tracking, visits, follow-ups, activities, notifications, and booking data',
  );
  console.log(
    'Seeded HR shifts, employee shift assignments, sample holiday, approved leave, and punch attendance data',
  );
  console.log('Seeded project, inventory, stage, and source master values');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
