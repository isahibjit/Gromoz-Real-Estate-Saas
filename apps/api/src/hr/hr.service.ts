import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  decryptPassword,
  encryptPassword,
  isEncryptedPassword,
} from '../common/utils/cipher.util';

import { PrismaService } from '../persistence/prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { MailService } from './mail.service';
import { HrDocumentsService } from './documents.service';
import { AccessService } from '../access/access.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { REDIS_KEY_AUTH_DEACTIVATED_PREFIX } from '../auth/guards/auth.guard';
import { getUserRoleLabel } from '../common/role-labels';

type Actor = { sub: string; role: string };
type ManagedTeamSummary = {
  id: string;
  name: string;
  code: string;
  leaderId: string;
  leaderName: string | null;
};
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER']);
const MANAGER_ROLES = new Set(['MANAGER', 'SALES_MANAGER']);
const EMPLOYEE_ROLES = new Set([
  'ADMIN',
  'HR',
  'TEAM_LEADER',
  'MANAGER',
  'TELECALLER',
  'SALES_AGENT',
  'MARKETING',
  'BACKEND',
]);
const PAID_LEAVE_TYPES = new Set([
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
]);
const ATTENDANCE_PENALTY_STATUSES = new Set([
  'Half Day',
  'Absent',
  'Present',
]);
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const DEFAULT_INCENTIVE_POLICY = {
  minimumDealsToQualify: 3,
  salesIncentivePct: 2.5,
  preSalesIncentivePct: 1,
  teamLeaderIncentivePct: 0.5,
} as const;
const PAYROLL_SETTING_FIELDS = new Set(
  (
    Prisma.dmmf.datamodel.models.find((model) => model.name === 'PayrollSetting')
      ?.fields ?? []
  ).map((field) => field.name),
);
const PAYROLL_INCENTIVE_FIELDS = [
  'minimumDealsToQualify',
  'salesIncentivePct',
  'preSalesIncentivePct',
  'teamLeaderIncentivePct',
] as const;
const PAYROLL_INCENTIVE_FIELDS_SUPPORTED = PAYROLL_INCENTIVE_FIELDS.every(
  (field) => PAYROLL_SETTING_FIELDS.has(field),
);
const PAYROLL_RECORD_FIELDS = new Set(
  (
    Prisma.dmmf.datamodel.models.find((model) => model.name === 'PayrollRecord')
      ?.fields ?? []
  ).map((field) => field.name),
);
const PAYROLL_RECORD_SALARY_DIVISOR_SUPPORTED =
  PAYROLL_RECORD_FIELDS.has('salaryDivisorDays');
const PAYROLL_RECORD_MANUAL_OVERRIDE_REASON_SUPPORTED =
  PAYROLL_RECORD_FIELDS.has('manualOverrideReason');
const PAYROLL_RECORD_PF_SUPPORTED = PAYROLL_RECORD_FIELDS.has('pfAmount');
const timezone = 'Asia/Kolkata';

function isoDay(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dayDate(value: Date | string): Date {
  return new Date(
    `${
      typeof value === 'string' ? value.slice(0, 10) : isoDay(value)
    }T00:00:00.000Z`,
  );
}

function dateTimeParts(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value ?? '0');
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  };
}

function minutesSinceMidnight(value: Date | string) {
  const parts = dateTimeParts(value);
  return parts.hour * 60 + parts.minute;
}

function monthRangeForLocalDay(value: Date | string) {
  const parts = dateTimeParts(value);
  const start = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  const end = new Date(Date.UTC(parts.year, parts.month, 1));
  return { start, end };
}

function asDecimal(value: unknown, fallback = 0): Prisma.Decimal {
  if (value === undefined || value === null || value === '')
    return new Prisma.Decimal(fallback);
  const decimal = new Prisma.Decimal(String(value));
  if (decimal.isNegative())
    throw new BadRequestException('Amount cannot be negative');
  return decimal;
}

function ensureDate(value: unknown, label: string): Date {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`${label} is required`);
  }
  return dayDate(value);
}

function normalizeWorkingDays(
  value: unknown,
  fallback = DEFAULT_WORKING_DAYS,
): number[] {
  if (!Array.isArray(value)) return [...fallback];
  const unique = Array.from(
    new Set(
      value
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ).sort((a, b) => a - b);
  return unique.length ? unique : [...fallback];
}

function normalizeEmployeeMobile(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return digits.replace(/^91(?=\d{10}$)/, '');
}

function withIncentivePolicyDefaults<T extends Record<string, any>>(value: T) {
  return {
    ...value,
    minimumDealsToQualify: Number(
      value.minimumDealsToQualify ??
        DEFAULT_INCENTIVE_POLICY.minimumDealsToQualify,
    ),
    salesIncentivePct: Number(
      value.salesIncentivePct ?? DEFAULT_INCENTIVE_POLICY.salesIncentivePct,
    ),
    preSalesIncentivePct: Number(
      value.preSalesIncentivePct ??
        DEFAULT_INCENTIVE_POLICY.preSalesIncentivePct,
    ),
    teamLeaderIncentivePct: Number(
      value.teamLeaderIncentivePct ??
        DEFAULT_INCENTIVE_POLICY.teamLeaderIncentivePct,
    ),
  };
}

function roleForHr(
  value: unknown,
):
  | 'ADMIN'
  | 'HR'
  | 'TEAM_LEADER'
  | 'MANAGER'
  | 'TELECALLER'
  | 'SALES_AGENT'
  | 'MARKETING'
  | 'BACKEND' {
  if (value === 'FIELD_EXECUTIVE') return 'SALES_AGENT';
  if (
    value === 'BACKEND' ||
    value === 'BACKOFFICE' ||
    value === 'BACK_END_EXECUTIVE' ||
    value === 'BACKEND_EXECUTIVE'
  ) {
    return 'BACKEND';
  }
  if (
    value === 'ADMIN' ||
    value === 'HR' ||
    value === 'TEAM_LEADER' ||
    value === 'MANAGER' ||
    value === 'TELECALLER' ||
    value === 'SALES_AGENT' ||
    value === 'MARKETING'
  )
    return value;
  throw new BadRequestException(
    'Role must be Admin, HR, Team Leader, Manager, Pre Sales, Marketing, Back-End Executive, or Field Executive',
  );
}

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly mailService: MailService,
    private readonly documentsService: HrDocumentsService,
    private readonly accessService: AccessService,
    private readonly redisService: RedisService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async employeeJustificationMultiplierMap(userIds: string[]) {
    if (!userIds.length) return new Map<string, number>();
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ userId: string; justificationMultiplier: unknown }>
      >(
        Prisma.sql`
          SELECT "userId", "justificationMultiplier"
          FROM "EmployeeProfile"
          WHERE "userId" IN (${Prisma.join(userIds)})
        `,
      );
      return new Map(
        rows.map((row) => [
          row.userId,
          Number(row.justificationMultiplier ?? 0),
        ]),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('justificationMultiplier')) {
        return new Map<string, number>();
      }
      throw error;
    }
  }

  private normalizeJustificationMode(value: unknown) {
    return String(value ?? 'MULTIPLIER').toUpperCase() === 'MANUAL'
      ? 'MANUAL'
      : 'MULTIPLIER';
  }

  private async setEmployeeJustificationSettings(
    userId: string,
    settings: {
      justificationMultiplier?: unknown;
      justificationMode?: unknown;
      justificationAmount?: unknown;
    },
  ) {
    const multiplier = asDecimal(settings.justificationMultiplier ?? 0).toString();
    const mode = this.normalizeJustificationMode(settings.justificationMode);
    const amount = asDecimal(settings.justificationAmount ?? 0).toString();
    try {
      await this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE "EmployeeProfile"
          SET
            "justificationMultiplier" = CAST(${multiplier} AS DECIMAL),
            "justificationMode" = ${mode},
            "justificationAmount" = CASE
              WHEN ${mode} = 'MANUAL' THEN CAST(${amount} AS DECIMAL)
              ELSE NULL
            END
          WHERE "userId" = ${userId}
        `,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('justificationMultiplier') ||
        message.includes('justificationMode') ||
        message.includes('justificationAmount')
      ) {
        return;
      }
      throw error;
    }
  }

  async recordLoginAttendance(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });
    if (!user?.isActive || !EMPLOYEE_ROLES.has(user.role)) return;

    const today = dayDate(new Date());
    const { isWorkingDay, holiday, leave } =
      await this.getAttendanceDayContext(userId, today);

    await this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: userId,
          attendanceDate: today,
        },
      },
      update: {},
      create: {
        employeeId: userId,
        attendanceDate: today,
        status:
          holiday || !isWorkingDay ? 'Holiday' : leave ? 'On Leave' : 'Present',
        checkInAt: holiday || !isWorkingDay || leave ? null : new Date(),
        note: holiday
          ? holiday.name
          : !isWorkingDay
          ? 'Weekly Off'
          : leave
          ? `Approved ${leave.leaveType}`
          : 'Automatic login check-in',
      },
    });
  }

  async recordLogoutAttendance(userId: string): Promise<void> {
    const today = dayDate(new Date());
    await this.prisma.attendanceRecord.updateMany({
      where: {
        employeeId: userId,
        attendanceDate: today,
        checkInAt: { not: null },
        checkOutAt: null,
      },
      data: { checkOutAt: new Date() },
    });
  }

  async listEmployees(query: Record<string, string>, actor: Actor) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const search = query.search?.trim();
    const role = query.role === 'FIELD_EXECUTIVE' ? 'SALES_AGENT' : query.role;
    const scopedEmployeeIds = await this.resolveVisibleEmployeeIds(actor);
    const where: Prisma.UserWhereInput = {
      ...(scopedEmployeeIds ? { id: { in: scopedEmployeeIds } } : {}),
      ...(role ? { role: role as any } : {}),
      ...(query.status ? { isActive: query.status === 'Active' } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              {
                employeeProfile: {
                  OR: [
                    { employeeCode: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { designation: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
      role: role
        ? (role as any)
        : {
            in: [
              'SUPER_ADMIN',
              'ADMIN',
              'HR',
              'SALES_MANAGER',
              'TEAM_LEADER',
              'MANAGER',
              'TELECALLER',
              'SALES_AGENT',
              'MARKETING',
              'BACKEND',
            ],
          },
    };
    const today = dayDate(new Date());
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          passwordHash: true,
          isActive: true,
          twoFactorEnabled: true,
          avatarStorageKey: true,
          metadata: true,
          employeeProfile: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  leader: { select: { id: true, fullName: true } },
                },
              },
              shift: true,
            },
          },
          ledTeams: {
            select: {
              id: true,
              name: true,
            },
          },
          modulePermissions: true,
          rankingTeamAccesses: {
            select: {
              teamId: true,
              team: { select: { id: true, name: true } },
            },
          },
          teamLeaderVisibilityGrants: {
            select: {
              teamId: true,
              userId: true,
              team: { select: { id: true, name: true } },
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
          leadVisibilityOverrides: {
            select: {
              accessType: true,
              targetUserId: true,
              target: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  avatarStorageKey: true,
                },
              },
            },
          },
          attendanceRecords: {
            where: { attendanceDate: today },
            select: { status: true, checkInAt: true },
          },
        },
      }),
    ]);
    const managerIds = users
      .filter((user) => MANAGER_ROLES.has(user.role))
      .map((user) => user.id);
    const [multiplierByUserId, managedTeamsByManagerId] = await Promise.all([
      this.employeeJustificationMultiplierMap(users.map((user) => user.id)),
      this.managerTeamsByManagerId(managerIds),
    ]);
    return {
      data: users.map((user) =>
        this.mapEmployee({
          ...user,
          justificationMultiplier: multiplierByUserId.get(user.id) ?? 0,
          managedTeams: managedTeamsByManagerId.get(user.id) ?? [],
        }),
      ),
      meta: { page, limit, total },
    };
  }

  async getEmployee(id: string, actor: Actor) {
    await this.assertCanViewEmployee(id, actor);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        avatarStorageKey: true,
        metadata: true,
        employeeProfile: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                leader: { select: { id: true, fullName: true } },
              },
            },
            shift: true,
          },
        },
        ledTeams: {
          select: {
            id: true,
            name: true,
          },
        },
        modulePermissions: true,
        rankingTeamAccesses: {
          select: {
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
        teamLeaderVisibilityGrants: {
          select: {
            teamId: true,
            userId: true,
            team: { select: { id: true, name: true } },
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        leadVisibilityOverrides: {
          select: {
            accessType: true,
            targetUserId: true,
            target: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                avatarStorageKey: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Employee not found');
    const multiplierByUserId = await this.employeeJustificationMultiplierMap([
      user.id,
    ]);
    const employee = this.mapEmployee({
      ...user,
      justificationMultiplier: multiplierByUserId.get(user.id) ?? 0,
    });
    if (MANAGER_ROLES.has(user.role)) {
      const managerHierarchy = await this.managerHierarchySummary(user.id);
      const managedTeams = managerHierarchy.teamLeaders.flatMap((leader) =>
        leader.teams.map((team) => ({
          ...team,
          leaderId: leader.id,
          leaderName: leader.name,
        })),
      );
      return {
        ...employee,
        managedTeamIds: managedTeams.map((team) => team.id),
        managedTeams,
        managerHierarchy,
      };
    }
    return employee;
  }

  async createEmployee(body: Record<string, unknown>, actor: Actor) {
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName =
      typeof body.fullName === 'string' ? body.fullName.trim() : '';
    if (!email || !fullName)
      throw new BadRequestException('Name and email are required');
    const role = roleForHr(body.role);
    const joiningDate = ensureDate(body.joiningDate, 'Joining date');
    const phone = this.text(body.phone);
    await this.assertUniqueActiveEmployeeMobile(phone);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('An employee with this email already exists');
    const count = await this.prisma.employeeProfile.count();
    const employeeCode =
      typeof body.employeeCode === 'string' && body.employeeCode.trim()
        ? body.employeeCode.trim().toUpperCase()
        : `EMP-${String(count + 1).padStart(5, '0')}`;
    const password =
      typeof body.password === 'string' && body.password.length >= 8
        ? body.password
        : 'ChangeMe@123';
    const requestedLeaderOfTeamId = this.text(body.leaderOfTeamId);
    this.assertTeamLeaderAssignment(role, requestedLeaderOfTeamId);
    if (requestedLeaderOfTeamId) {
      await this.assertTeamCanAcceptLeader(requestedLeaderOfTeamId);
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        role,
        passwordHash: encryptPassword(password),
        isActive: true,
        twoFactorEnabled: body.twoFactorEnabled === true,
        avatarStorageKey: typeof body.image === 'string' ? body.image : null,
        metadata: {
          currentPassword: password,
        },
        employeeProfile: {
          create: {
            employeeCode,
            joiningDate,
            designation: this.text(body.designation),
            phone,
            address: this.text(body.address),
            reportingToId: this.text(body.reportingToId),
            monthlyBasic: asDecimal(body.monthlyBasic),
            monthlyAllowances: asDecimal(body.monthlyAllowances),
            monthlyDeductions: asDecimal(body.monthlyDeductions),
            teamId: this.text(body.teamId),
            shiftId: await this.resolveShiftId(body.shiftId),
          },
        },
      },
      include: {
        employeeProfile: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                leader: { select: { id: true, fullName: true } },
              },
            },
            shift: true,
          },
        },
        ledTeams: {
          select: {
            id: true,
            name: true,
          },
        },
        modulePermissions: true,
        rankingTeamAccesses: {
          select: {
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
        teamLeaderVisibilityGrants: {
          select: {
            teamId: true,
            userId: true,
            team: { select: { id: true, name: true } },
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (role === 'TEAM_LEADER') {
      await this.applyEmployeeTeamLeadership(user.id, requestedLeaderOfTeamId);
    }
    if (body.managedTeamIds !== undefined) {
      await this.applyManagerTeamAssignments(user.id, body.managedTeamIds);
    }
    await this.setEmployeeJustificationSettings(user.id, {
      justificationMultiplier: body.justificationMultiplier,
      justificationMode: body.justificationMode,
      justificationAmount: body.justificationAmount,
    });
    await this.accessService.applyEmployeePermissions(
      user.id,
      body.permissions ?? body.modulePermissions,
      user.role,
      actor,
    );
    await this.accessService.applyEmployeeRankingTeamAccess(
      user.id,
      body.rankingTeamIds,
      actor,
    );
    await this.accessService.applyTeamLeaderVisibilityAccess(
      user.id,
      body.monitorTeamIds,
      body.monitorUserIds,
      actor,
    );
    await this.accessService.applyLeadVisibilityOverrides(
      user.id,
      body.leadVisibilityAllowedUserIds,
      body.leadVisibilityBlockedUserIds,
      actor,
    );
    const employee = await this.getEmployeeForMapping(user.id);
    await this.audit(
      actor.sub,
      'EMPLOYEE_CREATED',
      'EmployeeProfile',
      user.id,
      { employeeCode, role },
    );
    return {
      employee: this.mapEmployee(employee),
      temporaryPassword: password === 'ChangeMe@123' ? password : undefined,
    };
  }

  async updateEmployee(
    id: string,
    body: Record<string, unknown>,
    actor: Actor,
  ) {
    this.assertSelfOrAdmin(id, actor);

    let sanitizedBody = body;
    const isAdmin = ADMIN_ROLES.has(actor.role);
    if (!isAdmin) {
      const allowedKeys = ['fullName', 'phone', 'address', 'image', 'password'];
      sanitizedBody = {};
      for (const key of allowedKeys) {
        if (body[key] !== undefined) {
          sanitizedBody[key] = body[key];
        }
      }
    }

    const current = await this.prisma.user.findUnique({
      where: { id },
      include: {
        employeeProfile: { include: { shift: true } },
        ledTeams: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (!current) throw new NotFoundException('Employee not found');
    const profile = current.employeeProfile;
    const nextPassword =
      typeof sanitizedBody.password === 'string' && sanitizedBody.password.trim()
        ? sanitizedBody.password.trim()
        : null;
    if (nextPassword && nextPassword.length < 8)
      throw new BadRequestException('Password must be at least 8 characters');
    const requestedTeamId =
      sanitizedBody.teamId !== undefined ? this.text(sanitizedBody.teamId) : undefined;
    const requestedShiftId =
      sanitizedBody.shiftId !== undefined
        ? await this.resolveShiftId(sanitizedBody.shiftId)
        : undefined;
    const requestedReportingToId =
      sanitizedBody.reportingToId !== undefined
        ? this.text(sanitizedBody.reportingToId)
        : undefined;
    const requestedLeaderOfTeamId =
      sanitizedBody.leaderOfTeamId !== undefined
        ? this.text(sanitizedBody.leaderOfTeamId)
        : undefined;
    const nextRole = sanitizedBody.role
      ? roleForHr(sanitizedBody.role)
      : current.role;
    const effectiveLeaderOfTeamId =
      requestedLeaderOfTeamId !== undefined
        ? requestedLeaderOfTeamId
        : nextRole === 'TEAM_LEADER'
          ? current.ledTeams[0]?.id ?? null
          : null;
    this.assertTeamLeaderAssignment(nextRole, effectiveLeaderOfTeamId);
    if (requestedTeamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: requestedTeamId },
        select: { leaderId: true },
      });
      if (team?.leaderId === id) {
        throw new BadRequestException(
          'Team leader cannot also be assigned as a member of the same team',
        );
      }
    }
    if (requestedLeaderOfTeamId) {
      await this.assertTeamCanAcceptLeader(requestedLeaderOfTeamId, id);
    }
    if (typeof sanitizedBody.phone === 'string') {
      await this.assertUniqueActiveEmployeeMobile(
        sanitizedBody.phone.trim(),
        id,
      );
    }
    const nextEmployeeCode =
      typeof sanitizedBody.employeeCode === 'string' &&
      sanitizedBody.employeeCode.trim()
        ? sanitizedBody.employeeCode.trim().toUpperCase()
        : profile?.employeeCode;
    let createdEmployeeCode = nextEmployeeCode;
    if (!profile && !createdEmployeeCode) {
      const count = await this.prisma.employeeProfile.count();
      createdEmployeeCode = `EMP-${String(count + 1).padStart(5, '0')}`;
    }
    const nextJoiningDate = sanitizedBody.joiningDate
      ? ensureDate(sanitizedBody.joiningDate, 'Joining date')
      : profile?.joiningDate ?? new Date();
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(typeof sanitizedBody.fullName === 'string'
          ? { fullName: sanitizedBody.fullName.trim() }
          : {}),
        ...(typeof sanitizedBody.email === 'string'
          ? { email: sanitizedBody.email.trim().toLowerCase() }
          : {}),
        ...(sanitizedBody.role ? { role: nextRole } : {}),
        ...(typeof sanitizedBody.isActive === 'boolean'
          ? { isActive: sanitizedBody.isActive }
          : {}),
        ...(typeof sanitizedBody.twoFactorEnabled === 'boolean'
          ? { twoFactorEnabled: sanitizedBody.twoFactorEnabled }
          : {}),
        ...(typeof sanitizedBody.image === 'string'
          ? { avatarStorageKey: sanitizedBody.image }
          : {}),
        ...(nextPassword
          ? {
              passwordHash: encryptPassword(nextPassword),
              lastPasswordChange: new Date(),
              metadata: {
                ...((current.metadata as Record<string, unknown>) ?? {}),
                currentPassword: nextPassword,
              },
            }
          : {}),
        employeeProfile: profile
          ? {
              update: {
                ...(typeof sanitizedBody.employeeCode === 'string'
                  ? { employeeCode: sanitizedBody.employeeCode.trim().toUpperCase() }
                  : {}),
                ...(typeof sanitizedBody.designation === 'string'
                  ? { designation: sanitizedBody.designation.trim() }
                  : {}),
                ...(typeof sanitizedBody.phone === 'string'
                  ? { phone: sanitizedBody.phone.trim() }
                  : {}),
                ...(typeof sanitizedBody.address === 'string'
                  ? { address: sanitizedBody.address.trim() }
                  : {}),
                ...(sanitizedBody.reportingToId !== undefined
                  ? { reportingToId: requestedReportingToId }
                  : {}),
                ...(typeof sanitizedBody.employmentStatus === 'string'
                  ? { employmentStatus: sanitizedBody.employmentStatus }
                  : {}),
                ...(sanitizedBody.joiningDate
                  ? {
                      joiningDate: ensureDate(sanitizedBody.joiningDate, 'Joining date'),
                    }
                  : {}),
                ...(sanitizedBody.monthlyBasic !== undefined
                  ? { monthlyBasic: asDecimal(sanitizedBody.monthlyBasic) }
                  : {}),
                ...(sanitizedBody.monthlyAllowances !== undefined
                  ? { monthlyAllowances: asDecimal(sanitizedBody.monthlyAllowances) }
                  : {}),
                ...(sanitizedBody.monthlyDeductions !== undefined
                  ? { monthlyDeductions: asDecimal(sanitizedBody.monthlyDeductions) }
                  : {}),
                ...(sanitizedBody.teamId !== undefined
                  ? { teamId: requestedTeamId }
                  : {}),
                ...(sanitizedBody.shiftId !== undefined
                  ? { shiftId: requestedShiftId }
                  : {}),
              },
            }
          : {
              create: {
                employeeCode: createdEmployeeCode!,
                joiningDate: nextJoiningDate,
                ...(typeof sanitizedBody.designation === 'string'
                  ? { designation: sanitizedBody.designation.trim() }
                  : {}),
                ...(typeof sanitizedBody.phone === 'string'
                  ? { phone: sanitizedBody.phone.trim() }
                  : {}),
                ...(typeof sanitizedBody.address === 'string'
                  ? { address: sanitizedBody.address.trim() }
                  : {}),
                ...(requestedReportingToId !== undefined
                  ? { reportingToId: requestedReportingToId }
                  : {}),
                ...(typeof sanitizedBody.employmentStatus === 'string'
                  ? { employmentStatus: sanitizedBody.employmentStatus }
                  : {}),
                ...(sanitizedBody.monthlyBasic !== undefined
                  ? { monthlyBasic: asDecimal(sanitizedBody.monthlyBasic) }
                  : {}),
                ...(sanitizedBody.monthlyAllowances !== undefined
                  ? { monthlyAllowances: asDecimal(sanitizedBody.monthlyAllowances) }
                  : {}),
                ...(sanitizedBody.monthlyDeductions !== undefined
                  ? { monthlyDeductions: asDecimal(sanitizedBody.monthlyDeductions) }
                  : {}),
                ...(sanitizedBody.teamId !== undefined
                  ? { teamId: requestedTeamId }
                  : {}),
                ...(sanitizedBody.shiftId !== undefined
                  ? { shiftId: requestedShiftId }
                  : {}),
              },
            },
      },
      include: {
        employeeProfile: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                leader: { select: { id: true, fullName: true } },
              },
            },
            shift: true,
          },
        },
        ledTeams: {
          select: {
            id: true,
            name: true,
          },
        },
        modulePermissions: true,
        rankingTeamAccesses: {
          select: {
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
    });
    const isDeactivating =
      sanitizedBody.isActive === false ||
      sanitizedBody.employmentStatus === 'Inactive';
    const isActivating =
      sanitizedBody.isActive === true ||
      sanitizedBody.employmentStatus === 'Active';

    if (isDeactivating) {
      await Promise.all([
        this.redisService
          .set(`${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${id}`, '1', 7 * 24 * 60 * 60)
          .catch(() => undefined),
        this.redisService.del(`auth:refresh-token:${id}`).catch(() => undefined),
        this.redisService.del(`auth:previous-refresh-token:${id}`).catch(() => undefined),
        this.prisma.mobileDeviceToken?.updateMany?.({
          where: { userId: id },
          data: { isActive: false },
        })?.catch(() => undefined),
      ]);
      this.realtimeService.emitUserSessionExpired(
        id,
        'Your account has been deactivated. Please contact an administrator.',
      );
    } else if (isActivating) {
      await Promise.all([
        this.redisService
          .del(`${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${id}`)
          .catch(() => undefined),
        this.redisService.del(`auth:failed-attempts:${id}`).catch(() => undefined),
      ]);
    }
    if (
      sanitizedBody.justificationMultiplier !== undefined ||
      sanitizedBody.justificationMode !== undefined ||
      sanitizedBody.justificationAmount !== undefined
    ) {
      await this.setEmployeeJustificationSettings(id, {
        justificationMultiplier: sanitizedBody.justificationMultiplier,
        justificationMode: sanitizedBody.justificationMode,
        justificationAmount: sanitizedBody.justificationAmount,
      });
    }
    if (
      sanitizedBody.leaderOfTeamId !== undefined ||
      (current.ledTeams.length > 0 && nextRole !== 'TEAM_LEADER')
    ) {
      await this.applyEmployeeTeamLeadership(id, requestedLeaderOfTeamId ?? null);
    }
    if (sanitizedBody.managedTeamIds !== undefined) {
      await this.applyManagerTeamAssignments(id, sanitizedBody.managedTeamIds);
    }
    await this.accessService.applyEmployeePermissions(
      id,
      sanitizedBody.permissions ?? sanitizedBody.modulePermissions,
      user.role,
      actor,
    );
    await this.accessService.applyEmployeeRankingTeamAccess(
      id,
      sanitizedBody.rankingTeamIds,
      actor,
    );
    await this.accessService.applyTeamLeaderVisibilityAccess(
      id,
      sanitizedBody.monitorTeamIds,
      sanitizedBody.monitorUserIds,
      actor,
    );
    await this.accessService.applyLeadVisibilityOverrides(
      id,
      sanitizedBody.leadVisibilityAllowedUserIds,
      sanitizedBody.leadVisibilityBlockedUserIds,
      actor,
    );
    const updatedEmployee = await this.getEmployeeForMapping(id);
    await this.audit(actor.sub, 'EMPLOYEE_UPDATED', 'EmployeeProfile', id, {
      active: user.isActive,
    });
    return this.mapEmployee(updatedEmployee);
  }

  async deleteEmployee(id: string, actor: Actor) {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only admins can permanently delete employees',
      );
    }
    if (id === actor.sub) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const target = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        employeeProfile: { select: { employeeCode: true } },
      },
    });
    if (!target) throw new NotFoundException('Employee not found');

    if (target.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot delete a Super Admin account');
    }

    // Nullify AuditLog references (no onDelete defined, would block deletion)
    await this.prisma.auditLog.updateMany({
      where: { actorUserId: id },
      data: { actorUserId: null },
    });

    // Reassign MobileAppRelease uploads to current admin (onDelete: Restrict)
    await this.prisma.mobileAppRelease.updateMany({
      where: { uploaderId: id },
      data: { uploaderId: actor.sub },
    });

    // Nullify Lead ownership references (plain string columns, no FK)
    const leadNullifyFields = [
      'ownerId',
      'managerId',
      'telecallerId',
      'fieldExecutiveId',
      'createdById',
      'deletedById',
    ] as const;
    for (const field of leadNullifyFields) {
      await this.prisma.lead.updateMany({
        where: { [field]: id },
        data: { [field]: null },
      });
    }

    // Nullify EmployeeProfile.reportingToId references
    await this.prisma.employeeProfile.updateMany({
      where: { reportingToId: id },
      data: { reportingToId: null },
    });

    // Clear team leadership (set Team.leaderId to null)
    await this.prisma.team.updateMany({
      where: { leaderId: id },
      data: { leaderId: null },
    });

    // Delete the user — Prisma cascades handle:
    // EmployeeProfile, AttendanceRecord, LeaveRequest, PayrollRecord, Payslip,
    // TeamMembership, TeamLeaderVisibilityGrant, LeadVisibilityOverride,
    // UserModulePermission, UserRankingTeamAccess, UserCommissionTarget,
    // MobileDeviceToken, LoginOtpChallenge, BookingExtraIncentive (recipient)
    await this.prisma.user.delete({ where: { id } });

    // Invalidate sessions across devices and purge tokens
    this.realtimeService.emitUserSessionExpired(id, 'Your account has been deleted.');
    await Promise.all([
      this.redisService
        .set(`${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${id}`, '1', 7 * 24 * 60 * 60)
        .catch(() => undefined),
      this.redisService.del(`auth:refresh-token:${id}`).catch(() => undefined),
      this.redisService.del(`auth:previous-refresh-token:${id}`).catch(() => undefined),
      this.redisService.del(`auth:failed-attempts:${id}`).catch(() => undefined),
    ]);

    await this.audit(actor.sub, 'EMPLOYEE_DELETED', 'User', id, {
      deletedName: target.fullName,
      deletedEmail: target.email,
      deletedRole: target.role,
      employeeCode: target.employeeProfile?.employeeCode,
    });

    return { success: true };
  }

  async listShifts(query: Record<string, string>) {
    const includeInactive = query.includeInactive === 'true';
    const data = await this.prisma.shiftTemplate.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return { data };
  }

  async createShift(body: Record<string, unknown>, actor: Actor) {
    const payload = this.parseShiftBody(body);
    const shift = await this.prisma.shiftTemplate.create({
      data: payload as Prisma.ShiftTemplateCreateInput,
    });
    await this.audit(actor.sub, 'SHIFT_CREATED', 'ShiftTemplate', shift.id, {
      name: shift.name,
    });
    return shift;
  }

  async updateShift(id: string, body: Record<string, unknown>, actor: Actor) {
    await this.ensureShiftExists(id);
    const payload = this.parseShiftBody(body, true);
    const shift = await this.prisma.shiftTemplate.update({
      where: { id },
      data: payload,
    });
    await this.audit(actor.sub, 'SHIFT_UPDATED', 'ShiftTemplate', shift.id, {
      name: shift.name,
    });
    return shift;
  }

  async getTodayAttendance(actor: Actor) {
    const profile = await this.getEmployeeAttendanceProfile(actor.sub);
    const today = dayDate(new Date());
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId: actor.sub,
          attendanceDate: today,
        },
      },
      include: {
        shift: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
            employeeProfile: {
              select: {
                employeeCode: true,
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    const dayContext = await this.getAttendanceDayContext(actor.sub, today);
    return this.buildTodayAttendance(profile, record, dayContext);
  }

  async punchIn(body: Record<string, unknown>, actor: Actor) {
    const now = new Date();
    const today = dayDate(now);
    const profile = await this.getEmployeeAttendanceProfile(actor.sub);
    const shift = profile.employeeProfile?.shift;
    const checkInImageUrl = String(body.checkInImageUrl ?? '').trim();
    const punchInNote = this.text(body.note ?? body.reason);
    if (punchInNote && punchInNote.length > 500) {
      throw new BadRequestException(
        'Punch-in reason must be 500 characters or fewer',
      );
    }
    if (!checkInImageUrl) {
      throw new BadRequestException(
        'Capture and confirm your selfie before punching in',
      );
    }
    if (!shift?.isActive) {
      throw new BadRequestException(
        'Assign an active shift before punching in',
      );
    }

    const dayContext = await this.getAttendanceDayContext(actor.sub, today);
    if (dayContext.holiday) {
      throw new BadRequestException(
        `Punch in is blocked for today: ${dayContext.holiday.name}`,
      );
    }
    if (dayContext.leave) {
      throw new BadRequestException(
        `Punch in is blocked for approved ${dayContext.leave.leaveType}`,
      );
    }
    if (!dayContext.isWorkingDay) {
      throw new BadRequestException('Punch in is blocked on weekly off');
    }

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId: actor.sub,
          attendanceDate: today,
        },
      },
    });
    if (existing?.checkInAt) {
      throw new ConflictException('You have already punched in today');
    }
    if (
      existing &&
      ['Manual Correction', 'On Leave', 'Holiday'].includes(existing.status)
    ) {
      throw new ConflictException(
        'Attendance for today is already locked by an existing record',
      );
    }

    const shiftStartWithGrace =
      shift.startTimeMinutes + Math.max(0, shift.lateGraceMinutes);
    const arrivalMinutes = minutesSinceMidnight(now);
    const lateMinutes = Math.max(0, arrivalMinutes - shiftStartWithGrace);
    const isLate = lateMinutes > 0;
    const lateSequenceInMonth = isLate
      ? (await this.countLatePunchesThisMonth(actor.sub, today)) + 1
      : null;
    const thresholdReached =
      isLate &&
      lateSequenceInMonth !== null &&
      lateSequenceInMonth >= shift.lateThresholdCount;
    const status = thresholdReached
      ? shift.latePenaltyStatus
      : 'Present';
    const derivedStatusReason = thresholdReached
      ? `Late punch ${lateSequenceInMonth}/${shift.lateThresholdCount}`
      : isLate
      ? `Late by ${lateMinutes} minutes`
      : 'Within shift grace';

    const checkInLocationAddress =
      typeof body.checkInLocationAddress === 'string'
        ? body.checkInLocationAddress.trim() || undefined
        : undefined;
    const checkInLatitude =
      typeof body.checkInLatitude === 'number'
        ? body.checkInLatitude
        : body.checkInLatitude
        ? Number(body.checkInLatitude)
        : undefined;
    const checkInLongitude =
      typeof body.checkInLongitude === 'number'
        ? body.checkInLongitude
        : body.checkInLongitude
        ? Number(body.checkInLongitude)
        : undefined;

    const record = await this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: actor.sub,
          attendanceDate: today,
        },
      },
      update: {
        status,
        checkInAt: now,
        checkInImageUrl,
        checkInImageCapturedAt: now,
        checkInLocationAddress,
        checkInLatitude: isNaN(Number(checkInLatitude)) ? undefined : checkInLatitude,
        checkInLongitude: isNaN(Number(checkInLongitude)) ? undefined : checkInLongitude,
        source: 'PUNCH',
        shiftId: shift.id,
        isLate,
        lateMinutes,
        lateSequenceInMonth,
        derivedStatusReason,
        note: punchInNote ?? 'Punched in',
      },
      create: {
        employeeId: actor.sub,
        attendanceDate: today,
        status,
        checkInAt: now,
        checkInImageUrl,
        checkInImageCapturedAt: now,
        checkInLocationAddress,
        checkInLatitude: isNaN(Number(checkInLatitude)) ? undefined : checkInLatitude,
        checkInLongitude: isNaN(Number(checkInLongitude)) ? undefined : checkInLongitude,
        source: 'PUNCH',
        shiftId: shift.id,
        isLate,
        lateMinutes,
        lateSequenceInMonth,
        derivedStatusReason,
        note: punchInNote ?? 'Punched in',
      },
      include: {
        shift: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
            employeeProfile: {
              select: {
                employeeCode: true,
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    await this.audit(actor.sub, 'ATTENDANCE_PUNCH_IN', 'AttendanceRecord', record.id, {
      status,
      isLate,
      lateSequenceInMonth,
      checkInImageUrl,
      note: punchInNote,
    });

    return this.buildTodayAttendance(profile, record, dayContext);
  }

  async punchOut(body: Record<string, unknown>, actor: Actor) {
    const now = new Date();
    const today = dayDate(now);
    const checkOutImageUrl = String(body.checkOutImageUrl ?? '').trim();
    if (!checkOutImageUrl) {
      throw new BadRequestException(
        'Capture and confirm your selfie before punching out',
      );
    }
    const profile = await this.getEmployeeAttendanceProfile(actor.sub);
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId: actor.sub,
          attendanceDate: today,
        },
      },
      include: {
        shift: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
            employeeProfile: {
              select: {
                employeeCode: true,
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!record?.checkInAt) {
      throw new BadRequestException('Punch in before punching out');
    }
    if (record.checkOutAt) {
      throw new ConflictException('You have already punched out today');
    }
    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutAt: now,
        checkOutImageUrl,
        checkOutImageCapturedAt: now,
      },
      include: {
        shift: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
            employeeProfile: {
              select: {
                employeeCode: true,
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    await this.audit(
      actor.sub,
      'ATTENDANCE_PUNCH_OUT',
      'AttendanceRecord',
      updated.id,
      { checkOutImageUrl },
    );
    const dayContext = await this.getAttendanceDayContext(actor.sub, today);
    return this.buildTodayAttendance(profile, updated, dayContext);
  }

  async listAttendance(query: Record<string, string>, actor: Actor) {
    const today = dayDate(new Date());
    const month = Number(query.month) || today.getUTCMonth() + 1;
    const year = Number(query.year) || today.getUTCFullYear();
    const start = query.dateFrom
      ? ensureDate(query.dateFrom, 'From date')
      : new Date(Date.UTC(year, month - 1, 1));
    const endInclusive = query.dateTo
      ? ensureDate(query.dateTo, 'To date')
      : query.dateFrom
      ? start
      : new Date(Date.UTC(year, month, 0));
    if (endInclusive < start)
      throw new BadRequestException('To date cannot be before from date');
    const daysInRange =
      Math.floor(
        (endInclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;
    if (daysInRange > 31)
      throw new BadRequestException('Attendance range cannot exceed 31 days');
    const end = new Date(endInclusive);
    end.setUTCDate(end.getUTCDate() + 1);
    const isAdmin = ADMIN_ROLES.has(actor.role);
    const employeeId = isAdmin ? query.employeeId : actor.sub;
    const normalizedStatus = this.text(query.status);
    const role =
      query.role === 'FIELD_EXECUTIVE' ? 'SALES_AGENT' : this.text(query.role);
    const search = this.text(query.search);
    const teamId = this.text(query.teamId);

    const employeeWhere: Prisma.UserWhereInput = isAdmin
      ? {
      isActive: true,
      role: role
        ? (role as any)
        : {
            in: [
              'ADMIN',
              'HR',
              'TEAM_LEADER',
              'MANAGER',
              'TELECALLER',
              'SALES_AGENT',
              'MARKETING',
              'BACKEND',
            ],
          },
      ...(employeeId ? { id: employeeId } : {}),
      ...(teamId
        ? { employeeProfile: { is: { teamId } } }
        : { employeeProfile: { isNot: null } }),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              {
                employeeProfile: {
                  is: {
                    employeeCode: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    }
      : {
          id: actor.sub,
          isActive: true,
        };

    const [employees, records, settings, holidaysInRange, approvedLeaves] =
      await Promise.all([
        this.prisma.user.findMany({
        where: employeeWhere,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          avatarStorageKey: true,
          employeeProfile: {
            select: {
              employeeCode: true,
              teamId: true,
              team: { select: { id: true, name: true } },
              shift: true,
            },
          },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          attendanceDate: { gte: start, lt: end },
          ...(employeeId ? { employeeId } : {}),
        },
        include: {
          shift: true,
          employee: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              avatarStorageKey: true,
              employeeProfile: {
                select: {
                  employeeCode: true,
                  teamId: true,
                  team: { select: { id: true, name: true } },
                  shift: true,
                },
              },
            },
          },
        },
      }),
        this.getPayrollSettings(),
        this.prisma.holiday.findMany({
          where: { holidayDate: { gte: start, lt: end } },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            status: 'Approved',
            employeeId: { in: (await this.prisma.user.findMany({
              where: employeeWhere,
              select: { id: true },
            })).map((user) => user.id) },
            startDate: { lte: endInclusive },
            endDate: { gte: start },
          },
        }),
      ]);
    const holidayMap = new Map(
      holidaysInRange.map((h) => [h.holidayDate.toISOString().slice(0, 10), h]),
    );

    const recordMap = new Map(
      records.map((record) => [
        `${record.employeeId}:${record.attendanceDate
          .toISOString()
          .slice(0, 10)}`,
        record,
      ]),
    );
    const leaveMap = new Map<string, any>();
    for (const leave of approvedLeaves) {
      for (
        let day = dayDate(leave.startDate);
        day <= dayDate(leave.endDate);
        day.setUTCDate(day.getUTCDate() + 1)
      ) {
        const dayKey = day.toISOString().slice(0, 10);
        leaveMap.set(`${leave.employeeId}:${dayKey}`, leave);
      }
    }

    const rows: any[] = [];
    for (let offset = 0; offset < daysInRange; offset += 1) {
      const attendanceDate = new Date(start);
      attendanceDate.setUTCDate(start.getUTCDate() + offset);
      const dateKey = attendanceDate.toISOString().slice(0, 10);
      const dayOfWeek = attendanceDate.getUTCDay();
      const holiday = holidayMap.get(dateKey);

      for (const employee of employees) {
        const employeeWorkingDays = this.workingDaysForShift(
          employee.employeeProfile?.shift,
          settings,
        );
        const isWorkingDay = employeeWorkingDays.includes(dayOfWeek);
        const record = recordMap.get(`${employee.id}:${dateKey}`);
        if (record) {
          rows.push(this.mapAttendanceRecord(record));
        } else {
          const leave = leaveMap.get(`${employee.id}:${dateKey}`);
          const isHoliday = !isWorkingDay || !!holiday;
          const isPastWorkingDay =
            attendanceDate.getTime() < today.getTime() && isWorkingDay && !holiday;
          rows.push({
            id: `missing-${employee.id}-${dateKey}`,
            employeeId: employee.id,
            attendanceDate,
            status: leave
              ? 'On Leave'
              : isHoliday
              ? 'Holiday'
              : isPastWorkingDay
              ? 'Absent'
              : 'Not Checked In',
            checkInAt: null,
            checkOutAt: null,
            source: leave ? 'LEAVE' : isHoliday ? 'HOLIDAY' : null,
            shiftId: employee.employeeProfile?.shift?.id ?? null,
            shift: employee.employeeProfile?.shift ?? null,
            isLate: false,
            lateMinutes: 0,
            lateSequenceInMonth: null,
            derivedStatusReason: leave
              ? `Approved ${leave.leaveType}`
              : holiday
              ? holiday.name
              : !isWorkingDay
              ? 'Weekly off for assigned shift'
              : isPastWorkingDay
              ? 'No punch recorded for working day'
              : 'Awaiting punch in',
            note: holiday
              ? holiday.name
              : !isWorkingDay
              ? 'Weekly off for assigned shift'
              : leave
              ? `Approved ${leave.leaveType}`
              : isPastWorkingDay
              ? 'No punch recorded'
              : 'No punch recorded yet',
            isGenerated: true,
            employee: this.mapAttendanceEmployee(employee),
          });
        }
      }
    }
    const filteredRows =
      normalizedStatus && normalizedStatus !== 'all'
        ? rows.filter((row) => {
            const status = String(row.status ?? '').toLowerCase();
            const requestedStatus = normalizedStatus.toLowerCase();
            if (
              requestedStatus === 'late' ||
              requestedStatus === 'late present'
            ) {
              return Boolean(row.isLate);
            }
            return status === requestedStatus;
          })
        : rows;
    return {
      data: filteredRows.sort((a, b) => {
        const dateDelta =
          new Date(b.attendanceDate).getTime() -
          new Date(a.attendanceDate).getTime();
        if (dateDelta !== 0) return dateDelta;
        return String(a.employee?.fullName ?? '').localeCompare(
          String(b.employee?.fullName ?? ''),
        );
      }),
    };
  }

  async getAttendanceReportPdf(query: Record<string, string>, actor: Actor) {
    const month = Number(query.month);
    const year = Number(query.year);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Year must be a valid four-digit year');
    }

    const isAdmin = ADMIN_ROLES.has(actor.role);
    const requestedEmployeeId = this.text(query.employeeId);
    const includeAllEmployees = isAdmin && requestedEmployeeId === 'all';
    const employeeId = isAdmin ? requestedEmployeeId : actor.sub;
    if (!employeeId) {
      throw new BadRequestException('Select an employee to download the report');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const employeeSelect = {
      id: true,
      fullName: true,
      email: true,
      role: true,
      avatarStorageKey: true,
      employeeProfile: {
        select: {
          employeeCode: true,
          designation: true,
          phone: true,
          teamId: true,
          team: { select: { id: true, name: true } },
          shift: true,
        },
      },
    } as const;
    const employees = includeAllEmployees
      ? await this.prisma.user.findMany({
          where: {
            isActive: true,
            employeeProfile: { isNot: null },
          },
          select: employeeSelect,
          orderBy: { fullName: 'asc' },
        })
      : [
          await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: employeeSelect,
          }),
        ].filter((employee): employee is NonNullable<typeof employee> =>
          Boolean(employee),
        );

    if (!employees.length) throw new NotFoundException('Employee not found');
    if (!isAdmin && employees[0]?.id !== actor.sub) {
      throw new ForbiddenException('You can only download your own attendance report');
    }

    const [settings, holidays, attendanceResponse] = await Promise.all([
      this.getPayrollSettings(),
      this.prisma.holiday.findMany({
        where: { holidayDate: { gte: start, lt: end } },
        select: { holidayDate: true, name: true },
      }),
      this.listAttendance(
        {
          month: String(month),
          year: String(year),
          ...(includeAllEmployees ? {} : { employeeId }),
        },
        actor,
      ),
    ]);

    const holidaySet = new Set(
      holidays.map((holiday) => holiday.holidayDate.toISOString().slice(0, 10)),
    );
    const monthName = start.toLocaleDateString('en-IN', {
      month: 'long',
      timeZone: 'UTC',
    });

    const allRows = attendanceResponse.data ?? [];
    const reports = employees.map((employee) => {
      const rows = allRows
        .filter((record: any) => record.employeeId === employee.id)
        .sort(
          (left: any, right: any) =>
            new Date(left.attendanceDate).getTime() -
            new Date(right.attendanceDate).getTime(),
        );
      const shift = employee.employeeProfile?.shift ?? null;
      const workingDays = this.workingDaysForShift(shift, settings);
      const shiftMinutes = this.attendanceReportShiftDuration(shift);
      let scheduledMinutes = 0;
      for (
        let day = new Date(start);
        day < end;
        day.setUTCDate(day.getUTCDate() + 1)
      ) {
        if (
          workingDays.includes(day.getUTCDay()) &&
          !holidaySet.has(day.toISOString().slice(0, 10))
        ) {
          scheduledMinutes += shiftMinutes;
        }
      }
      const employeeName = employee.fullName || employee.email || 'employee';
      return {
        title: `ATTENDANCE REPORT FOR THE MONTH of ${monthName} ${year}`,
        companyName: 'Truroot Realty CRM',
        employee: {
          name: employeeName,
          phone: employee.employeeProfile?.phone ?? '-',
          branch: employee.employeeProfile?.team?.name ?? 'Unassigned',
          department: this.attendanceReportRoleLabel(employee.role),
          employeeCode: employee.employeeProfile?.employeeCode ?? '-',
          designation:
            employee.employeeProfile?.designation ??
            this.attendanceReportRoleLabel(employee.role),
          schedule: shift?.name
            ? `${shift.name} (${this.formatMinutes(shift.startTimeMinutes)} - ${this.formatMinutes(shift.endTimeMinutes)})`
            : '-',
          scheduledWorkingHours: this.formatAttendanceReportDuration(
            scheduledMinutes,
          ),
        },
        summary: this.buildAttendanceReportSummary(rows),
        days: rows.map((record: any) => this.mapAttendanceReportDay(record)),
      };
    });

    const pdfBuffer = await this.documentsService.generateAttendanceReportPdf(
      reports,
    );

    const employeeName = employees[0]?.fullName || employees[0]?.email || 'employee';
    const safeName = employeeName
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return {
      pdfBuffer,
      fileName: includeAllEmployees
        ? `attendance-report-all-employees-${year}-${String(month).padStart(
            2,
            '0',
          )}.pdf`
        : `attendance-report-${safeName || 'employee'}-${year}-${String(
            month,
          ).padStart(2, '0')}.pdf`,
    };
  }

  async correctAttendance(
    id: string,
    body: Record<string, unknown>,
    actor: Actor,
  ) {
    const reason = this.text(body.reason);
    if (!reason)
      throw new BadRequestException('A correction reason is required');
    const attendance = await this.prisma.attendanceRecord.findUnique({
      where: { id },
    });
    if (!attendance) throw new NotFoundException('Attendance record not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.attendanceRecord.update({
        where: { id },
        data: {
          ...(typeof body.status === 'string' ? { status: body.status } : {}),
          ...(typeof body.checkInAt === 'string'
            ? { checkInAt: new Date(body.checkInAt) }
            : {}),
          ...(typeof body.checkOutAt === 'string'
            ? { checkOutAt: new Date(body.checkOutAt) }
            : {}),
          source: 'MANUAL',
          derivedStatusReason: reason,
          note: reason,
        },
      });
      await tx.attendanceAudit.create({
        data: {
          attendanceId: id,
          actorId: actor.sub,
          reason,
          previous: attendance as any,
          current: next as any,
        },
      });
      return next;
    });
    await this.audit(
      actor.sub,
      'ATTENDANCE_CORRECTED',
      'AttendanceRecord',
      id,
      { reason },
    );
    return updated;
  }

  async listHolidays(query: Record<string, string>) {
    const year = Number(query.year) || new Date().getUTCFullYear();
    return {
      data: await this.prisma.holiday.findMany({
        where: {
          holidayDate: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        },
        orderBy: { holidayDate: 'asc' },
      }),
    };
  }

  async createHoliday(body: Record<string, unknown>, actor: Actor) {
    const name = this.text(body.name);
    if (!name) throw new BadRequestException('Holiday name is required');
    const holidayDate = ensureDate(body.holidayDate, 'Holiday date');
    try {
      const holiday = await this.prisma.holiday.create({
        data: {
          holidayDate,
          name,
          description: this.text(body.description),
          type: this.text(body.type),
          createdById: actor.sub,
        },
      });
      await this.audit(actor.sub, 'HOLIDAY_CREATED', 'Holiday', holiday.id, {
        name,
      });
      return holiday;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('A holiday already exists for this date');
      throw error;
    }
  }

  async updateHoliday(id: string, body: Record<string, unknown>, actor: Actor) {
    const holiday = await this.prisma.holiday.update({
      where: { id },
      data: {
        ...(body.holidayDate
          ? { holidayDate: ensureDate(body.holidayDate, 'Holiday date') }
          : {}),
        ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
        ...(typeof body.description === 'string'
          ? { description: body.description.trim() }
          : {}),
        ...(typeof body.type === 'string' ? { type: body.type.trim() } : {}),
      },
    });
    await this.audit(actor.sub, 'HOLIDAY_UPDATED', 'Holiday', id, {});
    return holiday;
  }

  async removeHoliday(id: string, actor: Actor) {
    await this.prisma.holiday.delete({ where: { id } });
    await this.audit(actor.sub, 'HOLIDAY_DELETED', 'Holiday', id, {});
    return { success: true };
  }

  async listLeaves(query: Record<string, string>, actor: Actor) {
    const where: Prisma.LeaveRequestWhereInput = {
      ...(ADMIN_ROLES.has(actor.role)
        ? query.employeeId
          ? { employeeId: query.employeeId }
          : {}
        : { employeeId: actor.sub }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.leaveType ? { leaveType: query.leaveType } : {}),
    };
    const data = await this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarStorageKey: true,
            employeeProfile: { select: { employeeCode: true } },
          },
        },
      },
    });
    return {
      data: data.map((leave) => ({
        ...leave,
        employee: {
          ...leave.employee,
          employeeCode: leave.employee.employeeProfile?.employeeCode ?? null,
          image: leave.employee.avatarStorageKey ?? null,
        },
      })),
    };
  }

  async createLeave(body: Record<string, unknown>, actor: Actor) {
    const leaveType = this.text(body.leaveType);
    const reason = this.text(body.reason);
    if (!leaveType || !reason)
      throw new BadRequestException('Leave type and reason are required');
    const startDate = ensureDate(body.startDate, 'Start date');
    const endDate = ensureDate(body.endDate, 'End date');
    if (endDate < startDate)
      throw new BadRequestException('End date cannot be before start date');
    const employeeId =
      ADMIN_ROLES.has(actor.role) && this.text(body.employeeId)
        ? this.text(body.employeeId)!
        : actor.sub;
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ['Pending', 'Approved'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap)
      throw new ConflictException('This leave overlaps an existing request');
    const days = await this.workingDays(startDate, endDate, employeeId);
    if (days.isZero())
      throw new BadRequestException(
        'The selected range contains only holidays',
      );
    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate,
        endDate,
        days,
        reason,
        note: this.text(body.note),
      },
    });
    await this.audit(actor.sub, 'LEAVE_REQUESTED', 'LeaveRequest', leave.id, {
      employeeId,
      leaveType,
    });
    return leave;
  }

  async cancelLeave(id: string, actor: Actor) {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Leave request not found');
    this.assertSelfOrAdmin(leave.employeeId, actor);
    if (leave.status !== 'Pending')
      throw new BadRequestException(
        'Only pending leave requests can be cancelled',
      );
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'Cancelled', cancelledAt: new Date() },
    });
    await this.audit(actor.sub, 'LEAVE_CANCELLED', 'LeaveRequest', id, {});
    return updated;
  }

  async decideLeave(id: string, body: Record<string, unknown>, actor: Actor) {
    const decision =
      body.status === 'Approved'
        ? 'Approved'
        : body.status === 'Rejected'
        ? 'Rejected'
        : undefined;
    if (!decision)
      throw new BadRequestException('Decision must be Approved or Rejected');
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'Pending')
      throw new BadRequestException(
        'This leave request has already been decided',
      );
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: decision,
          reviewerId: actor.sub,
          reviewerNote: this.text(body.remarks),
          reviewedAt: new Date(),
        },
      });
      if (decision === 'Approved') {
        for (
          let day = new Date(leave.startDate);
          day <= leave.endDate;
          day.setUTCDate(day.getUTCDate() + 1)
        ) {
          const attendanceDate = new Date(day);
          const holiday = await tx.holiday.findUnique({
            where: { holidayDate: attendanceDate },
          });
          if (!holiday)
            await tx.attendanceRecord.upsert({
              where: {
                employeeId_attendanceDate: {
                  employeeId: leave.employeeId,
                  attendanceDate,
                },
              },
              update: {
                status: 'On Leave',
                source: 'LEAVE',
                isLate: false,
                lateMinutes: 0,
                lateSequenceInMonth: null,
                derivedStatusReason: `Approved ${leave.leaveType}`,
                note: `Approved ${leave.leaveType}`,
              },
              create: {
                employeeId: leave.employeeId,
                attendanceDate,
                status: 'On Leave',
                source: 'LEAVE',
                isLate: false,
                lateMinutes: 0,
                derivedStatusReason: `Approved ${leave.leaveType}`,
                note: `Approved ${leave.leaveType}`,
              },
            });
        }
      }
      return result;
    });
    await this.audit(
      actor.sub,
      `LEAVE_${decision.toUpperCase()}`,
      'LeaveRequest',
      id,
      { remarks: this.text(body.remarks) },
    );
    return updated;
  }

  async getPayrollSettings() {
    let settings = await this.prisma.payrollSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.payrollSetting.create({
        data: {
          workingDays: DEFAULT_WORKING_DAYS,
          divisorType: 'FIXED',
          fixedDivisor: 30,
          ...(PAYROLL_INCENTIVE_FIELDS_SUPPORTED
            ? DEFAULT_INCENTIVE_POLICY
            : {}),
        },
      });
    }
    return withIncentivePolicyDefaults(settings);
  }

  async updatePayrollSettings(body: Record<string, any>) {
    let settings = await this.prisma.payrollSetting.findFirst();
    const workingDays = Array.isArray(body.workingDays)
      ? normalizeWorkingDays(body.workingDays)
      : undefined;
    const divisorType =
      typeof body.divisorType === 'string' ? body.divisorType : undefined;
    const fixedDivisor =
      body.fixedDivisor !== undefined ? Number(body.fixedDivisor) : undefined;
    const minimumDealsToQualify =
      body.minimumDealsToQualify !== undefined
        ? Math.max(0, Number(body.minimumDealsToQualify) || 0)
        : undefined;
    const salesIncentivePct =
      body.salesIncentivePct !== undefined
        ? asDecimal(body.salesIncentivePct)
        : undefined;
    const preSalesIncentivePct =
      body.preSalesIncentivePct !== undefined
        ? asDecimal(body.preSalesIncentivePct)
        : undefined;
    const teamLeaderIncentivePct =
      body.teamLeaderIncentivePct !== undefined
        ? asDecimal(body.teamLeaderIncentivePct)
        : undefined;

    if (!settings) {
      settings = await this.prisma.payrollSetting.create({
        data: {
          workingDays: workingDays ?? DEFAULT_WORKING_DAYS,
          divisorType: divisorType ?? 'FIXED',
          fixedDivisor: fixedDivisor ?? 30,
          ...(PAYROLL_INCENTIVE_FIELDS_SUPPORTED
            ? {
                minimumDealsToQualify:
                  minimumDealsToQualify ??
                  DEFAULT_INCENTIVE_POLICY.minimumDealsToQualify,
                salesIncentivePct:
                  salesIncentivePct ??
                  DEFAULT_INCENTIVE_POLICY.salesIncentivePct,
                preSalesIncentivePct:
                  preSalesIncentivePct ??
                  DEFAULT_INCENTIVE_POLICY.preSalesIncentivePct,
                teamLeaderIncentivePct:
                  teamLeaderIncentivePct ??
                  DEFAULT_INCENTIVE_POLICY.teamLeaderIncentivePct,
              }
            : {}),
        },
      });
    } else {
      settings = await this.prisma.payrollSetting.update({
        where: { id: settings.id },
        data: {
          ...(workingDays !== undefined ? { workingDays } : {}),
          ...(divisorType !== undefined ? { divisorType } : {}),
          ...(fixedDivisor !== undefined ? { fixedDivisor } : {}),
          ...(PAYROLL_INCENTIVE_FIELDS_SUPPORTED
            ? {
                ...(minimumDealsToQualify !== undefined
                  ? { minimumDealsToQualify }
                  : {}),
                ...(salesIncentivePct !== undefined ? { salesIncentivePct } : {}),
                ...(preSalesIncentivePct !== undefined
                  ? { preSalesIncentivePct }
                  : {}),
                ...(teamLeaderIncentivePct !== undefined
                  ? { teamLeaderIncentivePct }
                  : {}),
              }
            : {}),
        },
      });
    }
    return withIncentivePolicyDefaults(settings);
  }

  async listPayroll(query: Record<string, string>, actor: Actor) {
    const teamId = this.text(query.teamId);
    const baseWhere: Prisma.PayrollRecordWhereInput = {
      ...(query.year ? { year: Number(query.year) } : {}),
      ...(query.month ? { month: Number(query.month) } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const adminWhere: Prisma.PayrollRecordWhereInput = {
      ...baseWhere,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(teamId ? { employee: this.teamMembershipUserWhere(teamId) } : {}),
    };
    const where: Prisma.PayrollRecordWhereInput = ADMIN_ROLES.has(actor.role)
      ? adminWhere
      : {
          ...baseWhere,
          employeeId: actor.sub,
        };
    const records = await this.prisma.payrollRecord.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
            employeeProfile: true,
            ledTeams: { select: { id: true, name: true } },
          },
        },
        payslip: true,
      },
    });
    return {
      data: await Promise.all(
        records.map(async (record) => ({
          ...record,
          incentiveBreakdown: await this.payrollIncentiveBreakdown(
            record.employeeId,
            record.year,
            record.month,
          ),
        })),
      ),
    };
  }

  async runPayroll(body: Record<string, unknown>, actor: Actor) {
    const year = Number(body.year);
    const month = Number(body.month);
    const teamId = this.text(body.teamId);
    const employeeId = this.text(body.employeeId);
    const rerun = Boolean(body.rerun);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    )
      throw new BadRequestException(
        'A valid payroll month and year are required',
      );
    const employees = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [
            'ADMIN',
            'HR',
            'TEAM_LEADER',
            'MANAGER',
            'TELECALLER',
            'SALES_AGENT',
            'MARKETING',
            'BACKEND',
          ],
        },
        employeeProfile: { isNot: null },
        ...(teamId ? this.teamMembershipUserWhere(teamId) : {}),
        ...(employeeId ? { id: employeeId } : {}),
      },
      include: { employeeProfile: true },
    });
    if (employeeId && employees.length === 0) {
      throw new NotFoundException('Employee not found for payroll run');
    }
    const records = await this.prisma.$transaction(async (tx) =>
      Promise.all(
        employees.map(async (employee) => {
          const existing = await tx.payrollRecord.findUnique({
            where: {
              employeeId_year_month: { employeeId: employee.id, year, month },
            },
          });
          if (existing && !rerun) return existing;
          if (existing?.status === 'Paid') {
            return existing;
          }
          const summary = await this.attendanceSummary(
            employee.id,
            year,
            month,
            tx,
          );
          const profile = employee.employeeProfile!;
          const daily = profile.monthlyBasic
            .plus(profile.monthlyAllowances)
            .div(summary.salaryDivisorDays || 1);
          const unpaidDeduction = daily.mul(summary.unpaidDays);
          const payrollIncentive =
            await this.bookingIncentiveTotalForPayroll(
              tx,
              employee.id,
              year,
              month,
            );
          const grossPay = profile.monthlyBasic.plus(profile.monthlyAllowances);
          const netPay = grossPay
            .minus(profile.monthlyDeductions)
            .minus(unpaidDeduction)
            .plus(payrollIncentive);
          const payrollData = {
            year,
            month,
            basicSalary: profile.monthlyBasic,
            allowances: profile.monthlyAllowances,
            deductions: profile.monthlyDeductions.plus(unpaidDeduction),
            payableDays: summary.earnedPayableDays,
            ...(PAYROLL_RECORD_SALARY_DIVISOR_SUPPORTED
              ? { salaryDivisorDays: summary.salaryDivisorDays }
              : {}),
            presentDays: summary.presentDays,
            paidLeaveDays: summary.paidLeaveDays,
            unpaidDays: summary.unpaidDays,
            holidayDays: summary.holidayDays,
            grossPay,
            netPay,
            ...(PAYROLL_RECORD_PF_SUPPORTED ? { pfAmount: 0 } : {}),
            adjustment: payrollIncentive,
            adjustmentNote: payrollIncentive.gt(0)
              ? 'Booking incentives for confirmed bookings in this payroll month'
              : undefined,
          };
          if (!existing) {
            return tx.payrollRecord.create({
              data: {
                employeeId: employee.id,
                ...payrollData,
              },
            });
          }
          await tx.payslip.deleteMany({ where: { payrollId: existing.id } });
          return tx.payrollRecord.update({
            where: { id: existing.id },
            data: {
              ...payrollData,
              status: 'Draft',
              finalizedAt: null,
              finalizedById: null,
              paidAt: null,
              paidById: null,
              reopenedAt: new Date(),
              reopenedById: actor.sub,
              reopenReason: employeeId
                ? 'Payroll rerun for selected employee'
                : 'Payroll rerun for selected period',
            },
          });
        }),
      ),
    );
    const skippedPaidCount = records.filter(
      (record) => record.status === 'Paid',
    ).length;
    await this.audit(
      actor.sub,
      rerun ? 'PAYROLL_RERUN_CREATED' : 'PAYROLL_RUN_CREATED',
      'Payroll',
      `${year}-${month}`,
      {
        count: records.length,
        employeeId: employeeId || undefined,
        rerun,
        skippedPaidCount,
      },
    );
    return {
      data: records,
      meta: {
        rerun,
        requestedEmployeeId: employeeId || null,
        skippedPaidCount,
      },
    };
  }

  private payrollPeriodBounds(year: number, month: number) {
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  private async payrollIncentiveBreakdown(
    employeeId: string,
    year: number,
    month: number,
  ) {
    const { start, end } = this.payrollPeriodBounds(year, month);
    const includedStatuses = ['Approved', 'Finalized'];
    const pendingStatuses = ['Pending'];
    const incentiveStatuses = [...includedStatuses, ...pendingStatuses];
    const [baseIncentives, extraIncentives] = await Promise.all([
      this.prisma.bookingIncentive.findMany({
        where: {
          recipientUserId: employeeId,
          paymentStatus: { in: incentiveStatuses },
          booking: {
            status: 'Booked',
            bookingDate: { gte: start, lt: end },
          },
        },
        select: {
          id: true,
          roleType: true,
          amount: true,
          extraAmount: true,
          paymentStatus: true,
          booking: {
            select: {
              id: true,
              customerNameSnapshot: true,
              projectNameSnapshot: true,
              bookingDate: true,
            },
          },
        },
      }),
      this.prisma.bookingExtraIncentive.findMany({
        where: {
          recipientUserId: employeeId,
          paymentStatus: { in: incentiveStatuses },
          booking: {
            status: 'Booked',
            bookingDate: { gte: start, lt: end },
          },
        },
        select: {
          id: true,
          title: true,
          amount: true,
          paymentStatus: true,
          booking: {
            select: {
              id: true,
              customerNameSnapshot: true,
              projectNameSnapshot: true,
              bookingDate: true,
            },
          },
        },
      }),
    ]);

    const rows = [
      ...baseIncentives.map((item) => ({
        id: item.id,
        type: item.roleType,
        title:
          {
            SALES: 'Sales incentive',
            PRE_SALES: 'Pre-sales incentive',
            TEAM_LEADER: 'Team leader incentive',
          }[item.roleType] ?? 'Booking incentive',
        amount: item.amount.plus(item.extraAmount).toString(),
        status: item.paymentStatus,
        bookingId: item.booking.id,
        customerName: item.booking.customerNameSnapshot,
        projectName: item.booking.projectNameSnapshot,
        bookingDate: item.booking.bookingDate,
      })),
      ...extraIncentives.map((item) => ({
        id: item.id,
        type: 'EXTRA',
        title: item.title || 'Extra incentive',
        amount: item.amount.toString(),
        status: item.paymentStatus,
        bookingId: item.booking.id,
        customerName: item.booking.customerNameSnapshot,
        projectName: item.booking.projectNameSnapshot,
        bookingDate: item.booking.bookingDate,
      })),
    ];

    const included = rows.filter((row) =>
      includedStatuses.includes(row.status),
    );
    const pending = rows.filter((row) => pendingStatuses.includes(row.status));
    const sum = (items: typeof rows) =>
      items
        .reduce((total, item) => total.plus(item.amount), new Prisma.Decimal(0))
        .toString();

    return {
      included,
      pending,
      includedTotal: sum(included),
      pendingTotal: sum(pending),
      includedCount: included.length,
      pendingCount: pending.length,
    };
  }

  private async bookingIncentiveTotalForPayroll(
    tx: Prisma.TransactionClient,
    employeeId: string,
    year: number,
    month: number,
  ) {
    const { start, end } = this.payrollPeriodBounds(year, month);
    const payableStatuses = ['Approved', 'Finalized'];
    const [baseIncentives, extraIncentives] = await Promise.all([
      tx.bookingIncentive.findMany({
        where: {
          recipientUserId: employeeId,
          paymentStatus: { in: payableStatuses },
          booking: {
            status: 'Booked',
            bookingDate: { gte: start, lt: end },
          },
        },
        select: { amount: true, extraAmount: true },
      }),
      tx.bookingExtraIncentive.findMany({
        where: {
          recipientUserId: employeeId,
          paymentStatus: { in: payableStatuses },
          booking: {
            status: 'Booked',
            bookingDate: { gte: start, lt: end },
          },
        },
        select: { amount: true },
      }),
    ]);

    return baseIncentives
      .reduce(
        (sum, item) => sum.plus(item.amount).plus(item.extraAmount),
        new Prisma.Decimal(0),
      )
      .plus(
        extraIncentives.reduce(
          (sum, item) => sum.plus(item.amount),
          new Prisma.Decimal(0),
        ),
      );
  }

  async finalizePayroll(
    id: string,
    body: Record<string, unknown>,
    actor: Actor,
  ) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            employeeProfile: true,
            ledTeams: { select: { id: true, name: true, leaderId: true } },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Payroll record not found');
    if (record.status !== 'Draft')
      throw new BadRequestException('Only draft payroll can be finalized');
    const finalized = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.PayrollRecordUpdateInput = {
        ...this.buildPayrollAmendmentData(record, body, actor),
        status: 'Finalized',
        finalizedAt: new Date(),
        finalizedById: actor.sub,
      };
      const updated = await tx.payrollRecord.update({
        where: { id },
        data: updateData,
      });
      const payslip = await tx.payslip.create({
        data: {
          payrollId: id,
          employeeId: record.employeeId,
          snapshot: this.payslipSnapshot({
            ...record,
            ...updated,
            employee: record.employee,
          }),
        },
      });
      return { updated, payslipId: payslip.id };
    });
    this.processPayslipInternal(finalized.payslipId).catch((err) => {
      console.error('Failed to process payslip in background:', err);
    });
    await this.audit(actor.sub, 'PAYROLL_FINALIZED', 'PayrollRecord', id, {});
    return finalized.updated;
  }

  async updatePayrollDraft(
    id: string,
    body: Record<string, unknown>,
    actor: Actor,
  ) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Payroll record not found');
    if (record.status !== 'Draft')
      throw new BadRequestException('Only draft payroll can be amended');

    const updateData = this.buildPayrollAmendmentData(record, body, actor);
    const updated = Object.keys(updateData).length
      ? await this.prisma.payrollRecord.update({
          where: { id },
          data: updateData,
        })
      : record;

    await this.audit(actor.sub, 'PAYROLL_DRAFT_UPDATED', 'PayrollRecord', id, {
      amendedFields: Object.keys(updateData),
    });
    return updated;
  }

  private buildPayrollAmendmentData(
    record: {
      adjustment: Prisma.Decimal;
      netPay: Prisma.Decimal;
      pfAmount?: Prisma.Decimal | null;
    },
    body: Record<string, unknown>,
    actor?: Actor,
  ): Prisma.PayrollRecordUpdateInput {
    const updateData: Prisma.PayrollRecordUpdateInput = {};
    const manualOverrideReason = this.text(body.manualOverrideReason);
    const pfOverrideReason = this.text(body.pfOverrideReason);
    const amendmentReason = manualOverrideReason || pfOverrideReason;

    if (body.adjustment !== undefined) {
      const nextAdjustment = asDecimal(body.adjustment);
      if (!nextAdjustment.equals(record.adjustment) && !amendmentReason) {
        throw new BadRequestException(
          'Adjustment reason is required when changing payroll amounts',
        );
      }
      updateData.adjustment = nextAdjustment;
    }

    if (body.netPay !== undefined) {
      const nextNetPay = asDecimal(body.netPay);
      if (!nextNetPay.equals(record.netPay) && !amendmentReason) {
        throw new BadRequestException(
          'Adjustment reason is required when changing payroll amounts',
        );
      }
      updateData.netPay = nextNetPay;
    }

    if (body.pfAmount !== undefined && PAYROLL_RECORD_PF_SUPPORTED) {
      const nextPfAmount = asDecimal(body.pfAmount);
      const currentPfAmount = record.pfAmount ?? new Prisma.Decimal(0);
      if (nextPfAmount.lessThan(0)) {
        throw new BadRequestException('PF amount cannot be negative');
      }
      if (!nextPfAmount.equals(currentPfAmount)) {
        if (!amendmentReason) {
          throw new BadRequestException(
            'Adjustment reason is required when changing PF amount',
          );
        }
        updateData.pfAmount = nextPfAmount;
        updateData.pfOverrideReason = amendmentReason;
        updateData.pfUpdatedAt = new Date();
        if (actor?.sub) {
          updateData.pfUpdatedById = actor.sub;
        }
      }
    }

    if (amendmentReason) {
      if (PAYROLL_RECORD_MANUAL_OVERRIDE_REASON_SUPPORTED) {
        updateData.manualOverrideReason = amendmentReason;
      }
      updateData.adjustmentNote = amendmentReason;
    }

    return updateData;
  }

  async markPayrollPaid(id: string, actor: Actor) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Payroll record not found');
    if (record.status !== 'Finalized')
      throw new BadRequestException(
        'Only finalized payroll can be marked paid',
      );
    const updated = await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      const payroll = await tx.payrollRecord.update({
        where: { id },
        data: { status: 'Paid', paidAt, paidById: actor.sub },
      });
      if (Number(record.adjustment ?? 0) > 0) {
        await this.markPayrollBookingIncentivesPaid(tx, record, paidAt);
      }
      return payroll;
    });
    await this.audit(actor.sub, 'PAYROLL_PAID', 'PayrollRecord', id, {});
    return updated;
  }

  private async markPayrollBookingIncentivesPaid(
    tx: Prisma.TransactionClient,
    record: { employeeId: string; year: number; month: number },
    paidAt: Date,
  ) {
    const { start, end } = this.payrollPeriodBounds(record.year, record.month);
    const payableStatuses = ['Approved', 'Finalized'];
    const [baseIncentives, extraIncentives] = await Promise.all([
      tx.bookingIncentive.findMany({
        where: {
          recipientUserId: record.employeeId,
          paymentStatus: { in: payableStatuses },
          booking: {
            status: 'Booked',
            bookingDate: { gte: start, lt: end },
          },
        },
        include: { booking: { select: { id: true, leadId: true } } },
      }),
      tx.bookingExtraIncentive.findMany({
        where: {
          recipientUserId: record.employeeId,
          paymentStatus: { in: payableStatuses },
          booking: {
            status: 'Booked',
            bookingDate: { gte: start, lt: end },
          },
        },
        include: { booking: { select: { id: true, leadId: true } } },
      }),
    ]);

    const paymentRows = [
      ...baseIncentives.map((item) => ({
        bookingId: item.bookingId,
        leadId: item.booking.leadId,
        amount: item.amount.plus(item.extraAmount),
        paymentDate: paidAt,
        receivedDate: paidAt,
        status: 'Paid',
        kind: 'INCENTIVE',
        component: `${item.roleType}_INCENTIVE`,
        recipientUserId: item.recipientUserId,
        remarks: `Paid through payroll ${record.month}/${record.year}`,
      })),
      ...extraIncentives.map((item) => ({
        bookingId: item.bookingId,
        leadId: item.booking.leadId,
        amount: item.amount,
        paymentDate: paidAt,
        receivedDate: paidAt,
        status: 'Paid',
        kind: 'INCENTIVE',
        component: 'EXTRA_INCENTIVE',
        recipientUserId: item.recipientUserId,
        remarks: item.title
          ? `${item.title} paid through payroll ${record.month}/${record.year}`
          : `Extra incentive paid through payroll ${record.month}/${record.year}`,
      })),
    ];

    if (paymentRows.length) {
      await tx.payment.createMany({ data: paymentRows });
    }

    await Promise.all([
      baseIncentives.length
        ? tx.bookingIncentive.updateMany({
            where: { id: { in: baseIncentives.map((item) => item.id) } },
            data: { paymentStatus: 'Paid', paymentDate: paidAt },
          })
        : Promise.resolve(),
      extraIncentives.length
        ? tx.bookingExtraIncentive.updateMany({
            where: { id: { in: extraIncentives.map((item) => item.id) } },
            data: { paymentStatus: 'Paid', paymentDate: paidAt },
          })
        : Promise.resolve(),
    ]);
  }

  async listPayslips(query: Record<string, string>, actor: Actor) {
    const teamId = this.text(query.teamId);
    const search = this.text(query.search);
    const role =
      query.role === 'FIELD_EXECUTIVE' ? 'SALES_AGENT' : this.text(query.role);
    const year =
      query.year && Number.isInteger(Number(query.year))
        ? Number(query.year)
        : undefined;
    const month =
      query.month && Number.isInteger(Number(query.month))
        ? Number(query.month)
        : undefined;
    const dateFrom = query.dateFrom
      ? ensureDate(query.dateFrom, 'From date')
      : undefined;
    const dateTo = query.dateTo ? ensureDate(query.dateTo, 'To date') : undefined;

    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException('To date cannot be before from date');
    }

    const adminWhere: Prisma.PayslipWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(teamId ? { employee: this.teamMembershipUserWhere(teamId) } : {}),
      ...(role
        ? {
            employee: {
              ...(teamId ? this.teamMembershipUserWhere(teamId) : {}),
              role: role as any,
            },
          }
        : {}),
      ...(search
        ? {
            employee: {
              ...(teamId ? this.teamMembershipUserWhere(teamId) : {}),
              ...(role ? { role: role as any } : {}),
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                {
                  employeeProfile: {
                    is: {
                      employeeCode: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              ],
            },
          }
        : {}),
      ...(year || month
        ? {
            payroll: {
              ...(year ? { year } : {}),
              ...(month ? { month } : {}),
            },
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            generatedAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo
                ? {
                    lt: new Date(
                      new Date(dateTo).setUTCDate(dateTo.getUTCDate() + 1),
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };

    const where: Prisma.PayslipWhereInput = ADMIN_ROLES.has(actor.role)
      ? adminWhere
      : {
          employeeId: actor.sub,
          ...(year || month
            ? {
                payroll: {
                  ...(year ? { year } : {}),
                  ...(month ? { month } : {}),
                },
              }
            : {}),
          ...(dateFrom || dateTo
            ? {
                generatedAt: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo
                    ? {
                        lt: new Date(
                          new Date(dateTo).setUTCDate(dateTo.getUTCDate() + 1),
                        ),
                      }
                    : {}),
                },
              }
            : {}),
        };
    return {
      data: await this.prisma.payslip.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              avatarStorageKey: true,
              employeeProfile: {
                select: {
                  employeeCode: true,
                  designation: true,
                  team: { select: { id: true, name: true } },
                },
              },
              ledTeams: { select: { id: true, name: true } },
            },
          },
          payroll: true,
        },
      }),
    };
  }

  async getPayslip(id: string, actor: Actor) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
            employeeProfile: {
              select: {
                employeeCode: true,
                designation: true,
                team: { select: { id: true, name: true } },
              },
            },
            ledTeams: { select: { id: true, name: true } },
          },
        },
        payroll: true,
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');
    this.assertSelfOrAdmin(payslip.employeeId, actor);
    return payslip;
  }

  async sendMailTemplateTest(body: Record<string, unknown>, actor: Actor) {
    if (!ADMIN_ROLES.has(actor.role)) {
      throw new ForbiddenException('Only admins can send template test emails');
    }

    const toEmail =
      typeof body.toEmail === 'string' ? body.toEmail.trim().toLowerCase() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const html =
      typeof body.htmlBody === 'string' ? body.htmlBody.trim() : '';
    const fromName =
      typeof body.fromName === 'string' ? body.fromName.trim() : 'Truroot Realty HR';

    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new BadRequestException('A valid test email address is required');
    }
    if (!subject) {
      throw new BadRequestException('Email subject is required');
    }
    if (!html) {
      throw new BadRequestException('Email body is required');
    }

    await this.mailService.sendTestEmail({
      to: toEmail,
      subject,
      html,
      fromName,
    });

    await this.audit(actor.sub, 'MAIL_TEMPLATE_TEST_SENT', 'MailTemplate', toEmail, {
      toEmail,
      subject,
      fromName,
    });

    return { success: true, message: `Test email sent to ${toEmail}` };
  }

  private async attendanceSummary(
    employeeId: string,
    year: number,
    month: number,
    client: PrismaService | Prisma.TransactionClient,
  ) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const settings = (await client.payrollSetting.findFirst()) || {
      workingDays: DEFAULT_WORKING_DAYS,
      divisorType: 'FIXED',
      fixedDivisor: 30,
    };

    const [holidayRecords, records, leaves, employeeProfile] = await Promise.all([
      client.holiday.findMany({
        where: { holidayDate: { gte: start, lt: end } },
      }),
      client.attendanceRecord.findMany({
        where: { employeeId, attendanceDate: { gte: start, lt: end } },
        select: { status: true, attendanceDate: true },
      }),
      client.leaveRequest.findMany({
        where: {
          employeeId,
          status: 'Approved',
          startDate: { lt: end },
          endDate: { gte: start },
        },
        select: { leaveType: true, startDate: true, endDate: true, days: true },
      }),
      client.employeeProfile.findUnique({
        where: { userId: employeeId },
        select: { shift: { select: { workingDays: true } } },
      }),
    ]);
    const employeeWorkingDays = this.workingDaysForShift(
      employeeProfile?.shift,
      settings,
    );

    const holidayDates = new Set(
      holidayRecords.map((h) => h.holidayDate.toISOString().slice(0, 10)),
    );

    let calendarDays = 0;
    let standardWorkingDaysCount = 0;

    for (
      let day = new Date(start);
      day < end;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      calendarDays += 1;
      const dateStr = day.toISOString().slice(0, 10);
      const dayOfWeek = day.getUTCDay();
      const isStandardWorkingDay = employeeWorkingDays.includes(dayOfWeek);
      if (isStandardWorkingDay && !holidayDates.has(dateStr)) {
        standardWorkingDaysCount += 1;
      }
    }

    let divisor = 30;
    if (settings.divisorType === 'FIXED') {
      divisor = settings.fixedDivisor || 30;
    } else if (settings.divisorType === 'ACTUAL_DAYS') {
      divisor = calendarDays;
    } else if (settings.divisorType === 'WORKING_DAYS') {
      divisor = standardWorkingDaysCount;
    }

    const payableDays = new Prisma.Decimal(Math.max(divisor, 1));

    let presentDays = new Prisma.Decimal(0);
    let paidLeaveDays = new Prisma.Decimal(0);
    let unpaidLeaveDays = new Prisma.Decimal(0);
    let holidayDays = new Prisma.Decimal(0);
    let unpaidDays = new Prisma.Decimal(0);

    const recordMap = new Map(
      records.map((r) => [r.attendanceDate.toISOString().slice(0, 10), r]),
    );

    const getLeaveForDay = (day: Date) => {
      return leaves.find(
        (l) => dayDate(l.startDate) <= day && day <= dayDate(l.endDate),
      );
    };

    for (
      let day = new Date(start);
      day < end;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      const dateStr = day.toISOString().slice(0, 10);
      const dayOfWeek = day.getUTCDay();
      const isStandardWorkingDay = employeeWorkingDays.includes(dayOfWeek);
      const isPublicHoliday = holidayDates.has(dateStr);

      const record = recordMap.get(dateStr);
      if (record) {
        if (['Present', 'Manual Correction'].includes(record.status)) {
          presentDays = presentDays.plus(1);
        } else if (record.status === 'Half Day') {
          presentDays = presentDays.plus(0.5);
          unpaidDays = unpaidDays.plus(0.5);
        } else if (record.status === 'On Leave') {
          const leave = getLeaveForDay(day);
          if (leave && PAID_LEAVE_TYPES.has(leave.leaveType)) {
            paidLeaveDays = paidLeaveDays.plus(1);
          } else {
            unpaidLeaveDays = unpaidLeaveDays.plus(1);
          }
        } else if (record.status === 'Holiday') {
          holidayDays = holidayDays.plus(1);
        } else if (record.status === 'Absent') {
          unpaidDays = unpaidDays.plus(1);
        } else {
          if (!isStandardWorkingDay || isPublicHoliday) {
            holidayDays = holidayDays.plus(1);
          } else {
            unpaidDays = unpaidDays.plus(1);
          }
        }
      } else {
        const leave = getLeaveForDay(day);
        if (leave) {
          if (PAID_LEAVE_TYPES.has(leave.leaveType)) {
            paidLeaveDays = paidLeaveDays.plus(1);
          } else {
            unpaidLeaveDays = unpaidLeaveDays.plus(1);
          }
        } else if (!isStandardWorkingDay || isPublicHoliday) {
          holidayDays = holidayDays.plus(1);
        } else {
          unpaidDays = unpaidDays.plus(1);
        }
      }
    }

    return {
      salaryDivisorDays: payableDays,
      earnedPayableDays: presentDays.plus(paidLeaveDays).plus(holidayDays),
      presentDays,
      paidLeaveDays,
      unpaidDays: unpaidLeaveDays.plus(unpaidDays),
      holidayDays,
    };
  }

  private async workingDays(
    start: Date,
    end: Date,
    employeeId?: string,
  ): Promise<Prisma.Decimal> {
    const [settings, holidays, employeeProfile] = await Promise.all([
      this.getPayrollSettings(),
      this.prisma.holiday.findMany({
        where: { holidayDate: { gte: start, lte: end } },
        select: { holidayDate: true },
      }),
      employeeId
        ? this.prisma.employeeProfile.findUnique({
            where: { userId: employeeId },
            select: { shift: { select: { workingDays: true } } },
          })
        : Promise.resolve(null),
    ]);
    const workingDays = this.workingDaysForShift(
      employeeProfile?.shift,
      settings,
    );
    const holidaySet = new Set(
      holidays.map((holiday) => holiday.holidayDate.toISOString().slice(0, 10)),
    );
    let days = 0;
    for (
      let day = new Date(start);
      day <= end;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      const dayOfWeek = day.getUTCDay();
      const isWorkingDay = workingDays.includes(dayOfWeek);
      if (isWorkingDay && !holidaySet.has(day.toISOString().slice(0, 10))) {
        days += 1;
      }
    }
    return new Prisma.Decimal(days);
  }

  private workingDaysForShift(
    shift?: { workingDays?: unknown } | null,
    settings?: { workingDays?: unknown } | null,
  ) {
    return normalizeWorkingDays(
      shift?.workingDays,
      normalizeWorkingDays(settings?.workingDays),
    );
  }

  private minutesInput(value: unknown, label: string) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric >= 24 * 60) {
      throw new BadRequestException(`${label} must be between 0 and 1439`);
    }
    return Math.round(numeric);
  }

  private parseShiftBody(body: Record<string, unknown>, partial = false) {
    const name = this.text(body.name);
    const startTimeMinutes =
      body.startTimeMinutes !== undefined
        ? this.minutesInput(body.startTimeMinutes, 'Shift start time')
        : undefined;
    const endTimeMinutes =
      body.endTimeMinutes !== undefined
        ? this.minutesInput(body.endTimeMinutes, 'Shift end time')
        : undefined;
    const lateGraceMinutes =
      body.lateGraceMinutes !== undefined
        ? Math.max(0, Number(body.lateGraceMinutes))
        : undefined;
    const lateThresholdCount =
      body.lateThresholdCount !== undefined
        ? Math.max(1, Number(body.lateThresholdCount))
        : undefined;
    const workingDays =
      body.workingDays !== undefined
        ? normalizeWorkingDays(body.workingDays)
        : undefined;
    const latePenaltyStatus =
      typeof body.latePenaltyStatus === 'string'
        ? body.latePenaltyStatus.trim()
        : undefined;
    if (!partial) {
      if (!name) throw new BadRequestException('Shift name is required');
      if (startTimeMinutes === undefined || endTimeMinutes === undefined) {
        throw new BadRequestException('Shift start and end time are required');
      }
    }
    if (
      startTimeMinutes !== undefined &&
      endTimeMinutes !== undefined &&
      endTimeMinutes <= startTimeMinutes
    ) {
      throw new BadRequestException(
        'Overnight shifts are not supported in this version',
      );
    }
    if (
      latePenaltyStatus !== undefined &&
      !ATTENDANCE_PENALTY_STATUSES.has(latePenaltyStatus)
    ) {
      throw new BadRequestException(
        'Late penalty status must be Present, Half Day, or Absent',
      );
    }
    return {
      ...(name ? { name } : {}),
      ...(startTimeMinutes !== undefined ? { startTimeMinutes } : {}),
      ...(endTimeMinutes !== undefined ? { endTimeMinutes } : {}),
      ...(workingDays !== undefined ? { workingDays } : {}),
      ...(lateGraceMinutes !== undefined
        ? { lateGraceMinutes: Math.round(lateGraceMinutes) }
        : {}),
      ...(lateThresholdCount !== undefined
        ? { lateThresholdCount: Math.round(lateThresholdCount) }
        : {}),
      ...(latePenaltyStatus !== undefined ? { latePenaltyStatus } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    };
  }

  private async ensureShiftExists(id: string) {
    const shift = await this.prisma.shiftTemplate.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  private async resolveShiftId(value: unknown) {
    const shiftId = this.text(value);
    if (shiftId === null || shiftId === '') return null;
    const shift = await this.ensureShiftExists(shiftId);
    if (!shift.isActive) {
      throw new BadRequestException('Only active shifts can be assigned');
    }
    return shift.id;
  }

  private async getEmployeeAttendanceProfile(employeeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarStorageKey: true,
        employeeProfile: {
          select: {
            employeeCode: true,
            teamId: true,
            shiftId: true,
            team: { select: { id: true, name: true } },
            shift: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Employee not found');
    const multiplierByUserId = await this.employeeJustificationMultiplierMap([
      user.id,
    ]);
    return {
      ...user,
      justificationMultiplier: multiplierByUserId.get(user.id) ?? 0,
    };
  }

  private async getAttendanceDayContext(employeeId: string, attendanceDate: Date) {
    const [settings, employeeProfile, holiday, leave] = await Promise.all([
      this.getPayrollSettings(),
      this.prisma.employeeProfile.findUnique({
        where: { userId: employeeId },
        select: { shift: { select: { workingDays: true } } },
      }),
      this.prisma.holiday.findUnique({ where: { holidayDate: attendanceDate } }),
      this.prisma.leaveRequest.findFirst({
        where: {
          employeeId,
          status: 'Approved',
          startDate: { lte: attendanceDate },
          endDate: { gte: attendanceDate },
        },
      }),
    ]);
    const workingDays = this.workingDaysForShift(
      employeeProfile?.shift,
      settings,
    );
    const isWorkingDay = workingDays.includes(attendanceDate.getUTCDay());
    return { isWorkingDay, holiday, leave };
  }

  private async countLatePunchesThisMonth(
    employeeId: string,
    attendanceDate: Date,
  ) {
    const { start, end } = monthRangeForLocalDay(attendanceDate);
    return this.prisma.attendanceRecord.count({
      where: {
        employeeId,
        attendanceDate: { gte: start, lt: end },
        isLate: true,
      },
    });
  }

  private formatMinutes(minutes: number) {
    const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return new Date(Date.UTC(2026, 0, 1, hour, minute)).toLocaleTimeString(
      'en-IN',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }

  private attendanceReportShiftDuration(shift?: any) {
    if (!shift) return 0;
    const start = Number(shift.startTimeMinutes);
    const end = Number(shift.endTimeMinutes);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    return end >= start ? end - start : end + 24 * 60 - start;
  }

  private formatAttendanceReportDuration(minutes: number) {
    if (!Number.isFinite(minutes) || minutes <= 0) return '-';
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    return `${hours}h ${String(remainder).padStart(2, '0')}m`;
  }

  private formatAttendanceReportTime(value?: Date | string | null) {
    if (!value) return '-';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  }

  private attendanceReportRoleLabel(value?: string | null) {
    return getUserRoleLabel(value);
  }

  private attendanceReportMinutesBetween(
    start?: Date | string | null,
    end?: Date | string | null,
  ) {
    if (!start || !end) return 0;
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }

  private isAttendanceReportWeekOff(record: any) {
    const reason = String(
      record.derivedStatusReason ?? record.note ?? '',
    ).toLowerCase();
    return reason.includes('weekly off') || reason.includes('week off');
  }

  private isAttendanceReportPaidLeave(record: any) {
    const reason = String(
      record.derivedStatusReason ?? record.note ?? '',
    ).toLowerCase();
    return [...PAID_LEAVE_TYPES].some((leaveType) =>
      reason.includes(leaveType.toLowerCase()),
    );
  }

  private attendanceReportStatusCode(record: any) {
    const status = String(record.status ?? '').toLowerCase();
    if (status === 'present') return record.isLate ? 'P/L' : 'P';
    if (status === 'absent') return 'A';
    if (status === 'half day') return 'HD';
    if (status === 'on leave') {
      return this.isAttendanceReportPaidLeave(record) ? 'PL' : 'UL';
    }
    if (status === 'holiday') {
      return this.isAttendanceReportWeekOff(record) ? 'WO' : 'PH';
    }
    if (status === 'manual correction') return 'MC';
    return '-';
  }

  private buildAttendanceReportSummary(rows: any[]) {
    let present = 0;
    let absent = 0;
    let halfDays = 0;
    let weekOff = 0;
    let paidLeaves = 0;
    let unpaidLeaves = 0;
    let publicHoliday = 0;

    rows.forEach((record) => {
      const status = String(record.status ?? '').toLowerCase();
      if (status === 'present') present += 1;
      else if (status === 'absent') absent += 1;
      else if (status === 'half day') halfDays += 1;
      else if (status === 'on leave') {
        if (this.isAttendanceReportPaidLeave(record)) paidLeaves += 1;
        else unpaidLeaves += 1;
      } else if (status === 'holiday') {
        if (this.isAttendanceReportWeekOff(record)) weekOff += 1;
        else publicHoliday += 1;
      }
    });

    const payableDays = present + halfDays * 0.5 + paidLeaves + publicHoliday;
    return {
      payableDays: payableDays.toFixed(1),
      present,
      absent,
      halfDays,
      doublePresent: 0,
      weekOff,
      paidLeaves,
      unpaidLeaves,
      publicHoliday,
    };
  }

  private mapAttendanceReportDay(record: any) {
    const attendanceDate = dayDate(record.attendanceDate);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateLabel = attendanceDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    });
    const hoursWorked = this.attendanceReportMinutesBetween(
      record.checkInAt,
      record.checkOutAt,
    );
    const shift = record.shift;
    let earlyHours = 0;
    let overtimeHours = 0;
    if (record.checkOutAt && shift) {
      const shiftStart = Number(shift.startTimeMinutes);
      let shiftEnd = Number(shift.endTimeMinutes);
      let punchOut = minutesSinceMidnight(record.checkOutAt);
      if (Number.isFinite(shiftStart) && Number.isFinite(shiftEnd)) {
        if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;
        if (punchOut < shiftStart) punchOut += 24 * 60;
        earlyHours = Math.max(shiftEnd - punchOut, 0);
        overtimeHours = Math.max(punchOut - shiftEnd, 0);
      }
    }

    return {
      dateLabel,
      dayLabel: dayLabels[attendanceDate.getUTCDay()] ?? '-',
      statusCode: this.attendanceReportStatusCode(record),
      punchIn: this.formatAttendanceReportTime(record.checkInAt),
      punchOut: this.formatAttendanceReportTime(record.checkOutAt),
      hoursWorked: this.formatAttendanceReportDuration(hoursWorked),
      lateHours: this.formatAttendanceReportDuration(Number(record.lateMinutes ?? 0)),
      earlyHours: this.formatAttendanceReportDuration(earlyHours),
      overtimeHours: this.formatAttendanceReportDuration(overtimeHours),
    };
  }

  private buildTodayAttendance(profile: any, record: any, dayContext: any) {
    const shift = record?.shift ?? profile.employeeProfile?.shift ?? null;
    const blockedReason = dayContext.holiday
      ? dayContext.holiday.name
      : dayContext.leave
      ? `Approved ${dayContext.leave.leaveType}`
      : !dayContext.isWorkingDay
      ? 'Weekly Off'
      : !shift?.isActive
      ? 'No active shift assigned'
      : null;
    return {
      date: dayDate(new Date()),
      shift: shift
        ? {
            id: shift.id,
            name: shift.name,
            startTimeMinutes: shift.startTimeMinutes,
            endTimeMinutes: shift.endTimeMinutes,
            lateGraceMinutes: shift.lateGraceMinutes,
            lateThresholdCount: shift.lateThresholdCount,
            latePenaltyStatus: shift.latePenaltyStatus,
            isActive: shift.isActive,
            scheduleLabel: `${this.formatMinutes(shift.startTimeMinutes)} - ${this.formatMinutes(shift.endTimeMinutes)}`,
          }
        : null,
      record: record ? this.mapAttendanceRecord(record) : null,
      status: record?.status ?? (dayContext.leave
        ? 'On Leave'
        : dayContext.holiday || !dayContext.isWorkingDay
        ? 'Holiday'
        : 'Not Checked In'),
      canPunchIn:
        !blockedReason && !record?.checkInAt,
      canPunchOut:
        !blockedReason && !!record?.checkInAt && !record?.checkOutAt,
      blockedReason,
      checkInAt: record?.checkInAt ?? null,
      checkOutAt: record?.checkOutAt ?? null,
      checkInImageUrl: record?.checkInImageUrl ?? null,
      checkInImageCapturedAt: record?.checkInImageCapturedAt ?? null,
      checkOutImageUrl: record?.checkOutImageUrl ?? null,
      checkOutImageCapturedAt: record?.checkOutImageCapturedAt ?? null,
      checkInLocationAddress: record?.checkInLocationAddress ?? null,
      checkInLatitude: record?.checkInLatitude ?? null,
      checkInLongitude: record?.checkInLongitude ?? null,
      isLate: Boolean(record?.isLate),
      lateMinutes: Number(record?.lateMinutes ?? 0),
      lateSequenceInMonth: record?.lateSequenceInMonth ?? null,
      derivedStatusReason: record?.derivedStatusReason ?? null,
    };
  }

  private async getEmployeeForMapping(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        employeeProfile: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                leader: { select: { id: true, fullName: true } },
              },
            },
            shift: true,
          },
        },
        ledTeams: {
          select: {
            id: true,
            name: true,
          },
        },
        modulePermissions: true,
        rankingTeamAccesses: {
          select: {
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
        leadVisibilityOverrides: {
          select: {
            accessType: true,
            targetUserId: true,
            target: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                avatarStorageKey: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Employee not found');
    const managedTeamsByManagerId = MANAGER_ROLES.has(user.role)
      ? await this.managerTeamsByManagerId([user.id])
      : new Map<string, ManagedTeamSummary[]>();
    return {
      ...user,
      managedTeams: managedTeamsByManagerId.get(user.id) ?? [],
    };
  }

  private mapEmployee(user: any) {
    const profile = user.employeeProfile;
    const assignedTeam = profile?.team ?? null;
    const ledTeam = user.ledTeams?.[0] ?? null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role === 'SALES_AGENT' ? 'FIELD_EXECUTIVE' : user.role,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      lastLoginAt: user.lastLoginAt ?? null,
      employeeCode: profile?.employeeCode ?? null,
      password:
        typeof user.passwordHash === 'string' && user.passwordHash
          ? isEncryptedPassword(user.passwordHash)
            ? decryptPassword(user.passwordHash)
            : typeof user.metadata?.currentPassword === 'string' &&
              user.metadata.currentPassword
            ? user.metadata.currentPassword
            : user.passwordHash
          : typeof user.metadata?.currentPassword === 'string' &&
            user.metadata.currentPassword
          ? user.metadata.currentPassword
          : 'ChangeMe@123',
      designation: profile?.designation ?? null,
      joiningDate: profile?.joiningDate ?? null,
      employmentStatus:
        profile?.employmentStatus ?? (user.isActive ? 'Active' : 'Inactive'),
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      monthlyBasic: profile?.monthlyBasic ?? null,
      justificationMultiplier:
        profile?.justificationMultiplier ?? user.justificationMultiplier ?? null,
      justificationMode: profile?.justificationMode ?? 'MULTIPLIER',
      justificationAmount: profile?.justificationAmount ?? null,
      monthlyAllowances: profile?.monthlyAllowances ?? null,
      monthlyDeductions: profile?.monthlyDeductions ?? null,
      attendanceStatus: user.attendanceRecords?.[0]?.status ?? 'Not checked in',
      image: user.avatarStorageKey ?? null,
      teamId: profile?.teamId ?? null,
      teamName: assignedTeam?.name ?? null,
      reportingToId: profile?.reportingToId ?? null,
      reportingToName: null,
      managedTeamIds: (user.managedTeams ?? []).map(
        (team: ManagedTeamSummary) => team.id,
      ),
      managedTeams: user.managedTeams ?? [],
      leaderOfTeamId: ledTeam?.id ?? null,
      leaderOfTeamName: ledTeam?.name ?? null,
      leaderOfTeamIds: (user.ledTeams ?? []).map((team: any) => team.id),
      leaderOfTeamNames: (user.ledTeams ?? []).map((team: any) => team.name),
      isTeamLeader: Boolean(ledTeam?.id),
      shiftId: profile?.shiftId ?? profile?.shift?.id ?? null,
      shiftName: profile?.shift?.name ?? null,
      shift: profile?.shift
        ? {
            id: profile.shift.id,
            name: profile.shift.name,
            startTimeMinutes: profile.shift.startTimeMinutes,
            endTimeMinutes: profile.shift.endTimeMinutes,
            lateGraceMinutes: profile.shift.lateGraceMinutes,
            lateThresholdCount: profile.shift.lateThresholdCount,
            latePenaltyStatus: profile.shift.latePenaltyStatus,
            isActive: profile.shift.isActive,
          }
        : null,
      teamLeaderName:
        profile?.team?.leader?.fullName ??
        (user.ledTeams?.[0] ? user.fullName : null),
      isAccessCustomized:
        (user.modulePermissions?.length ?? 0) > 0 ||
        (user.rankingTeamAccesses?.length ?? 0) > 0 ||
        (user.teamLeaderVisibilityGrants?.length ?? 0) > 0,
      permissions: (user.modulePermissions ?? []).map((permission: any) => ({
        moduleKey: permission.moduleKey,
        canView: permission.canView,
        canCreate: permission.canCreate,
        canUpdate: permission.canUpdate,
        canDelete: permission.canDelete,
        canPunchIn: permission.canPunchIn,
        canPunchOut: permission.canPunchOut,
      })),
      rankingTeamIds: (user.rankingTeamAccesses ?? []).map(
        (access: any) => access.teamId,
      ),
      rankingTeams: (user.rankingTeamAccesses ?? []).map((access: any) => ({
        id: access.team?.id ?? access.teamId,
        name: access.team?.name ?? 'Unknown team',
      })),
      monitorTeamIds: (user.teamLeaderVisibilityGrants ?? [])
        .map((grant: any) => grant.teamId)
        .filter(Boolean),
      monitorTeams: (user.teamLeaderVisibilityGrants ?? [])
        .filter((grant: any) => grant.teamId)
        .map((grant: any) => ({
          id: grant.team?.id ?? grant.teamId,
          name: grant.team?.name ?? 'Unknown team',
        })),
      monitorUserIds: (user.teamLeaderVisibilityGrants ?? [])
        .map((grant: any) => grant.userId)
        .filter(Boolean),
      monitorUsers: (user.teamLeaderVisibilityGrants ?? [])
        .filter((grant: any) => grant.userId)
        .map((grant: any) => ({
          id: grant.user?.id ?? grant.userId,
          name: grant.user?.fullName ?? grant.user?.email ?? 'Unknown employee',
          email: grant.user?.email ?? null,
        })),
      leadVisibilityAllowedUserIds: (user.leadVisibilityOverrides ?? [])
        .filter((override: any) => override.accessType === 'ALLOW')
        .map((override: any) => override.targetUserId)
        .filter(Boolean),
      leadVisibilityAllowedUsers: (user.leadVisibilityOverrides ?? [])
        .filter((override: any) => override.accessType === 'ALLOW')
        .map((override: any) => ({
          id: override.target?.id ?? override.targetUserId,
          name:
            override.target?.fullName ??
            override.target?.email ??
            'Unknown employee',
          email: override.target?.email ?? null,
          role: override.target?.role ?? null,
          image: override.target?.avatarStorageKey ?? null,
        })),
      leadVisibilityBlockedUserIds: (user.leadVisibilityOverrides ?? [])
        .filter((override: any) => override.accessType === 'BLOCK')
        .map((override: any) => override.targetUserId)
        .filter(Boolean),
      leadVisibilityBlockedUsers: (user.leadVisibilityOverrides ?? [])
        .filter((override: any) => override.accessType === 'BLOCK')
        .map((override: any) => ({
          id: override.target?.id ?? override.targetUserId,
          name:
            override.target?.fullName ??
            override.target?.email ??
            'Unknown employee',
          email: override.target?.email ?? null,
          role: override.target?.role ?? null,
          image: override.target?.avatarStorageKey ?? null,
        })),
    };
  }

  private mapAttendanceEmployee(user: any) {
    const profile = user.employeeProfile;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role === 'SALES_AGENT' ? 'FIELD_EXECUTIVE' : user.role,
      image: user.avatarStorageKey ?? null,
      employeeCode: profile?.employeeCode ?? null,
      teamId: profile?.teamId ?? null,
      teamName: profile?.team?.name ?? null,
      shiftId: profile?.shiftId ?? null,
      shiftName: profile?.shift?.name ?? null,
    };
  }

  private mapAttendanceRecord(record: any) {
    return {
      ...record,
      isGenerated: false,
      shift: record.shift
        ? {
            id: record.shift.id,
            name: record.shift.name,
            startTimeMinutes: record.shift.startTimeMinutes,
            endTimeMinutes: record.shift.endTimeMinutes,
            lateGraceMinutes: record.shift.lateGraceMinutes,
            lateThresholdCount: record.shift.lateThresholdCount,
            latePenaltyStatus: record.shift.latePenaltyStatus,
            isActive: record.shift.isActive,
          }
        : null,
      employee: this.mapAttendanceEmployee(record.employee),
    };
  }

  private payslipSnapshot(record: any) {
    return {
      company: 'Truroot Realty CRM',
      generatedAt: new Date().toISOString(),
      employee: {
        id: record.employeeId,
        name: record.employee.fullName,
        email: record.employee.email,
        employeeCode: record.employee.employeeProfile?.employeeCode ?? null,
        designation: record.employee.employeeProfile?.designation ?? null,
        teamId:
          record.employee.employeeProfile?.teamId ??
          record.employee.ledTeams?.[0]?.id ??
          null,
        teamName:
          record.employee.employeeProfile?.team?.name ??
          record.employee.ledTeams?.[0]?.name ??
          null,
      },
      payroll: {
        year: record.year,
        month: record.month,
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount?.toString?.() ?? '0',
        pfOverrideReason: record.pfOverrideReason ?? null,
        grossPay: record.grossPay.toString(),
        netPay: record.netPay.toString(),
        payableDays: record.payableDays.toString(),
        salaryDivisorDays:
          record.salaryDivisorDays?.toString() ?? record.payableDays.toString(),
        presentDays: record.presentDays.toString(),
        paidLeaveDays: record.paidLeaveDays.toString(),
        unpaidDays: record.unpaidDays.toString(),
        holidayDays: record.holidayDays.toString(),
        manualOverrideReason: record.manualOverrideReason ?? null,
      },
    };
  }

  private async buildPayslipHtml(recordId: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: {
          include: {
            employeeProfile: true,
            ledTeams: { select: { id: true, name: true, leaderId: true } },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Payroll record not found');
    }

    const team =
      record.employee.employeeProfile?.teamId || record.employee.ledTeams?.[0]?.id
        ? await this.prisma.team.findFirst({
            where: {
              OR: [
                ...(record.employee.employeeProfile?.teamId
                  ? [{ id: record.employee.employeeProfile.teamId }]
                  : []),
                { leaderId: record.employeeId },
              ],
            },
            include: { leader: { select: { fullName: true } } },
          })
        : null;
    const teamName = team?.name ?? 'No team assigned';

    const watermark = this.documentsService.getWatermarkMarkup();
    const currency = (value: number) =>
      `Rs. ${value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const monthLabel = (month: number, year: number) =>
      new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });

    const baseSalaryVal =
      Number(record.basicSalary) + Number(record.allowances);
    const deductionVal = Number(record.deductions);
    const pfAmountVal = Number(record.pfAmount ?? 0);
    const netSalaryVal = Number(record.netPay);
    const adjustmentVal = Number(record.adjustment);

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif:wght@500;700&display=swap');
            body {
              margin: 0;
              padding: 24px;
              font-family: 'Manrope', sans-serif;
              color: #24181d;
              background: #fff8f9;
              -webkit-print-color-adjust: exact;
            }
            #watermark {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0.12;
              transform: rotate(-34deg);
              pointer-events: none;
            }
            #watermark img {
              width: 82%;
            }
            .sheet {
              position: relative;
              z-index: 2;
              border-radius: 24px;
              border: 1px solid rgba(120, 0, 55, 0.12);
              background: rgba(255,255,255,0.97);
              padding: 30px;
            }
            h1 {
              margin: 0;
              color: #780037;
              font-size: 32px;
              font-family: 'Noto Serif', serif;
            }
            .sub {
              color: #6a5360;
              font-size: 14px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
            }
            .header-left {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 14px;
            }
            .card, .table {
              border: 1px solid rgba(120, 0, 55, 0.1);
              border-radius: 18px;
              background: #fff;
            }
            .card {
              padding: 16px;
            }
            .label {
              color: #8a5d6e;
              font-size: 12px;
              font-weight: 700;
            }
            .value {
              margin-top: 6px;
              font-size: 15px;
              font-weight: 700;
            }
            .table {
              margin-top: 20px;
              padding: 8px 16px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 14px 0;
              border-bottom: 1px solid rgba(120, 0, 55, 0.08);
            }
            .row:last-child {
              border-bottom: 0;
            }
            .att-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-top: 20px;
            }
            .att-card {
              border: 1px solid rgba(120, 0, 55, 0.1);
              border-radius: 12px;
              padding: 12px;
              text-align: center;
              background: #fff;
            }
            .att-label {
              color: #8a5d6e;
              font-size: 11px;
              font-weight: 600;
            }
            .att-value {
              margin-top: 4px;
              font-size: 18px;
              font-weight: 800;
            }
            .att-present { color: #16a34a; }
            .att-leave { color: #f59e0b; }
            .att-holiday { color: #2563eb; }
            .att-absent { color: #dc2626; }
          </style>
        </head>
        <body>
          <div id="watermark">${watermark}</div>
          <div class="sheet">
            <div class="header">
              <div class="header-left">
                <div class="label">Truroot Realty</div>
                <h1>Payslip</h1>
                <div class="sub">${monthLabel(record.month, record.year)}</div>
              </div>
              <div class="header-right">
                ${this.documentsService.getLogoMarkup()}
              </div>
            </div>
            <div class="grid">
              <div class="card">
                <div class="label">Employee</div>
                <div class="value">${record.employee.fullName}</div>
              </div>
              <div class="card">
                <div class="label">Designation</div>
                <div class="value">${
                  record.employee.employeeProfile?.designation || 'Team Member'
                }</div>
              </div>
              <div class="card">
                <div class="label">Team</div>
                <div class="value">${teamName}</div>
              </div>
              <div class="card">
                <div class="label">Payable days</div>
                <div class="value">${record.payableDays}</div>
                <div class="label">Salary divisor: ${
                  record.salaryDivisorDays ?? record.payableDays
                } days</div>
              </div>
            </div>
            <div class="table">
              <div class="row"><span>Base salary</span><strong>${currency(
                baseSalaryVal,
              )}</strong></div>
              <div class="row"><span>Attendance deduction</span><strong>${currency(
                deductionVal,
              )}</strong></div>
              <div class="row"><span>PF amount</span><strong>${currency(
                pfAmountVal,
              )}</strong></div>
              <div class="row"><span>Incentive</span><strong>${currency(
                adjustmentVal,
              )}</strong></div>
              <div class="row"><span>Net salary</span><strong>${currency(
                netSalaryVal,
              )}</strong></div>
            </div>
            <div class="att-grid">
              <div class="att-card">
                <div class="att-label">Present</div>
                <div class="att-value att-present">${record.presentDays}</div>
              </div>
              <div class="att-card">
                <div class="att-label">Leave</div>
                <div class="att-value att-leave">${record.paidLeaveDays}</div>
              </div>
              <div class="att-card">
                <div class="att-label">Holiday</div>
                <div class="att-value att-holiday">${record.holidayDays}</div>
              </div>
              <div class="att-card">
                <div class="att-label">Absent</div>
                <div class="att-value att-absent">${record.unpaidDays}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async processPayslipInternal(payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        payroll: true,
        employee: {
          include: {
            employeeProfile: true,
          },
        },
      },
    });

    if (!payslip) {
      return;
    }

    try {
      const html = await this.buildPayslipHtml(payslip.payrollId);
      const pdfBuffer = await this.documentsService.generatePdfFromHtml(html);

      const employeeName = payslip.employee.fullName || 'employee';
      const fileName = `payslip-${employeeName
        .replace(/\s+/g, '-')
        .toLowerCase()}-${payslip.payroll.year}-${String(
        payslip.payroll.month,
      ).padStart(2, '0')}.pdf`;

      const uploadResult = await this.uploads.uploadFile(
        pdfBuffer,
        fileName,
        'application/pdf',
        payslip.employeeId,
        'payroll-payslips',
      );

      await this.prisma.payslip.update({
        where: { id: payslip.id },
        data: {
          fileName: fileName,
          fileUrl: uploadResult.url,
          generatedAt: new Date(),
        },
      });

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthNameStr = monthNames[(payslip.payroll.month ?? 1) - 1];
      const currency = (value: number) =>
        `Rs. ${value.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      await this.mailService.sendPayslip(
        payslip.employee.email,
        payslip.employee.fullName || 'Employee',
        monthNameStr,
        String(payslip.payroll.year),
        currency(Number(payslip.payroll.netPay)),
        pdfBuffer,
        fileName,
      );

      await this.prisma.payslip.update({
        where: { id: payslip.id },
        data: {
          deliveryStatus: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.payslip.update({
        where: { id: payslip.id },
        data: {
          deliveryStatus: 'FAILED',
        },
      });
      console.error(
        `Failed to generate/email payslip for payslipId ${payslipId}:`,
        error,
      );
    }
  }

  private assertSelfOrAdmin(employeeId: string, actor: Actor) {
    if (!ADMIN_ROLES.has(actor.role) && employeeId !== actor.sub)
      throw new ForbiddenException(
        'You can only access your own employment records',
      );
  }

  private async resolveVisibleEmployeeIds(actor: Actor): Promise<string[] | null> {
    if (ADMIN_ROLES.has(actor.role)) return null;

    const visibleIds = new Set<string>([actor.sub]);

    if (actor.role === 'MANAGER') {
      const directReports = await this.prisma.employeeProfile.findMany({
        where: {
          reportingToId: actor.sub,
          user: { isActive: true },
        },
        select: {
          userId: true,
          user: { select: { role: true } },
        },
      });
      const teamLeaderIds: string[] = [];
      for (const report of directReports) {
        visibleIds.add(report.userId);
        if (report.user.role === 'TEAM_LEADER') {
          teamLeaderIds.push(report.userId);
        }
      }
      if (teamLeaderIds.length) {
        const teams = await this.prisma.team.findMany({
          where: {
            isActive: true,
            leaderId: { in: teamLeaderIds },
          },
          select: {
            members: { select: { userId: true } },
          },
        });
        for (const team of teams) {
          for (const member of team.members) {
            visibleIds.add(member.userId);
          }
        }
      }
    }

    if (actor.role === 'TEAM_LEADER') {
      const [ledTeams, monitorGrants] = await Promise.all([
        this.prisma.team.findMany({
          where: { isActive: true, leaderId: actor.sub },
          select: {
            members: { select: { userId: true } },
          },
        }),
        this.prisma.teamLeaderVisibilityGrant.findMany({
          where: { leaderUserId: actor.sub },
          select: {
            userId: true,
            team: {
              select: {
                members: { select: { userId: true } },
              },
            },
          },
        }),
      ]);
      for (const team of ledTeams) {
        for (const member of team.members) {
          visibleIds.add(member.userId);
        }
      }
      for (const grant of monitorGrants) {
        if (grant.userId) visibleIds.add(grant.userId);
        if (grant.team) {
          for (const member of grant.team.members) {
            visibleIds.add(member.userId);
          }
        }
      }
    }

    return Array.from(visibleIds);
  }

  private async assertCanViewEmployee(employeeId: string, actor: Actor) {
    if (ADMIN_ROLES.has(actor.role) || employeeId === actor.sub) return;
    const visibleIds = await this.resolveVisibleEmployeeIds(actor);
    if (!visibleIds?.includes(employeeId)) {
      throw new ForbiddenException(
        'You can only access employees in your reporting hierarchy',
      );
    }
  }

  private async managerHierarchySummary(managerUserId: string) {
    const teamLeaders = await this.prisma.employeeProfile.findMany({
      where: {
        reportingToId: managerUserId,
        user: {
          isActive: true,
          role: 'TEAM_LEADER',
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarStorageKey: true,
            ledTeams: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                code: true,
                members: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
    const sortedLeaders = [...teamLeaders].sort((a, b) =>
      a.user.fullName.localeCompare(b.user.fullName),
    );
    const hierarchy = sortedLeaders.map((leader) => ({
      id: leader.user.id,
      name: leader.user.fullName,
      email: leader.user.email,
      image: leader.user.avatarStorageKey ?? null,
      teams: leader.user.ledTeams.map((team) => ({
        id: team.id,
        name: team.name,
        code: team.code,
        memberCount: team.members.length,
      })),
    }));
    return {
      teamLeaderCount: hierarchy.length,
      teamCount: hierarchy.reduce((sum, leader) => sum + leader.teams.length, 0),
      memberCount: hierarchy.reduce(
        (sum, leader) =>
          sum +
          leader.teams.reduce(
            (teamSum, team) => teamSum + team.memberCount,
            0,
          ),
        0,
      ),
      teamLeaders: hierarchy,
    };
  }
  private async managerTeamsByManagerId(managerUserIds: string[]) {
    const teamsByManagerId = new Map<string, ManagedTeamSummary[]>();
    if (!managerUserIds.length) return teamsByManagerId;

    const teamLeaders = await this.prisma.employeeProfile.findMany({
      where: {
        reportingToId: { in: managerUserIds },
        user: {
          isActive: true,
          role: 'TEAM_LEADER',
        },
      },
      select: {
        reportingToId: true,
        user: {
          select: {
            id: true,
            fullName: true,
            ledTeams: {
              where: { isActive: true },
              select: { id: true, name: true, code: true, leaderId: true },
            },
          },
        },
      },
    });

    for (const teamLeader of teamLeaders) {
      const managerUserId = teamLeader.reportingToId;
      if (!managerUserId) continue;
      const currentTeams = teamsByManagerId.get(managerUserId) ?? [];
      currentTeams.push(
        ...teamLeader.user.ledTeams.map((team) => ({
          id: team.id,
          name: team.name,
          code: team.code,
          leaderId: team.leaderId ?? teamLeader.user.id,
          leaderName: teamLeader.user.fullName,
        })),
      );
      teamsByManagerId.set(managerUserId, currentTeams);
    }

    for (const teams of teamsByManagerId.values()) {
      teams.sort((left, right) => left.name.localeCompare(right.name));
    }
    return teamsByManagerId;
  }
  private teamMembershipUserWhere(teamId: string): Prisma.UserWhereInput {
    return {
      OR: [
        { employeeProfile: { is: { teamId } } },
        { ledTeams: { some: { id: teamId } } },
      ],
    };
  }
  private async assertTeamCanAcceptLeader(
    teamId: string,
    employeeId?: string,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, isActive: true, leaderId: true },
    });
    if (!team || !team.isActive) {
      throw new BadRequestException('Selected team does not exist or is inactive');
    }
    if (team.leaderId && team.leaderId !== employeeId) {
      throw new ConflictException('This team already has another leader');
    }
  }
  private assertTeamLeaderAssignment(role: string, teamId: string | null) {
    if (role === 'TEAM_LEADER' && !teamId) {
      throw new BadRequestException(
        'Team Leader must be assigned to an active team',
      );
    }
    if (role !== 'TEAM_LEADER' && teamId) {
      throw new BadRequestException(
        'Only an employee with the Team Leader role can lead a team',
      );
    }
  }
  private async assertUniqueActiveEmployeeMobile(
    phone: string | null,
    employeeId?: string,
  ) {
    const normalizedPhone = normalizeEmployeeMobile(phone);
    if (!normalizedPhone) return;
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(employeeId ? { id: { not: employeeId } } : {}),
        employeeProfile: { isNot: null },
      },
      select: {
        id: true,
        employeeProfile: { select: { phone: true } },
      },
    });
    const duplicate = users.find((user) => {
      const existingPhone = user.employeeProfile?.phone ?? null;
      return normalizeEmployeeMobile(existingPhone) === normalizedPhone;
    });
    if (duplicate) {
      throw new ConflictException(
        'Another active employee already uses this mobile number',
      );
    }
  }
  private async applyEmployeeTeamLeadership(
    employeeId: string,
    leaderOfTeamId: string | null,
  ) {
    await this.prisma.$transaction(async (tx) => {
      if (!leaderOfTeamId) {
        await tx.team.updateMany({
          where: { leaderId: employeeId },
          data: { leaderId: null },
        });
        return;
      }

      const employee = await tx.user.findUnique({
        where: { id: employeeId },
        select: { id: true, role: true },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      if (employee.role !== 'TEAM_LEADER') {
        throw new BadRequestException(
          'Only an employee with the Team Leader role can lead a team',
        );
      }

      const activeTeam = await tx.team.findUnique({
        where: { id: leaderOfTeamId },
        select: { id: true, isActive: true, leaderId: true },
      });
      if (!activeTeam || !activeTeam.isActive) {
        throw new BadRequestException('Selected team does not exist or is inactive');
      }
      if (activeTeam.leaderId && activeTeam.leaderId !== employeeId) {
        throw new ConflictException('This team already has another leader');
      }

      await tx.team.updateMany({
        where: { leaderId: employeeId, id: { not: leaderOfTeamId } },
        data: { leaderId: null },
      });
      await tx.team.update({
        where: { id: leaderOfTeamId },
        data: { leaderId: employeeId },
      });
      await tx.employeeProfile.updateMany({
        where: { userId: employeeId, teamId: leaderOfTeamId },
        data: { teamId: null },
      });
    });
  }
  private async applyManagerTeamAssignments(
    managerUserId: string,
    value: unknown,
  ) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Managed teams must be an array');
    }
    const teamIds = Array.from(
      new Set(
        value.map((teamId) => {
          if (typeof teamId !== 'string' || !teamId.trim()) {
            throw new BadRequestException('Managed team IDs must be valid');
          }
          return teamId.trim();
        }),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      const manager = await tx.user.findUnique({
        where: { id: managerUserId },
        select: { id: true, role: true },
      });
      if (!manager) throw new NotFoundException('Employee not found');

      const isManager = MANAGER_ROLES.has(manager.role);
      if (!isManager && teamIds.length) {
        throw new BadRequestException('Only a Manager can be assigned teams');
      }

      const currentReports = await tx.employeeProfile.findMany({
        where: {
          reportingToId: managerUserId,
          user: { role: 'TEAM_LEADER' },
        },
        select: {
          userId: true,
          user: {
            select: {
              ledTeams: {
                where: { isActive: true },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!isManager) {
        await tx.employeeProfile.updateMany({
          where: {
            userId: { in: currentReports.map((profile) => profile.userId) },
          },
          data: { reportingToId: null },
        });
        return;
      }

      const selectedTeams = teamIds.length
        ? await tx.team.findMany({
            where: { id: { in: teamIds } },
            select: {
              id: true,
              name: true,
              isActive: true,
              leaderId: true,
              leader: {
                select: {
                  id: true,
                  role: true,
                  isActive: true,
                  employeeProfile: { select: { userId: true } },
                },
              },
            },
          })
        : [];
      const selectedTeamById = new Map(
        selectedTeams.map((team) => [team.id, team]),
      );

      for (const teamId of teamIds) {
        const team = selectedTeamById.get(teamId);
        if (!team || !team.isActive) {
          throw new BadRequestException(
            'Selected team does not exist or is inactive',
          );
        }
        if (
          !team.leaderId ||
          !team.leader?.isActive ||
          team.leader.role !== 'TEAM_LEADER' ||
          !team.leader.employeeProfile
        ) {
          throw new BadRequestException(
            `${team.name} must have an active Team Leader before it can be assigned to a Manager`,
          );
        }
      }

      const selectedLeaderIds = Array.from(
        new Set(
          selectedTeams.flatMap((team) =>
            team.leaderId ? [team.leaderId] : [],
          ),
        ),
      );
      const leadersToUnassign = currentReports
        .filter(
          (profile) =>
            profile.user.ledTeams.length > 0 &&
            !selectedLeaderIds.includes(profile.userId),
        )
        .map((profile) => profile.userId);

      if (leadersToUnassign.length) {
        await tx.employeeProfile.updateMany({
          where: { userId: { in: leadersToUnassign } },
          data: { reportingToId: null },
        });
      }
      if (selectedLeaderIds.length) {
        await tx.employeeProfile.updateMany({
          where: { userId: { in: selectedLeaderIds } },
          data: { reportingToId: managerUserId },
        });
      }
    });
  }
  private text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  private async audit(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    const actorExists = actorUserId
      ? await this.prisma.user.findUnique({
          where: { id: actorUserId },
          select: { id: true },
        })
      : null;
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorExists?.id ?? null,
        action,
        entityType,
        entityId,
        metadata: {
          ...metadata,
          ...(actorExists ? {} : { attemptedActorUserId: actorUserId }),
        } as Prisma.InputJsonValue,
      },
    });
  }
}

