import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { getUserRoleLabel } from '../common/role-labels';
import { TenantAccessService } from '../common/tenant/tenant-access.service';

type Query = Record<string, string | string[] | undefined>;
type DashboardRange = 'today' | 'week' | 'month';
type RankingRange =
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'yearly'
  | 'custom';
type CallingPreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

type CallingReportContext = {
  reportForLabel: string;
  reportForName: string;
  reportForMeta: string;
  generatedByName?: string | null;
};

const rankingRoles = [
  Role.ADMIN,
  Role.HR,
  Role.SALES_MANAGER,
  Role.SALES_AGENT,
  Role.TELECALLER,
  Role.MARKETING,
];

const adminRankingRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private get organizationId(): string {
    return this.tenantAccess.organizationId;
  }

  private tenantUserWhere(
    where: Prisma.UserWhereInput = {},
  ): Prisma.UserWhereInput {
    return {
      AND: [
        this.tenantAccess.employeeWhere(),
        {
          OR: [
            { employeeProfile: { is: null } },
            { employeeProfile: { is: { teamId: null } } },
            {
              employeeProfile: {
                is: { team: { organizationId: this.organizationId } },
              },
            },
          ],
        },
        where,
      ],
    };
  }

  private tenantLeadWhere(
    where: Prisma.LeadWhereInput = {},
  ): Prisma.LeadWhereInput {
    return { AND: [{ organizationId: this.organizationId }, where] };
  }

  private tenantTeamWhere(
    where: Prisma.TeamWhereInput = {},
  ): Prisma.TeamWhereInput {
    return { AND: [{ organizationId: this.organizationId }, where] };
  }

  private tenantProjectWhere(
    where: Prisma.ProjectWhereInput = {},
  ): Prisma.ProjectWhereInput {
    return { AND: [{ organizationId: this.organizationId }, where] };
  }

  private tenantFollowUpWhere(
    where: Prisma.FollowUpWhereInput = {},
  ): Prisma.FollowUpWhereInput {
    return { AND: [{ lead: { organizationId: this.organizationId } }, where] };
  }

  private tenantSiteVisitWhere(
    where: Prisma.SiteVisitWhereInput = {},
  ): Prisma.SiteVisitWhereInput {
    return { AND: [{ lead: { organizationId: this.organizationId } }, where] };
  }

  private tenantBookingWhere(
    where: Prisma.BookingWhereInput = {},
  ): Prisma.BookingWhereInput {
    return { AND: [{ lead: { organizationId: this.organizationId } }, where] };
  }

  private tenantActivityWhere(
    where: Prisma.ActivityWhereInput = {},
  ): Prisma.ActivityWhereInput {
    return { AND: [{ lead: { organizationId: this.organizationId } }, where] };
  }

  private normalizeTenantRoleFilter(value: unknown): Role | 'all' {
    const role = String(value ?? 'all');
    return role !== Role.SUPER_ADMIN &&
      Object.values(Role).includes(role as Role)
      ? (role as Role)
      : 'all';
  }

  private readonly chartColors = [
    '#082b55',
    '#ff6b00',
    '#397ab8',
    '#68c84f',
    '#f04438',
    '#6254d9',
    '#2788c7',
    '#ff921e',
  ];

  private percent(value: number, total: number) {
    return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';
  }

  private startOfDay(value: Date) {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private endOfDay(value: Date) {
    const next = new Date(value);
    next.setHours(23, 59, 59, 999);
    return next;
  }

  private normalizeRange(value?: string): DashboardRange {
    if (value === 'week' || value === 'month') return value;
    return 'today';
  }

  private resolveWindow(range: DashboardRange) {
    const now = new Date();
    const end = this.endOfDay(now);
    if (range === 'month') {
      return {
        start: this.startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end,
        label: now.toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        }),
      };
    }
    if (range === 'week') {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      return {
        start: this.startOfDay(start),
        end,
        label: 'This week',
      };
    }
    return {
      start: this.startOfDay(now),
      end,
      label: 'Today',
    };
  }

  private resolvePreviousWindow(range: DashboardRange, start: Date, end: Date) {
    if (range === 'month') {
      const previousMonthStart = new Date(start);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      const previousMonthEnd = new Date(start);
      previousMonthEnd.setMilliseconds(previousMonthEnd.getMilliseconds() - 1);
      return {
        start: this.startOfDay(previousMonthStart),
        end: this.endOfDay(previousMonthEnd),
      };
    }

    const spanMs = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - spanMs);
    return {
      start: this.startOfDay(previousStart),
      end: this.endOfDay(previousEnd),
    };
  }

  private async masterName(id: string | null | undefined) {
    if (!id) return 'Unknown';
    const db = this.prisma as any;
    const record = await db.leadMasterValue
      .findUnique({ where: { id } })
      .catch(() => null);
    return record?.name ?? id;
  }

  private parseDateFilter(value: unknown, fallback: Date, endOfDay = false) {
    if (!value) return fallback;
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return fallback;
    return endOfDay ? this.endOfDay(parsed) : this.startOfDay(parsed);
  }

  private numberQuery(value: unknown, fallback: number) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private normalizeRankingRange(value?: string): RankingRange {
    if (
      value === 'quarterly' ||
      value === 'half_yearly' ||
      value === 'yearly' ||
      value === 'custom'
    ) {
      return value;
    }
    return 'monthly';
  }

  private resolveRankingWindow(query: Query = {}) {
    const now = new Date();
    const range = this.normalizeRankingRange(String(query.range ?? 'monthly'));

    if (range === 'custom') {
      if (!query.dateFrom || !query.dateTo) {
        throw new BadRequestException(
          'dateFrom and dateTo are required for custom ranking range',
        );
      }
      const start = this.parseDateFilter(query.dateFrom, now);
      const end = this.parseDateFilter(query.dateTo, now, true);
      return {
        range,
        start,
        end,
        label: `${start.toLocaleDateString('en-IN')} - ${end.toLocaleDateString(
          'en-IN',
        )}`,
      };
    }

    if (range === 'yearly') {
      const start = this.startOfDay(new Date(now.getFullYear(), 0, 1));
      return {
        range,
        start,
        end: this.endOfDay(now),
        label: String(now.getFullYear()),
      };
    }

    if (range === 'half_yearly') {
      const halfStartMonth = now.getMonth() < 6 ? 0 : 6;
      const start = this.startOfDay(
        new Date(now.getFullYear(), halfStartMonth, 1),
      );
      return {
        range,
        start,
        end: this.endOfDay(now),
        label: halfStartMonth === 0 ? 'First half' : 'Second half',
      };
    }

    if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = this.startOfDay(
        new Date(now.getFullYear(), quarterStartMonth, 1),
      );
      return {
        range,
        start,
        end: this.endOfDay(now),
        label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
      };
    }

    const start = this.startOfDay(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    return {
      range,
      start,
      end: this.endOfDay(now),
      label: now.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  private normalizeCallingPreset(value?: string): CallingPreset {
    if (
      value === 'yesterday' ||
      value === 'last_7_days' ||
      value === 'this_month' ||
      value === 'last_month' ||
      value === 'custom'
    ) {
      return value;
    }
    return 'today';
  }

  private resolveCallingWindow(query: Query = {}) {
    const now = new Date();
    const preset = this.normalizeCallingPreset(String(query.preset ?? 'today'));

    if (preset === 'custom') {
      if (!query.dateFrom || !query.dateTo) {
        throw new BadRequestException(
          'dateFrom and dateTo are required for custom calling report range',
        );
      }
      const start = this.parseDateFilter(query.dateFrom, now);
      const end = this.parseDateFilter(query.dateTo, now, true);
      return {
        preset,
        start,
        end,
        label: `${start.toLocaleDateString('en-IN')} - ${end.toLocaleDateString(
          'en-IN',
        )}`,
      };
    }

    if (preset === 'yesterday') {
      const value = new Date(now);
      value.setDate(value.getDate() - 1);
      return {
        preset,
        start: this.startOfDay(value),
        end: this.endOfDay(value),
        label: 'Yesterday',
      };
    }

    if (preset === 'last_7_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return {
        preset,
        start: this.startOfDay(start),
        end: this.endOfDay(now),
        label: 'Last 7 days',
      };
    }

    if (preset === 'this_month') {
      return {
        preset,
        start: this.startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: this.endOfDay(now),
        label: now.toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        }),
      };
    }

    if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        preset,
        start: this.startOfDay(start),
        end: this.endOfDay(end),
        label: start.toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        }),
      };
    }

    return {
      preset,
      start: this.startOfDay(now),
      end: this.endOfDay(now),
      label: 'Today',
    };
  }

  private normalizeCallDirection(value?: string | null) {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    if (
      normalized === 'incoming' ||
      normalized === 'inbound' ||
      normalized.startsWith('in ')
    ) {
      return 'Incoming';
    }
    return 'Outgoing';
  }

  private classifyCallOutcome(value?: string | null) {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return 'not_connected';
    if (
      ['connected', 'interested', 'callback requested', 'not interested'].some(
        (token) => normalized === token || normalized.includes(token),
      )
    ) {
      return 'connected';
    }
    if (
      ['missed', 'no answer', 'busy', 'switched off', 'failed'].some(
        (token) => normalized === token || normalized.includes(token),
      )
    ) {
      return 'missed';
    }
    return 'not_connected';
  }

  private createEmptyCallMetrics() {
    return {
      totalCalls: 0,
      connectedCalls: 0,
      notConnectedCalls: 0,
      incomingCalls: 0,
      outgoingCalls: 0,
      totalDurationSeconds: 0,
      callsPerHour: 0,
      missedCalls: 0,
      answerRate: 0,
      leadContextCount: 0,
      latestCallAt: null as Date | null,
    };
  }

  private applyCallToMetrics(metrics: any, log: any) {
    const direction = this.normalizeCallDirection(log.direction);
    const outcomeClass = this.classifyCallOutcome(log.outcome);
    metrics.totalCalls += 1;
    if (direction === 'Incoming') metrics.incomingCalls += 1;
    else metrics.outgoingCalls += 1;
    if (outcomeClass === 'connected') metrics.connectedCalls += 1;
    else metrics.notConnectedCalls += 1;
    if (outcomeClass === 'missed') metrics.missedCalls += 1;
    metrics.totalDurationSeconds += Number(log.durationSeconds ?? 0) || 0;
    if (
      !metrics.latestCallAt ||
      new Date(log.startedAt).getTime() > metrics.latestCallAt.getTime()
    ) {
      metrics.latestCallAt = log.startedAt;
    }
  }

  private finalizeCallMetrics(
    metrics: any,
    start: Date,
    end: Date,
    leadIds?: Set<string>,
  ) {
    const hours = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime() + 1) / (60 * 60 * 1000)),
    );
    return {
      ...metrics,
      callsPerHour: Number((metrics.totalCalls / hours).toFixed(2)),
      answerRate: metrics.totalCalls
        ? Number(
            ((metrics.connectedCalls / metrics.totalCalls) * 100).toFixed(1),
          )
        : 0,
      leadContextCount: leadIds?.size ?? metrics.leadContextCount,
    };
  }

  private secondsLabel(totalSeconds: number) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    return `${minutes}m`;
  }

  private dateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private eachDay(start: Date, end: Date) {
    const days: Date[] = [];
    const cursor = this.startOfDay(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  private isAdminRankingRole(role?: string | null) {
    return Boolean(role && adminRankingRoles.includes(role));
  }

  private buildCallingReportContext({
    scope,
    selectedUserId,
    selectedTeamId,
    users,
    teams,
    generatedBy,
  }: {
    scope: string;
    selectedUserId: string;
    selectedTeamId: string;
    users: any[];
    teams: any[];
    generatedBy?: {
      fullName?: string | null;
      email?: string | null;
      role?: string | null;
    } | null;
  }): CallingReportContext {
    const generatedByName = generatedBy?.fullName ?? generatedBy?.email ?? null;

    if (selectedUserId && selectedUserId !== 'all') {
      const user = users.find((item: any) => item.id === selectedUserId);
      return {
        reportForLabel: 'Employee',
        reportForName: user?.fullName ?? user?.email ?? 'Selected employee',
        reportForMeta: [
          user?.role ? getUserRoleLabel(user.role) : null,
          user?.employeeProfile?.team?.name,
        ]
          .filter(Boolean)
          .join(' - '),
        generatedByName,
      };
    }

    if (selectedTeamId && selectedTeamId !== 'all') {
      const team = teams.find((item: any) => item.id === selectedTeamId);
      return {
        reportForLabel: 'Team',
        reportForName: team?.name ?? 'Selected team',
        reportForMeta: team?.leader
          ? `Leader: ${
              team.leader.fullName ?? team.leader.email ?? 'Unassigned'
            }`
          : '',
        generatedByName,
      };
    }

    return {
      reportForLabel: scope === 'team' ? 'Teams' : 'Employees',
      reportForName:
        scope === 'team' ? 'All visible teams' : 'All visible employees',
      reportForMeta: 'Filtered calling performance report',
      generatedByName,
    };
  }

  async getAdminCallingPerformanceData(
    query: Query = {},
    actor?: {
      sub?: string;
      fullName?: string | null;
      email?: string | null;
      role?: string | null;
    },
  ) {
    const db = this.prisma as any;
    const { preset, start, end, label } = this.resolveCallingWindow(query);
    const page = this.numberQuery(query.page, 1);
    const limit = Math.min(this.numberQuery(query.limit, 10), 100);
    const selectedRole = this.normalizeTenantRoleFilter(query.role);
    let selectedUserId = String(query.userId ?? 'all');
    let selectedTeamId = String(query.teamId ?? 'all');
    const scope = String(query.scope ?? 'user') === 'team' ? 'team' : 'user';
    const search = String(query.search ?? '')
      .trim()
      .toLowerCase();
    const operationalRoles = [
      Role.ADMIN,
      Role.HR,
      Role.SALES_MANAGER,
      Role.TELECALLER,
      Role.SALES_AGENT,
      Role.MARKETING,
    ];
    const adminReportRoles = [
      'SUPER_ADMIN',
      'ADMIN',
      'HR',
      'SALES_MANAGER',
      'TEAM_LEADER',
      'MANAGER',
    ];
    const actorRole = actor?.role ?? '';
    const isAdminReportActor = adminReportRoles.includes(actorRole);
    const reportRole = !isAdminReportActor
      ? this.normalizeTenantRoleFilter(actorRole)
      : selectedRole;
    if (!isAdminReportActor && actor?.sub) {
      selectedUserId = actor.sub;
      selectedTeamId = 'all';
    }

    const users = await db.user.findMany({
      where: this.tenantUserWhere({
        isActive: true,
        role: reportRole !== 'all' ? reportRole : { in: operationalRoles },
        ...(selectedUserId && selectedUserId !== 'all'
          ? { id: selectedUserId }
          : {}),
        ...(selectedTeamId && selectedTeamId !== 'all'
          ? { employeeProfile: { teamId: selectedTeamId } }
          : {}),
      }),
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarStorageKey: true,
        employeeProfile: {
          select: {
            designation: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                leader: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const userIds = users.map((user: any) => user.id);
    const userMap = new Map<string, any>(
      users.map((user: any) => [user.id, user]),
    );
    const [callLogs, teams, generatedByUser] = await Promise.all([
      userIds.length
        ? db.callLog.findMany({
            where: {
              startedAt: { gte: start, lte: end },
              userId: { in: userIds },
            },
            include: {
              lead: {
                select: {
                  id: true,
                  name: true,
                  displayId: true,
                  mobile: true,
                },
              },
            },
            orderBy: { startedAt: 'desc' },
          })
        : Promise.resolve([]),
      db.team.findMany({
        where: this.tenantTeamWhere({
          isActive: true,
          ...(selectedTeamId && selectedTeamId !== 'all'
            ? { id: selectedTeamId }
            : {}),
        }),
        select: {
          id: true,
          name: true,
          leader: { select: { id: true, fullName: true, email: true } },
          members: { select: { userId: true } },
        },
        orderBy: { name: 'asc' },
      }),
      actor?.sub
        ? db.user.findFirst({
            where: this.tenantUserWhere({ id: actor.sub }),
            select: { fullName: true, email: true, role: true },
          })
        : Promise.resolve(null),
    ]);
    const scopedTeams = teams.map((team: any) => ({
      ...team,
      leader:
        team.leader?.id && userMap.has(team.leader.id) ? team.leader : null,
      members: (team.members ?? []).filter((member: any) =>
        userMap.has(member.userId),
      ),
    }));
    const reportContext = this.buildCallingReportContext({
      scope,
      selectedUserId,
      selectedTeamId,
      users,
      teams: scopedTeams,
      generatedBy: generatedByUser ?? actor ?? null,
    });

    const logMatchesSearch = (log: any) => {
      if (!search) return true;
      const user = userMap.get(log.userId);
      return [
        user?.fullName,
        user?.email,
        user?.role,
        user?.employeeProfile?.team?.name,
        log.direction,
        log.outcome,
        log.notes,
        log.customerResponse,
        log.lead?.name,
        log.lead?.displayId,
        log.lead?.mobile,
      ]
        .filter(Boolean)
        .some((value: any) => String(value).toLowerCase().includes(search));
    };

    const filteredLogs = callLogs.filter(logMatchesSearch);
    const summaryMetrics = this.createEmptyCallMetrics();
    const summaryLeadIds = new Set<string>();
    const userRows = new Map<string, any>();
    users.forEach((user: any) => {
      userRows.set(user.id, {
        id: user.id,
        name: user.fullName ?? user.email,
        email: user.email,
        role: user.role,
        designation: user.employeeProfile?.designation ?? null,
        teamId: user.employeeProfile?.teamId ?? null,
        teamName: user.employeeProfile?.team?.name ?? 'Unassigned',
        image: user.avatarStorageKey ?? null,
        metrics: this.createEmptyCallMetrics(),
        leadIds: new Set<string>(),
      });
    });

    const teamRows = new Map<string, any>();
    scopedTeams.forEach((team: any) => {
      teamRows.set(team.id, {
        id: team.id,
        name: team.name,
        leaderName: team.leader?.fullName ?? team.leader?.email ?? 'Unassigned',
        memberCount: team.members?.length ?? 0,
        metrics: this.createEmptyCallMetrics(),
        leadIds: new Set<string>(),
      });
    });
    teamRows.set('unassigned', {
      id: 'unassigned',
      name: 'Unassigned',
      leaderName: 'Unassigned',
      memberCount: users.filter((user: any) => !user.employeeProfile?.teamId)
        .length,
      metrics: this.createEmptyCallMetrics(),
      leadIds: new Set<string>(),
    });

    filteredLogs.forEach((log: any) => {
      const user = userMap.get(log.userId);
      if (!user) return;
      const row = userRows.get(user.id);
      const teamId = user.employeeProfile?.teamId ?? 'unassigned';
      const teamRow = teamRows.get(teamId) ?? teamRows.get('unassigned');
      this.applyCallToMetrics(summaryMetrics, log);
      if (log.leadId) summaryLeadIds.add(log.leadId);
      if (row) {
        this.applyCallToMetrics(row.metrics, log);
        if (log.leadId) row.leadIds.add(log.leadId);
      }
      if (teamRow) {
        this.applyCallToMetrics(teamRow.metrics, log);
        if (log.leadId) teamRow.leadIds.add(log.leadId);
      }
    });

    const finalizeUserRow = (row: any) => ({
      ...row,
      ...this.finalizeCallMetrics(row.metrics, start, end, row.leadIds),
      totalDurationLabel: this.secondsLabel(row.metrics.totalDurationSeconds),
      latestCallAt: row.metrics.latestCallAt?.toISOString() ?? null,
      metrics: undefined,
      leadIds: undefined,
    });
    const finalizeTeamRow = (row: any) => ({
      ...row,
      ...this.finalizeCallMetrics(row.metrics, start, end, row.leadIds),
      totalDurationLabel: this.secondsLabel(row.metrics.totalDurationSeconds),
      latestCallAt: row.metrics.latestCallAt?.toISOString() ?? null,
      metrics: undefined,
      leadIds: undefined,
    });

    const rowSort = (left: any, right: any) => {
      if (right.totalCalls !== left.totalCalls)
        return right.totalCalls - left.totalCalls;
      if (right.connectedCalls !== left.connectedCalls) {
        return right.connectedCalls - left.connectedCalls;
      }
      return String(left.name).localeCompare(String(right.name));
    };

    const allUserRows = [...userRows.values()]
      .map(finalizeUserRow)
      .filter((row: any) => {
        if (!search) return true;
        return (
          row.totalCalls > 0 ||
          [row.name, row.email, row.role, row.teamName, row.designation]
            .filter(Boolean)
            .some((value: any) => String(value).toLowerCase().includes(search))
        );
      })
      .sort(rowSort);
    const allTeamRows = [...teamRows.values()]
      .map(finalizeTeamRow)
      .filter(
        (row: any) =>
          row.id !== 'unassigned' || row.memberCount > 0 || row.totalCalls > 0,
      )
      .filter((row: any) => {
        if (!search) return true;
        return (
          row.totalCalls > 0 ||
          [row.name, row.leaderName]
            .filter(Boolean)
            .some((value: any) => String(value).toLowerCase().includes(search))
        );
      })
      .sort(rowSort);

    const summary = this.finalizeCallMetrics(
      summaryMetrics,
      start,
      end,
      summaryLeadIds,
    );
    const summaryWithLabel = {
      ...summary,
      totalDurationLabel: this.secondsLabel(summary.totalDurationSeconds),
    };

    const dailyByKey = new Map<string, any>();
    this.eachDay(start, end).forEach((day) => {
      dailyByKey.set(this.dateKey(day), {
        date: this.dateKey(day),
        label: day.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        }),
        total: 0,
        connected: 0,
        missed: 0,
      });
    });
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      calls: 0,
      connected: 0,
    }));
    const outcomes = new Map<string, number>();
    const directions = new Map<string, number>([
      ['Incoming', 0],
      ['Outgoing', 0],
    ]);

    filteredLogs.forEach((log: any) => {
      const startedAt = new Date(log.startedAt);
      const day = dailyByKey.get(this.dateKey(startedAt));
      const outcomeClass = this.classifyCallOutcome(log.outcome);
      const direction = this.normalizeCallDirection(log.direction);
      if (day) {
        day.total += 1;
        if (outcomeClass === 'connected') day.connected += 1;
        if (outcomeClass === 'missed') day.missed += 1;
      }
      const hour = hourly[startedAt.getHours()];
      hour.calls += 1;
      if (outcomeClass === 'connected') hour.connected += 1;
      const outcome = String(log.outcome ?? 'Unknown').trim() || 'Unknown';
      outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
      directions.set(direction, (directions.get(direction) ?? 0) + 1);
    });

    const startIndex = (page - 1) * limit;
    const totalRows =
      scope === 'team' ? allTeamRows.length : allUserRows.length;

    return {
      meta: {
        preset,
        label,
        scope,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        page,
        limit,
        totalRows,
        context: reportContext,
      },
      summary: summaryWithLabel,
      users: allUserRows.slice(startIndex, startIndex + limit),
      teams: allTeamRows.slice(startIndex, startIndex + limit),
      charts: {
        dailyTrend: [...dailyByKey.values()],
        hourlyTrend: hourly,
        outcomeDistribution: [...outcomes.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((left, right) => right.value - left.value),
        directionSplit: [...directions.entries()].map(([name, value]) => ({
          name,
          value,
        })),
        topCallers: allUserRows.slice(0, 8).map((row: any) => ({
          id: row.id,
          name: row.name,
          teamName: row.teamName,
          totalCalls: row.totalCalls,
          connectedCalls: row.connectedCalls,
        })),
      },
      filters: {
        employees: users.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.email,
          role: user.role,
          teamId: user.employeeProfile?.teamId ?? null,
        })),
        teams: teams.map((team: any) => ({ id: team.id, name: team.name })),
        roles: operationalRoles,
      },
    };
  }

  async generateCallingPerformancePdf(
    query: Query = {},
    actor?: {
      sub?: string;
      fullName?: string | null;
      email?: string | null;
      role?: string | null;
    },
  ) {
    const data = await this.getAdminCallingPerformanceData(
      {
        ...query,
        page: '1',
        limit: '100',
      },
      actor,
    );
    const scope = data.meta.scope;
    const rows = scope === 'team' ? data.teams : data.users;
    const filename = `calling-performance-${data.meta.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.pdf`;

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 28,
        });
        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const navy = '#083358';
        const orange = '#ff6600';
        const border = '#dbe4ef';
        const muted = '#64748b';
        const width = doc.page.width - 56;
        doc.font('Helvetica-Bold').fontSize(18).fillColor(navy);
        doc.text('Calling Performance Report', 28, 28, {
          width,
          align: 'center',
        });
        doc.font('Helvetica').fontSize(9).fillColor(muted);
        doc.text(data.meta.label, 28, 52, { width, align: 'center' });
        doc
          .moveTo(28, 70)
          .lineTo(doc.page.width - 28, 70)
          .lineWidth(2)
          .strokeColor(orange)
          .stroke();
        doc.font('Helvetica-Bold').fontSize(9).fillColor(navy);
        doc.text(
          `${data.meta.context.reportForLabel}: ${data.meta.context.reportForName}`,
          28,
          78,
          { width: width / 2 },
        );
        doc.font('Helvetica').fontSize(8).fillColor(muted);
        doc.text(
          data.meta.context.reportForMeta || 'Selected report scope',
          28,
          92,
          {
            width: width / 2,
          },
        );
        doc.text(
          `Generated by: ${data.meta.context.generatedByName ?? 'CRM user'}`,
          doc.page.width / 2,
          78,
          { width: width / 2, align: 'right' },
        );
        doc.text(`Date range: ${data.meta.label}`, doc.page.width / 2, 92, {
          width: width / 2,
          align: 'right',
        });

        const statColumns = [
          ['Total Calls', data.summary.totalCalls],
          ['Connected', data.summary.connectedCalls],
          ['Not Connected', data.summary.notConnectedCalls],
          ['Incoming', data.summary.incomingCalls],
          ['Outgoing', data.summary.outgoingCalls],
          ['Missed', data.summary.missedCalls],
          ['Answer Rate', `${data.summary.answerRate}%`],
          ['Duration', data.summary.totalDurationLabel],
        ];
        let x = 28;
        const statWidth = width / statColumns.length;
        statColumns.forEach(([label, value]) => {
          doc.rect(x, 118, statWidth - 6, 52).fillAndStroke('#f8fafc', border);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(muted)
            .text(String(label), x + 8, 129, {
              width: statWidth - 22,
            });
          doc
            .font('Helvetica-Bold')
            .fontSize(15)
            .fillColor(navy)
            .text(String(value), x + 8, 146, {
              width: statWidth - 22,
            });
          x += statWidth;
        });

        const headers =
          scope === 'team'
            ? [
                'Team',
                'Leader',
                'Members',
                'Total',
                'Connected',
                'Missed',
                'Incoming',
                'Outgoing',
                'Duration',
                'Answer %',
              ]
            : [
                'Employee',
                'Role',
                'Team',
                'Total',
                'Connected',
                'Missed',
                'Incoming',
                'Outgoing',
                'Duration',
                'Answer %',
              ];
        const columnWidths = [128, 86, 120, 48, 58, 48, 52, 52, 66, 54];
        let y = 195;
        x = 28;
        headers.forEach((header, index) => {
          doc.rect(x, y, columnWidths[index], 24).fillAndStroke(navy, border);
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#ffffff')
            .text(header, x + 4, y + 8, {
              width: columnWidths[index] - 8,
              align: 'center',
            });
          x += columnWidths[index];
        });
        y += 24;

        rows.slice(0, 18).forEach((row: any, rowIndex: number) => {
          x = 28;
          const values =
            scope === 'team'
              ? [
                  row.name,
                  row.leaderName,
                  row.memberCount,
                  row.totalCalls,
                  row.connectedCalls,
                  row.missedCalls,
                  row.incomingCalls,
                  row.outgoingCalls,
                  row.totalDurationLabel,
                  `${row.answerRate}%`,
                ]
              : [
                  row.name,
                  row.role,
                  row.teamName,
                  row.totalCalls,
                  row.connectedCalls,
                  row.missedCalls,
                  row.incomingCalls,
                  row.outgoingCalls,
                  row.totalDurationLabel,
                  `${row.answerRate}%`,
                ];
          values.forEach((value, index) => {
            doc
              .rect(x, y, columnWidths[index], 24)
              .fillAndStroke(
                rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                border,
              );
            doc
              .font('Helvetica')
              .fontSize(7)
              .fillColor(navy)
              .text(String(value ?? '-'), x + 4, y + 8, {
                width: columnWidths[index] - 8,
                align: index < 3 ? 'left' : 'center',
                ellipsis: true,
              });
            x += columnWidths[index];
          });
          y += 24;
        });

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(
            'Connected includes Connected, Interested, Callback Requested, and Not Interested. Missed includes No Answer, Busy, Switched Off, Failed, and Missed.',
            28,
            doc.page.height - 42,
            { width },
          );
        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    return { filename, pdfBuffer };
  }

  private createEmptyLeadPerformanceMetrics() {
    return {
      totalLeads: 0,
      newLeads: 0,
      interestedLeads: 0,
      notInterestedLeads: 0,
      followUps: 0,
      siteVisitScheduled: 0,
      siteVisitDone: 0,
      reVisitDone: 0,
      bookingDone: 0,
      cp: 0,
      obmDone: 0,
      eoi: 0,
      outStationLead: 0,
      lostLeads: 0,
      leadBookingDoneRate: 0,
      latestActivityAt: null as Date | null,
    };
  }

  private normalizeLeadPerformanceScope(value?: string) {
    if (value === 'team' || value === 'project' || value === 'source') {
      return value;
    }
    return 'user';
  }

  private normalizeText(value?: string | null) {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  private statusNameForLead(
    lead: any,
    statusMap: Map<string, string>,
    fallback = 'Not set',
  ) {
    return (
      (statusMap.get(String(lead.statusId ?? '')) ??
        statusMap.get(String(lead.stageId ?? '')) ??
        (lead.statusName ? String(lead.statusName) : '') ??
        fallback) ||
      fallback
    );
  }

  private sourceNameForLead(lead: any, sourceMap: Map<string, string>) {
    return (
      sourceMap.get(String(lead.sourceId ?? '')) ?? lead.sourceId ?? 'Unknown'
    );
  }

  private primaryLeadUserId(lead: any) {
    return (
      lead.ownerId ??
      lead.telecallerId ??
      lead.fieldExecutiveId ??
      lead.createdById ??
      'unassigned'
    );
  }

  private leadProjectKey(lead: any, projectMap: Map<string, any>) {
    const projectId = lead.requirement?.preferredProjectId ?? lead.projectId;
    if (projectId && projectMap.has(projectId)) return projectId;
    if (projectId) return String(projectId);
    return 'unassigned';
  }

  private incrementLeadMetric(metrics: any, key: string, amount = 1) {
    metrics[key] = (Number(metrics[key]) || 0) + amount;
  }

  private touchLeadMetric(metrics: any, value?: Date | string | null) {
    if (!value) return;
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;
    if (
      !metrics.latestActivityAt ||
      next > new Date(metrics.latestActivityAt)
    ) {
      metrics.latestActivityAt = next;
    }
  }

  private applyStatusBuckets(metrics: any, statusName?: string | null) {
    const normalized = this.normalizeText(statusName);
    if (!normalized) return;

    if (normalized.includes('new'))
      this.incrementLeadMetric(metrics, 'newLeads');
    if (normalized.includes('not interested')) {
      this.incrementLeadMetric(metrics, 'notInterestedLeads');
    } else if (normalized.includes('interested')) {
      this.incrementLeadMetric(metrics, 'interestedLeads');
    }
    if (normalized.includes('lost'))
      this.incrementLeadMetric(metrics, 'lostLeads');
    if (normalized === 'cp' || normalized.includes('channel partner')) {
      this.incrementLeadMetric(metrics, 'cp');
    }
    if (normalized.includes('obm'))
      this.incrementLeadMetric(metrics, 'obmDone');
    if (normalized.includes('eoi')) this.incrementLeadMetric(metrics, 'eoi');
    if (
      normalized.includes('out station') ||
      normalized.includes('outstation')
    ) {
      this.incrementLeadMetric(metrics, 'outStationLead');
    }
    if (
      normalized.includes('booking done') ||
      normalized.includes('booked') ||
      normalized === 'booking'
    ) {
      this.incrementLeadMetric(metrics, 'bookingDone');
    }
  }

  private finalizeLeadPerformanceMetrics(metrics: any) {
    return {
      ...metrics,
      leadBookingDoneRate: metrics.totalLeads
        ? Number(((metrics.bookingDone / metrics.totalLeads) * 100).toFixed(1))
        : 0,
      latestActivityAt: metrics.latestActivityAt
        ? new Date(metrics.latestActivityAt).toISOString()
        : null,
    };
  }

  private addLeadPerformanceToMaps(
    maps: {
      summary: any;
      users: Map<string, any>;
      teams: Map<string, any>;
      projects: Map<string, any>;
      sources: Map<string, any>;
    },
    keys: {
      userId?: string | null;
      teamId?: string | null;
      projectId?: string | null;
      sourceId?: string | null;
    },
    callback: (metrics: any) => void,
  ) {
    callback(maps.summary);
    const userRow = maps.users.get(keys.userId ?? 'unassigned');
    if (userRow) callback(userRow.metrics);
    const teamRow = maps.teams.get(keys.teamId ?? 'unassigned');
    if (teamRow) callback(teamRow.metrics);
    const projectRow = maps.projects.get(keys.projectId ?? 'unassigned');
    if (projectRow) callback(projectRow.metrics);
    const sourceRow = maps.sources.get(keys.sourceId ?? 'unassigned');
    if (sourceRow) callback(sourceRow.metrics);
  }

  async getAdminLeadPerformanceData(query: Query = {}) {
    const db = this.prisma as any;
    const { preset, start, end, label } = this.resolveCallingWindow(query);
    const page = this.numberQuery(query.page, 1);
    const limit = Math.min(this.numberQuery(query.limit, 10), 100);
    const selectedRole = this.normalizeTenantRoleFilter(query.role);
    const selectedUserId = String(query.userId ?? 'all');
    const selectedTeamId = String(query.teamId ?? 'all');
    const selectedProjectId = String(query.projectId ?? 'all');
    const selectedSourceId = String(query.sourceId ?? 'all');
    const scope = this.normalizeLeadPerformanceScope(
      String(query.scope ?? 'user'),
    );
    const search = String(query.search ?? '')
      .trim()
      .toLowerCase();
    const operationalRoles = [
      Role.ADMIN,
      Role.HR,
      Role.SALES_MANAGER,
      Role.TELECALLER,
      Role.SALES_AGENT,
      Role.MARKETING,
    ];

    const [users, teams, projects, statuses, sources] = await Promise.all([
      db.user.findMany({
        where: this.tenantUserWhere({
          isActive: true,
          role:
            selectedRole && selectedRole !== 'all'
              ? selectedRole
              : { in: operationalRoles },
          ...(selectedUserId && selectedUserId !== 'all'
            ? { id: selectedUserId }
            : {}),
          ...(selectedTeamId && selectedTeamId !== 'all'
            ? { employeeProfile: { teamId: selectedTeamId } }
            : {}),
        }),
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          avatarStorageKey: true,
          employeeProfile: {
            select: {
              designation: true,
              teamId: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  leader: { select: { id: true, fullName: true, email: true } },
                },
              },
            },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
      db.team.findMany({
        where: this.tenantTeamWhere({
          isActive: true,
          ...(selectedTeamId && selectedTeamId !== 'all'
            ? { id: selectedTeamId }
            : {}),
        }),
        select: {
          id: true,
          name: true,
          leader: { select: { id: true, fullName: true, email: true } },
          members: { select: { userId: true } },
        },
        orderBy: { name: 'asc' },
      }),
      db.project.findMany({
        where: this.tenantProjectWhere({
          ...(selectedProjectId && selectedProjectId !== 'all'
            ? { id: selectedProjectId }
            : {}),
        }),
        select: { id: true, name: true, location: true, status: true },
        orderBy: { name: 'asc' },
      }),
      db.leadMasterValue.findMany({
        where: { categoryRef: { code: 'status' } },
        select: { id: true, name: true, code: true, isActive: true },
      }),
      db.leadMasterValue.findMany({
        where: { categoryRef: { code: 'source' } },
        select: { id: true, name: true, code: true, isActive: true },
      }),
    ]);

    const userIds = users.map((user: any) => user.id);
    const userMap = new Map<string, any>(
      users.map((user: any) => [user.id, user]),
    );
    const projectMap = new Map<string, any>(
      projects.map((project: any) => [project.id, project]),
    );
    const statusMap = new Map<string, string>();
    statuses.forEach((status: any) => {
      [status.id, status.code, status.name]
        .filter(Boolean)
        .forEach((value) => statusMap.set(String(value), status.name));
    });
    const sourceMap = new Map<string, string>();
    sources.forEach((source: any) => {
      [source.id, source.code, source.name]
        .filter(Boolean)
        .forEach((value) => sourceMap.set(String(value), source.name));
    });

    const userRows = new Map<string, any>();
    users.forEach((user: any) => {
      userRows.set(user.id, {
        id: user.id,
        name: user.fullName ?? user.email,
        email: user.email,
        role: user.role,
        designation: user.employeeProfile?.designation ?? null,
        teamId: user.employeeProfile?.teamId ?? null,
        teamName: user.employeeProfile?.team?.name ?? 'Unassigned',
        image: user.avatarStorageKey ?? null,
        metrics: this.createEmptyLeadPerformanceMetrics(),
      });
    });
    userRows.set('unassigned', {
      id: 'unassigned',
      name: 'Unassigned',
      email: '',
      role: 'Unassigned',
      designation: null,
      teamId: null,
      teamName: 'Unassigned',
      image: null,
      metrics: this.createEmptyLeadPerformanceMetrics(),
    });

    const teamRows = new Map<string, any>();
    teams.forEach((team: any) => {
      const leader =
        team.leader?.id && userMap.has(team.leader.id) ? team.leader : null;
      teamRows.set(team.id, {
        id: team.id,
        name: team.name,
        leaderName: leader?.fullName ?? leader?.email ?? 'Unassigned',
        memberCount: (team.members ?? []).filter((member: any) =>
          userMap.has(member.userId),
        ).length,
        metrics: this.createEmptyLeadPerformanceMetrics(),
      });
    });
    teamRows.set('unassigned', {
      id: 'unassigned',
      name: 'Unassigned',
      leaderName: 'Unassigned',
      memberCount: users.filter((user: any) => !user.employeeProfile?.teamId)
        .length,
      metrics: this.createEmptyLeadPerformanceMetrics(),
    });

    const projectRows = new Map<string, any>();
    projects.forEach((project: any) => {
      projectRows.set(project.id, {
        id: project.id,
        name: project.name,
        location: project.location,
        status: project.status,
        metrics: this.createEmptyLeadPerformanceMetrics(),
      });
    });
    projectRows.set('unassigned', {
      id: 'unassigned',
      name: 'No project linked',
      location: 'Unassigned',
      status: 'Unassigned',
      metrics: this.createEmptyLeadPerformanceMetrics(),
    });

    const sourceRows = new Map<string, any>();
    sources
      .filter((source: any) => source.isActive !== false)
      .forEach((source: any) => {
        sourceRows.set(source.id, {
          id: source.id,
          name: source.name,
          code: source.code,
          metrics: this.createEmptyLeadPerformanceMetrics(),
        });
      });
    sourceRows.set('unassigned', {
      id: 'unassigned',
      name: 'Unknown source',
      code: 'UNKNOWN',
      metrics: this.createEmptyLeadPerformanceMetrics(),
    });

    const leadWhere: any = {
      organizationId: this.organizationId,
      deletedAt: null,
      ...(selectedProjectId && selectedProjectId !== 'all'
        ? { requirement: { preferredProjectId: selectedProjectId } }
        : {}),
      ...(selectedSourceId && selectedSourceId !== 'all'
        ? { sourceId: selectedSourceId }
        : {}),
      ...(userIds.length
        ? {
            OR: [
              { ownerId: { in: userIds } },
              { telecallerId: { in: userIds } },
              { fieldExecutiveId: { in: userIds } },
              { createdById: { in: userIds } },
            ],
          }
        : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { mobile: { contains: search, mode: 'insensitive' } },
                  { displayId: { contains: search, mode: 'insensitive' } },
                  { remarks: { contains: search, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : {}),
    };

    const [leads, followUps, siteVisits, bookings] = await Promise.all([
      db.lead.findMany({
        where: this.tenantLeadWhere({
          ...leadWhere,
          createdAt: { gte: start, lte: end },
        }),
        include: { requirement: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.followUp.findMany({
        where: {
          scheduledAt: { gte: start, lte: end },
          lead: leadWhere,
        },
        include: { lead: { include: { requirement: true } } },
        orderBy: { scheduledAt: 'desc' },
      }),
      db.siteVisit.findMany({
        where: {
          scheduledAt: { gte: start, lte: end },
          lead: leadWhere,
        },
        include: { lead: { include: { requirement: true } }, project: true },
        orderBy: { scheduledAt: 'desc' },
      }),
      db.booking.findMany({
        where: {
          bookingDate: { gte: start, lte: end },
          lead: leadWhere,
        },
        include: { lead: { include: { requirement: true } }, project: true },
        orderBy: { bookingDate: 'desc' },
      }),
    ]);

    const summary = this.createEmptyLeadPerformanceMetrics();
    const maps = {
      summary,
      users: userRows,
      teams: teamRows,
      projects: projectRows,
      sources: sourceRows,
    };
    const leadKeys = (lead: any) => {
      const userId = this.primaryLeadUserId(lead);
      const user = userMap.get(userId);
      const projectId = this.leadProjectKey(lead, projectMap);
      const sourceId =
        lead.sourceId && sourceRows.has(lead.sourceId)
          ? lead.sourceId
          : 'unassigned';
      return {
        userId: userRows.has(userId) ? userId : 'unassigned',
        teamId: user?.employeeProfile?.teamId ?? 'unassigned',
        projectId: projectRows.has(projectId) ? projectId : 'unassigned',
        sourceId,
      };
    };

    leads.forEach((lead: any) => {
      const statusName = this.statusNameForLead(lead, statusMap);
      this.addLeadPerformanceToMaps(maps, leadKeys(lead), (metrics) => {
        this.incrementLeadMetric(metrics, 'totalLeads');
        this.applyStatusBuckets(metrics, statusName);
        if (
          lead.lostAt &&
          new Date(lead.lostAt) >= start &&
          new Date(lead.lostAt) <= end
        ) {
          this.incrementLeadMetric(metrics, 'lostLeads');
        }
        this.touchLeadMetric(metrics, lead.createdAt);
      });
    });

    followUps.forEach((followUp: any) => {
      this.addLeadPerformanceToMaps(
        maps,
        leadKeys(followUp.lead),
        (metrics) => {
          this.incrementLeadMetric(metrics, 'followUps');
          this.touchLeadMetric(metrics, followUp.scheduledAt);
        },
      );
    });

    siteVisits.forEach((visit: any) => {
      const normalizedStatus = this.normalizeText(visit.status);
      const isDone =
        Boolean(visit.checkedOutAt) ||
        normalizedStatus.includes('completed') ||
        normalizedStatus.includes('done');
      const isReVisit = this.normalizeText(visit.visitType).includes('re');
      const projectId =
        visit.projectId && projectRows.has(visit.projectId)
          ? visit.projectId
          : this.leadProjectKey(visit.lead, projectMap);
      this.addLeadPerformanceToMaps(
        maps,
        { ...leadKeys(visit.lead), projectId },
        (metrics) => {
          this.incrementLeadMetric(metrics, 'siteVisitScheduled');
          if (isDone && isReVisit)
            this.incrementLeadMetric(metrics, 'reVisitDone');
          if (isDone && !isReVisit)
            this.incrementLeadMetric(metrics, 'siteVisitDone');
          this.touchLeadMetric(
            metrics,
            visit.checkedOutAt ?? visit.scheduledAt,
          );
        },
      );
    });

    bookings.forEach((booking: any) => {
      const projectId =
        booking.projectId && projectRows.has(booking.projectId)
          ? booking.projectId
          : this.leadProjectKey(booking.lead, projectMap);
      this.addLeadPerformanceToMaps(
        maps,
        { ...leadKeys(booking.lead), projectId },
        (metrics) => {
          this.incrementLeadMetric(metrics, 'bookingDone');
          this.touchLeadMetric(metrics, booking.bookingDate);
        },
      );
    });

    const rowSort = (left: any, right: any) => {
      const leftTotal =
        left.totalLeads +
        left.followUps +
        left.siteVisitDone +
        left.bookingDone;
      const rightTotal =
        right.totalLeads +
        right.followUps +
        right.siteVisitDone +
        right.bookingDone;
      if (rightTotal !== leftTotal) return rightTotal - leftTotal;
      return String(left.name).localeCompare(String(right.name));
    };
    const rowMatchesSearch = (row: any) => {
      if (!search) return true;
      return [
        row.name,
        row.email,
        row.role,
        row.teamName,
        row.leaderName,
        row.location,
        row.code,
      ]
        .filter(Boolean)
        .some((value: any) => String(value).toLowerCase().includes(search));
    };
    const finalizeRows = (rows: Map<string, any>) =>
      [...rows.values()]
        .map((row) => ({
          ...row,
          ...this.finalizeLeadPerformanceMetrics(row.metrics),
          metrics: undefined,
        }))
        .filter(
          (row) =>
            row.id !== 'unassigned' ||
            row.totalLeads > 0 ||
            row.followUps > 0 ||
            row.siteVisitScheduled > 0 ||
            row.bookingDone > 0,
        )
        .filter(rowMatchesSearch)
        .sort(rowSort);

    const allUserRows = finalizeRows(userRows);
    const allTeamRows = finalizeRows(teamRows);
    const allProjectRows = finalizeRows(projectRows);
    const allSourceRows = finalizeRows(sourceRows);
    const scopedRows =
      scope === 'team'
        ? allTeamRows
        : scope === 'project'
        ? allProjectRows
        : scope === 'source'
        ? allSourceRows
        : allUserRows;
    const startIndex = (page - 1) * limit;

    const dailyByKey = new Map<string, any>();
    this.eachDay(start, end).forEach((day) => {
      dailyByKey.set(this.dateKey(day), {
        date: this.dateKey(day),
        label: day.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        }),
        totalLeads: 0,
        interestedLeads: 0,
        bookingDone: 0,
      });
    });
    leads.forEach((lead: any) => {
      const day = dailyByKey.get(this.dateKey(new Date(lead.createdAt)));
      if (!day) return;
      day.totalLeads += 1;
      const statusName = this.statusNameForLead(lead, statusMap);
      const normalized = this.normalizeText(statusName);
      if (
        normalized.includes('interested') &&
        !normalized.includes('not interested')
      ) {
        day.interestedLeads += 1;
      }
    });
    bookings.forEach((booking: any) => {
      const day = dailyByKey.get(this.dateKey(new Date(booking.bookingDate)));
      if (day) day.bookingDone += 1;
    });

    const statusDistribution = [
      ['New Leads', summary.newLeads],
      ['Interested', summary.interestedLeads],
      ['Not Interested', summary.notInterestedLeads],
      ['Lost', summary.lostLeads],
      ['Booking Done', summary.bookingDone],
    ].map(([name, value]) => ({ name, value }));

    return {
      meta: {
        preset,
        label,
        scope,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        page,
        limit,
        totalRows: scopedRows.length,
      },
      summary: this.finalizeLeadPerformanceMetrics(summary),
      users: allUserRows.slice(startIndex, startIndex + limit),
      teams: allTeamRows.slice(startIndex, startIndex + limit),
      projects: allProjectRows.slice(startIndex, startIndex + limit),
      sources: allSourceRows.slice(startIndex, startIndex + limit),
      charts: {
        dailyTrend: [...dailyByKey.values()],
        statusDistribution,
        sourceSplit: allSourceRows.slice(0, 8).map((row: any) => ({
          id: row.id,
          name: row.name,
          value: row.totalLeads,
        })),
        projectPerformance: allProjectRows.slice(0, 8).map((row: any) => ({
          id: row.id,
          name: row.name,
          totalLeads: row.totalLeads,
          bookingDone: row.bookingDone,
        })),
      },
      filters: {
        employees: users.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.email,
          role: user.role,
          teamId: user.employeeProfile?.teamId ?? null,
        })),
        teams: teams.map((team: any) => ({ id: team.id, name: team.name })),
        projects: projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          location: project.location,
        })),
        sources: sources
          .filter((source: any) => source.isActive !== false)
          .map((source: any) => ({ id: source.id, name: source.name })),
        roles: operationalRoles,
      },
    };
  }

  async getMyLeadPerformanceData(
    query: Query = {},
    actor?: {
      sub?: string;
      fullName?: string | null;
      email?: string | null;
      role?: string | null;
    },
  ) {
    if (!actor?.sub) {
      throw new BadRequestException('Unable to resolve the current employee');
    }

    const employee = await this.prisma.user.findFirst({
      where: this.tenantUserWhere({ id: actor.sub }),
      select: { id: true, fullName: true, email: true, role: true },
    });
    if (!employee?.role) {
      throw new BadRequestException('Current employee is unavailable');
    }

    const data = await this.getAdminLeadPerformanceData({
      ...query,
      scope: 'user',
      role: employee.role,
      userId: employee.id,
      teamId: 'all',
    });
    const employeeName = employee.fullName ?? employee.email;

    return {
      ...data,
      meta: {
        ...data.meta,
        context: {
          reportForLabel: 'Employee',
          reportForName: employeeName,
          reportForMeta: getUserRoleLabel(employee.role),
          generatedByName: employeeName,
        },
      },
    };
  }

  async generateMyLeadPerformancePdf(
    query: Query = {},
    actor?: {
      sub?: string;
      fullName?: string | null;
      email?: string | null;
      role?: string | null;
    },
  ) {
    if (!actor?.sub) {
      throw new BadRequestException('Unable to resolve the current employee');
    }

    const employee = await this.prisma.user.findFirst({
      where: this.tenantUserWhere({ id: actor.sub }),
      select: { id: true, fullName: true, email: true, role: true },
    });
    if (!employee?.role) {
      throw new BadRequestException('Current employee is unavailable');
    }

    const employeeName = employee.fullName ?? employee.email;
    return this.generateLeadPerformancePdf(
      {
        ...query,
        scope: 'user',
        role: employee.role,
        userId: employee.id,
        teamId: 'all',
      },
      {
        reportForLabel: 'Employee',
        reportForName: employeeName,
        reportForMeta: getUserRoleLabel(employee.role),
        generatedByName: employeeName,
      },
    );
  }

  async generateLeadPerformancePdf(
    query: Query = {},
    reportContext?: CallingReportContext,
  ) {
    const data = await this.getAdminLeadPerformanceData({
      ...query,
      page: '1',
      limit: '100',
    });
    const scope = data.meta.scope;
    const rows =
      scope === 'team'
        ? data.teams
        : scope === 'project'
        ? data.projects
        : scope === 'source'
        ? data.sources
        : data.users;
    const filename = `lead-performance-${data.meta.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.pdf`;

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 28,
        });
        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const navy = '#083358';
        const orange = '#ff6600';
        const border = '#dbe4ef';
        const muted = '#64748b';
        const width = doc.page.width - 56;
        doc.font('Helvetica-Bold').fontSize(18).fillColor(navy);
        doc.text('Lead Performance Report', 28, 28, { width, align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor(muted);
        doc.text(data.meta.label, 28, 52, { width, align: 'center' });
        doc
          .moveTo(28, 70)
          .lineTo(doc.page.width - 28, 70)
          .lineWidth(2)
          .strokeColor(orange)
          .stroke();

        if (reportContext) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(navy);
          doc.text(
            `${reportContext.reportForLabel}: ${reportContext.reportForName}`,
            28,
            78,
            { width: width / 2 },
          );
          doc.font('Helvetica').fontSize(8).fillColor(muted);
          doc.text(reportContext.reportForMeta, 28, 92, { width: width / 2 });
          doc.text(
            `Generated by: ${reportContext.generatedByName ?? 'CRM user'}`,
            doc.page.width / 2,
            78,
            { width: width / 2, align: 'right' },
          );
          doc.text(`Date range: ${data.meta.label}`, doc.page.width / 2, 92, {
            width: width / 2,
            align: 'right',
          });
        }

        const statColumns = [
          ['Total', data.summary.totalLeads],
          ['New', data.summary.newLeads],
          ['Interested', data.summary.interestedLeads],
          ['Not Interested', data.summary.notInterestedLeads],
          ['Follow-up', data.summary.followUps],
          ['Visit Done', data.summary.siteVisitDone],
          ['Booking Done', data.summary.bookingDone],
          ['Booking Rate', `${data.summary.leadBookingDoneRate}%`],
        ];
        const statsY = reportContext ? 110 : 88;
        let x = 28;
        const statWidth = width / statColumns.length;
        statColumns.forEach(([label, value]) => {
          doc
            .rect(x, statsY, statWidth - 6, 52)
            .fillAndStroke('#f8fafc', border);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(muted)
            .text(String(label), x + 8, statsY + 11, {
              width: statWidth - 22,
            });
          doc
            .font('Helvetica-Bold')
            .fontSize(15)
            .fillColor(navy)
            .text(String(value), x + 8, statsY + 28, {
              width: statWidth - 22,
            });
          x += statWidth;
        });

        const firstHeader =
          scope === 'team'
            ? 'Team'
            : scope === 'project'
            ? 'Project'
            : scope === 'source'
            ? 'Source'
            : 'Employee';
        const headers = [
          firstHeader,
          'Total',
          'New',
          'Interested',
          'Not Int.',
          'Follow-up',
          'Visit Sch.',
          'Visit Done',
          'Re-Visit',
          'Booking',
          'Lost',
          'Rate %',
        ];
        const columnWidths = [150, 50, 42, 58, 54, 58, 58, 58, 54, 52, 42, 44];
        let y = reportContext ? 187 : 165;
        x = 28;
        headers.forEach((header, index) => {
          doc.rect(x, y, columnWidths[index], 24).fillAndStroke(navy, border);
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#ffffff')
            .text(header, x + 4, y + 8, {
              width: columnWidths[index] - 8,
              align: index === 0 ? 'left' : 'center',
            });
          x += columnWidths[index];
        });
        y += 24;

        rows.slice(0, 18).forEach((row: any, rowIndex: number) => {
          x = 28;
          const values = [
            row.name,
            row.totalLeads,
            row.newLeads,
            row.interestedLeads,
            row.notInterestedLeads,
            row.followUps,
            row.siteVisitScheduled,
            row.siteVisitDone,
            row.reVisitDone,
            row.bookingDone,
            row.lostLeads,
            `${row.leadBookingDoneRate}%`,
          ];
          values.forEach((value, index) => {
            doc
              .rect(x, y, columnWidths[index], 24)
              .fillAndStroke(
                rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                border,
              );
            doc
              .font('Helvetica')
              .fontSize(7)
              .fillColor(navy)
              .text(String(value ?? '-'), x + 4, y + 8, {
                width: columnWidths[index] - 8,
                align: index === 0 ? 'left' : 'center',
                ellipsis: true,
              });
            x += columnWidths[index];
          });
          y += 24;
        });

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(
            'Lead counts use created leads in range. Follow-ups, visits, and bookings use their scheduled or booking dates in range.',
            28,
            doc.page.height - 42,
            { width },
          );
        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    return { filename, pdfBuffer };
  }

  private activityMetadata(activity: any) {
    return activity &&
      typeof activity.metadata === 'object' &&
      activity.metadata
      ? activity.metadata
      : {};
  }

  private buildStatusScoreMap(statusMasters: any[]) {
    const statusScoreByValue = new Map<string, any>();
    statusMasters.forEach((status: any) => {
      [status.id, status.code, status.name]
        .filter(Boolean)
        .forEach((value) => statusScoreByValue.set(String(value), status));
    });
    return statusScoreByValue;
  }

  private buildSourcePointsMap(sourceMasters: any[]) {
    const sourcePointsByValue = new Map<string, boolean>();
    sourceMasters.forEach((source: any) => {
      [source.id, source.code, source.name]
        .filter(Boolean)
        .forEach((value) =>
          sourcePointsByValue.set(
            String(value),
            source.pointsEnabled !== false,
          ),
        );
    });
    return sourcePointsByValue;
  }

  private getStatusScoreEarned(
    activity: any,
    statusScoreByValue: Map<string, any>,
  ) {
    const metadata = this.activityMetadata(activity);
    if (activity.type === 'AUTO_ASSIGNMENT_MISSED') {
      return 0;
    }
    if (activity.type !== 'LEAD_UPDATED' && activity.type !== 'LEAD_CREATED') {
      return 0;
    }
    if (metadata.sourcePointsEnabled === false) return 0;
    if (metadata.statusScoreEarned !== undefined) {
      const explicitScore = Number(metadata.statusScoreEarned);
      return Number.isFinite(explicitScore) && explicitScore > 0
        ? explicitScore
        : 0;
    }

    const fields = Array.isArray(metadata.fields) ? metadata.fields : [];
    if (!fields.includes('status')) return 0;
    const status =
      statusScoreByValue.get(String(metadata.statusId ?? '')) ??
      statusScoreByValue.get(String(metadata.statusName ?? '')) ??
      statusScoreByValue.get(String(activity.lead?.statusId ?? ''));
    return Number(status?.manualScore ?? 0) || 0;
  }

  private recoverInitialStatusScoreActivities(
    leads: any[],
    statusScoreByValue: Map<string, any>,
    sourcePointsByValue: Map<string, boolean>,
  ) {
    return leads.flatMap((lead: any) => {
      const status = statusScoreByValue.get(String(lead.statusId ?? ''));
      const points = Number(status?.manualScore ?? 0) || 0;
      if (points <= 0) return [];
      const currentStatusValues = new Set(
        [status.id, status.code, status.name]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase()),
      );

      const leadActivities = Array.isArray(lead.activities)
        ? lead.activities
        : [];
      const hasScoredCurrentStatusEvent = leadActivities.some(
        (activity: any) => {
          const metadata = this.activityMetadata(activity);
          const fields = Array.isArray(metadata.fields) ? metadata.fields : [];
          const isStatusEvent =
            metadata.statusScoreEarned !== undefined ||
            (activity.type === 'LEAD_UPDATED' && fields.includes('status'));
          if (!isStatusEvent) return false;

          const activityStatusValues = [metadata.statusId, metadata.statusName]
            .filter(Boolean)
            .map(String);
          const matchesCurrentStatus = activityStatusValues.length
            ? activityStatusValues.some(
                (value) =>
                  currentStatusValues.has(value.toLowerCase()) ||
                  statusScoreByValue.get(value)?.id === status.id,
              )
            : activity.type === 'LEAD_UPDATED' && fields.includes('status');
          if (!matchesCurrentStatus) return false;
          if (metadata.sourcePointsEnabled === false) return true;

          return (
            this.getStatusScoreEarned(
              { ...activity, lead },
              statusScoreByValue,
            ) > 0
          );
        },
      );
      if (hasScoredCurrentStatusEvent) return [];

      const sourceId = String(lead.sourceId ?? '');
      const sourcePointsEnabled = sourceId
        ? sourcePointsByValue.get(sourceId) !== false
        : true;

      return [
        {
          id: `recovered-created-status-${lead.id}`,
          leadId: lead.id,
          actorId: lead.createdById ?? null,
          type: 'LEAD_CREATED',
          title: 'Lead created with status',
          description: `Lead was created with ${status.name} status`,
          occurredAt: lead.createdAt,
          metadata: {
            fields: ['status'],
            statusId: status.id,
            statusName: status.name,
            statusScoreEarned: sourcePointsEnabled ? points : 0,
            sourcePointsEnabled,
          },
          lead,
        },
      ];
    });
  }

  private async loadStatusScoreContext(
    db: any,
    userIds: string[],
    start: Date,
    end: Date,
  ) {
    const [statusMasters, sourceMasters, initialStatusLeadCandidates] =
      await Promise.all([
        db.leadMasterValue.findMany({
          where: { isActive: true, categoryRef: { code: 'status' } },
          select: { id: true, name: true, code: true, manualScore: true },
        }),
        db.leadMasterValue.findMany({
          where: { isActive: true, categoryRef: { code: 'source' } },
          select: { id: true, name: true, code: true, pointsEnabled: true },
        }),
        userIds.length
          ? db.lead.findMany({
              where: this.tenantLeadWhere({
                deletedAt: null,
                statusId: { not: null },
                createdAt: { gte: start, lte: end },
                OR: [
                  { telecallerId: { in: userIds } },
                  { fieldExecutiveId: { in: userIds } },
                  { ownerId: { in: userIds } },
                ],
              }),
              select: {
                id: true,
                statusId: true,
                sourceId: true,
                ownerId: true,
                telecallerId: true,
                fieldExecutiveId: true,
                createdById: true,
                createdAt: true,
                activities: {
                  where: { type: { in: ['LEAD_CREATED', 'LEAD_UPDATED'] } },
                  select: { type: true, metadata: true },
                },
              },
            })
          : Promise.resolve([]),
      ]);
    const statusScoreByValue = this.buildStatusScoreMap(statusMasters);
    const sourcePointsByValue = this.buildSourcePointsMap(sourceMasters);

    return {
      statusScoreByValue,
      initialStatusScoreActivities: this.recoverInitialStatusScoreActivities(
        initialStatusLeadCandidates,
        statusScoreByValue,
        sourcePointsByValue,
      ),
    };
  }

  private getStatusScoreRecipients(
    activity: any,
    statusScoreByValue: Map<string, any>,
  ) {
    const metadata = this.activityMetadata(activity);
    const explicitRecipients = Array.isArray(metadata.statusScoreRecipients)
      ? metadata.statusScoreRecipients
      : [];
    if (explicitRecipients.length) {
      return explicitRecipients
        .map((recipient: any) => ({
          userId: recipient?.userId ? String(recipient.userId) : '',
          roleType: recipient?.roleType ? String(recipient.roleType) : null,
          points: Number(recipient?.points ?? 0) || 0,
        }))
        .filter((recipient: any) => recipient.userId && recipient.points > 0);
    }

    const points = this.getStatusScoreEarned(activity, statusScoreByValue);
    if (points <= 0) return [];
    const assignedRecipients = [
      activity.lead?.telecallerId
        ? { userId: String(activity.lead.telecallerId), roleType: 'PRE_SALES' }
        : null,
      activity.lead?.fieldExecutiveId
        ? {
            userId: String(activity.lead.fieldExecutiveId),
            roleType: 'SALES',
          }
        : null,
    ]
      .filter(Boolean)
      .filter(
        (recipient: any, index: number, list: any[]) =>
          list.findIndex((item: any) => item.userId === recipient.userId) ===
          index,
      );
    if (assignedRecipients.length) {
      const recipientPoints = points / assignedRecipients.length;
      return assignedRecipients.map((recipient: any) => ({
        ...recipient,
        points: recipientPoints,
      }));
    }
    if (activity.lead?.ownerId) {
      return [
        { userId: String(activity.lead.ownerId), roleType: 'OWNER', points },
      ];
    }
    return [];
  }

  private getStatusScoreName(
    activity: any,
    statusScoreByValue: Map<string, any>,
  ) {
    const metadata = this.activityMetadata(activity);
    if (metadata.statusName) return String(metadata.statusName);
    if (activity.type === 'AUTO_ASSIGNMENT_MISSED')
      return 'Missed auto handoff';
    const status =
      statusScoreByValue.get(String(metadata.statusId ?? '')) ??
      statusScoreByValue.get(String(activity.lead?.statusId ?? ''));
    return status?.name ? String(status.name) : null;
  }

  private addCount(
    map: Map<string, any>,
    userId: string | null | undefined,
    key: string,
    amount = 1,
  ) {
    if (!userId || !map.has(userId)) return;
    const row = map.get(userId);
    row[key] = (row[key] ?? 0) + amount;
  }

  private touchLatest(
    map: Map<string, any>,
    userId: string | null | undefined,
    value: Date | string | null | undefined,
  ) {
    if (!userId || !value || !map.has(userId)) return;
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;
    const row = map.get(userId);
    if (!row.latestActivityAt || next > new Date(row.latestActivityAt)) {
      row.latestActivityAt = next.toISOString();
    }
  }

  async getDashboardRankings(
    query: Query = {},
    actor?: { sub?: string; role?: string },
  ) {
    const db = this.prisma as any;
    const { range, start, end, label } = this.resolveRankingWindow(query);
    const selectedUserId = String(query.userId ?? 'all');
    const selectedTeamId = String(query.teamId ?? 'all');
    const requestedMode = ['users', 'teams', 'both'].includes(
      String(query.mode ?? 'both'),
    )
      ? String(query.mode ?? 'both')
      : 'both';
    const actorId = actor?.sub;
    const actorIsAdmin = this.isAdminRankingRole(actor?.role);
    const mode = actorIsAdmin ? requestedMode : 'users';
    const actorUser = actorId
      ? await db.user.findFirst({
          where: this.tenantUserWhere({ id: actorId }),
          select: {
            id: true,
            role: true,
            employeeProfile: {
              select: {
                teamId: true,
                team: { select: { id: true, name: true, leaderId: true } },
              },
            },
            rankingTeamAccesses: {
              where: { team: { organizationId: this.organizationId } },
              select: {
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        })
      : null;
    const actorTeamId = actorUser?.employeeProfile?.teamId ?? null;
    const configuredRankingTeamIds = Array.from(
      new Set(
        (actorUser?.rankingTeamAccesses ?? [])
          .map((access: any) => String(access.teamId))
          .filter(Boolean),
      ),
    );
    const rankingScopeTeamIds = actorIsAdmin
      ? []
      : configuredRankingTeamIds.length
      ? configuredRankingTeamIds
      : actorTeamId
      ? [actorTeamId]
      : [];
    const rankingScopeTeamNames = actorIsAdmin
      ? []
      : rankingScopeTeamIds.map((teamId: string) => {
          const access = (actorUser?.rankingTeamAccesses ?? []).find(
            (item: any) => item.teamId === teamId,
          );
          return (
            access?.team?.name ??
            (actorUser?.employeeProfile?.teamId === teamId
              ? actorUser.employeeProfile?.team?.name
              : null) ??
            'Unassigned'
          );
        });
    const rankingScopeLabel = actorIsAdmin
      ? 'All teams'
      : rankingScopeTeamNames.length
      ? rankingScopeTeamNames.join(', ')
      : 'Own profile only';
    const actorPeerRole =
      actor?.role === 'TELECALLER'
        ? 'TELECALLER'
        : actor?.role === 'SALES_AGENT' || actor?.role === 'FIELD_EXECUTIVE'
        ? 'SALES_AGENT'
        : null;

    const userWhere: any = this.tenantUserWhere({
      isActive: true,
      role: { in: rankingRoles },
    });

    if (actorIsAdmin) {
      if (selectedUserId !== 'all') userWhere.id = selectedUserId;
      if (selectedTeamId !== 'all') {
        userWhere.employeeProfile =
          selectedTeamId === 'unassigned'
            ? { is: null }
            : { is: { teamId: selectedTeamId } };
      }
    } else if (actorPeerRole) {
      userWhere.role = actorPeerRole;
      if (rankingScopeTeamIds.length) {
        userWhere.employeeProfile = {
          is: { teamId: { in: rankingScopeTeamIds } },
        };
      } else if (actorId) {
        userWhere.id = actorId;
      } else {
        userWhere.id = '__no_actor__';
      }
    } else if (actorId) {
      userWhere.id = actorId;
    } else {
      userWhere.id = '__no_actor__';
    }

    const users = await db.user.findMany({
      where: userWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarStorageKey: true,
        employeeProfile: {
          select: {
            designation: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                leaderId: true,
                leader: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const userIds = users.map((user: any) => user.id);
    const [statusScoreContext, activities, availableUsers, availableTeams] =
      await Promise.all([
        this.loadStatusScoreContext(db, userIds, start, end),
        userIds.length
          ? db.activity.findMany({
              where: this.tenantActivityWhere({
                type: {
                  in: [
                    'LEAD_CREATED',
                    'LEAD_UPDATED',
                    'AUTO_ASSIGNMENT_MISSED',
                  ],
                },
                occurredAt: { gte: start, lte: end },
              }),
              include: {
                lead: {
                  select: {
                    id: true,
                    statusId: true,
                    telecallerId: true,
                    fieldExecutiveId: true,
                    ownerId: true,
                  },
                },
              },
              orderBy: { occurredAt: 'desc' },
            })
          : Promise.resolve([]),
        db.user.findMany({
          where: actorIsAdmin
            ? this.tenantUserWhere({
                isActive: true,
                role: { in: rankingRoles },
              })
            : actorPeerRole
            ? this.tenantUserWhere({
                isActive: true,
                role: actorPeerRole,
                ...(rankingScopeTeamIds.length
                  ? {
                      employeeProfile: {
                        is: { teamId: { in: rankingScopeTeamIds } },
                      },
                    }
                  : actorId
                  ? { id: actorId }
                  : { id: '__no_actor__' }),
              })
            : actorId
            ? this.tenantUserWhere({ id: actorId })
            : this.tenantUserWhere({ id: '__no_actor__' }),
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            employeeProfile: {
              select: {
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { fullName: 'asc' },
        }),
        db.team.findMany({
          where: actorIsAdmin
            ? this.tenantTeamWhere({ isActive: true })
            : rankingScopeTeamIds.length
            ? this.tenantTeamWhere({
                id: { in: rankingScopeTeamIds },
                isActive: true,
              })
            : this.tenantTeamWhere({ id: '__no_team__' }),
          select: { id: true, name: true, leaderId: true },
          orderBy: { name: 'asc' },
        }),
      ]);

    const { statusScoreByValue, initialStatusScoreActivities } =
      statusScoreContext;
    const scoredActivities = [...activities, ...initialStatusScoreActivities];
    const userRows = new Map<string, any>(
      users.map((user: any) => [
        user.id,
        {
          rank: 0,
          userId: user.id,
          name: user.fullName ?? user.email,
          email: user.email,
          role: user.role,
          designation: user.employeeProfile?.designation ?? null,
          image: user.avatarStorageKey ?? null,
          teamId: user.employeeProfile?.teamId ?? null,
          teamName: user.employeeProfile?.team?.name ?? 'Unassigned',
          points: 0,
          statusBreakdown: new Map<string, any>(),
          lastScoredActivityAt: null,
        },
      ]),
    );

    scoredActivities.forEach((activity: any) => {
      const recipients = this.getStatusScoreRecipients(
        activity,
        statusScoreByValue,
      ).filter((recipient: any) => userRows.has(recipient.userId));
      if (!recipients.length) return;
      const statusName =
        this.getStatusScoreName(activity, statusScoreByValue) ??
        'Status update';
      const statusId = String(
        this.activityMetadata(activity).statusId ??
          this.activityMetadata(activity).type ??
          activity.lead?.statusId ??
          statusName,
      );
      recipients.forEach((recipient: any) => {
        const row = userRows.get(recipient.userId);
        row.points += recipient.points;
        const current = row.statusBreakdown.get(statusId) ?? {
          statusId,
          statusName,
          points: 0,
          count: 0,
        };
        current.points += recipient.points;
        current.count += 1;
        row.statusBreakdown.set(statusId, current);
        if (
          !row.lastScoredActivityAt ||
          new Date(activity.occurredAt) > new Date(row.lastScoredActivityAt)
        ) {
          row.lastScoredActivityAt = new Date(
            activity.occurredAt,
          ).toISOString();
        }
      });
    });

    const userRankings = [...userRows.values()]
      .map((row: any) => ({
        ...row,
        statusBreakdown: [...row.statusBreakdown.values()].sort(
          (left: any, right: any) => right.points - left.points,
        ),
      }))
      .sort((left: any, right: any) => {
        if (right.points !== left.points) return right.points - left.points;
        const rightDate = right.lastScoredActivityAt
          ? new Date(right.lastScoredActivityAt).getTime()
          : 0;
        const leftDate = left.lastScoredActivityAt
          ? new Date(left.lastScoredActivityAt).getTime()
          : 0;
        if (rightDate !== leftDate) return rightDate - leftDate;
        return String(left.name).localeCompare(String(right.name));
      })
      .map((row: any, index: number) => ({ ...row, rank: index + 1 }));

    const teamRows = new Map<string, any>();
    userRankings.forEach((user: any) => {
      const teamId = user.teamId ?? 'unassigned';
      const teamName = user.teamName ?? 'Unassigned';
      if (!teamRows.has(teamId)) {
        const team = availableTeams.find((item: any) => item.id === teamId);
        teamRows.set(teamId, {
          rank: 0,
          teamId,
          teamName,
          leaderName:
            users.find((item: any) => item.id === team?.leaderId)?.fullName ??
            users.find((item: any) => item.id === team?.leaderId)?.email ??
            'Unassigned',
          memberCount: 0,
          points: 0,
          statusBreakdown: new Map<string, any>(),
          lastScoredActivityAt: null,
        });
      }
      const teamRow = teamRows.get(teamId);
      teamRow.memberCount += 1;
      teamRow.points += user.points;
      if (
        user.lastScoredActivityAt &&
        (!teamRow.lastScoredActivityAt ||
          new Date(user.lastScoredActivityAt) >
            new Date(teamRow.lastScoredActivityAt))
      ) {
        teamRow.lastScoredActivityAt = user.lastScoredActivityAt;
      }
      user.statusBreakdown.forEach((item: any) => {
        const current = teamRow.statusBreakdown.get(item.statusId) ?? {
          statusId: item.statusId,
          statusName: item.statusName,
          points: 0,
          count: 0,
        };
        current.points += item.points;
        current.count += item.count;
        teamRow.statusBreakdown.set(item.statusId, current);
      });
    });

    const teamRankings = [...teamRows.values()]
      .map((row: any) => ({
        ...row,
        statusBreakdown: [...row.statusBreakdown.values()].sort(
          (left: any, right: any) => right.points - left.points,
        ),
      }))
      .sort((left: any, right: any) => {
        if (right.points !== left.points) return right.points - left.points;
        return String(left.teamName).localeCompare(String(right.teamName));
      })
      .map((row: any, index: number) => ({ ...row, rank: index + 1 }));

    const currentUser =
      userRankings.find((row: any) => row.userId === actorId) ?? null;
    const currentTeamId = actorTeamId ?? 'unassigned';
    const currentTeam =
      teamRankings.find((row: any) => row.teamId === currentTeamId) ?? null;

    const visibleTeams = availableTeams.map((team: any) => ({
      id: team.id,
      name: team.name,
    }));
    const hasUnassigned = availableUsers.some(
      (user: any) => !user.employeeProfile?.teamId,
    );
    if (actorIsAdmin && hasUnassigned) {
      visibleTeams.push({ id: 'unassigned', name: 'Unassigned' });
    }

    return {
      meta: {
        range,
        mode,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        label,
        scopedToTeam: !actorIsAdmin && rankingScopeTeamIds.length > 0,
        peerRole: actorPeerRole,
        rankingScopeTeamIds,
        rankingScopeTeamNames,
        rankingScopeLabel,
      },
      summary: {
        currentUserRank: currentUser?.rank ?? null,
        currentTeamRank: currentTeam?.rank ?? null,
        currentUserPoints: currentUser?.points ?? 0,
        currentTeamPoints: currentTeam?.points ?? 0,
        topUser: userRankings[0] ?? null,
        topTeam: teamRankings[0] ?? null,
        totalScore: userRankings.reduce(
          (sum: number, row: any) => sum + row.points,
          0,
        ),
      },
      userRankings: mode === 'teams' ? [] : userRankings,
      teamRankings: mode === 'users' ? [] : teamRankings,
      filters: {
        canViewAll: actorIsAdmin,
        users: availableUsers.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.email,
          role: user.role,
          teamId: user.employeeProfile?.teamId ?? null,
        })),
        teams: visibleTeams,
      },
    };
  }

  async getAdminPerformanceData(query: Query = {}) {
    const db = this.prisma as any;
    const now = new Date();
    const defaultStart = this.startOfDay(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    const start = this.parseDateFilter(query.dateFrom, defaultStart);
    const end = this.parseDateFilter(query.dateTo, this.endOfDay(now), true);
    const page = this.numberQuery(query.page, 1);
    const limit = Math.min(this.numberQuery(query.limit, 20), 100);
    const selectedRole = this.normalizeTenantRoleFilter(query.role);
    const selectedUserId = String(query.userId ?? 'all');
    const selectedTeamId = String(query.teamId ?? 'all');
    const selectedActivityType = String(query.activityType ?? 'all');
    const search = String(query.search ?? '')
      .trim()
      .toLowerCase();
    const operationalRoles = [
      Role.ADMIN,
      Role.HR,
      Role.SALES_MANAGER,
      Role.TELECALLER,
      Role.SALES_AGENT,
      Role.MARKETING,
    ];

    const users = await db.user.findMany({
      where: this.tenantUserWhere({
        role:
          selectedRole && selectedRole !== 'all'
            ? selectedRole
            : { in: operationalRoles },
        ...(selectedUserId && selectedUserId !== 'all'
          ? { id: selectedUserId }
          : {}),
        ...(selectedTeamId && selectedTeamId !== 'all'
          ? { employeeProfile: { teamId: selectedTeamId } }
          : {}),
      }),
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        avatarStorageKey: true,
        employeeProfile: {
          select: {
            designation: true,
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const userIds = users.map((user: any) => user.id);
    const userMap = new Map<string, any>(
      users.map((user: any) => [user.id, user]),
    );
    const rows = new Map<string, any>(
      users.map((user: any) => [
        user.id,
        {
          id: user.id,
          name: user.fullName ?? user.email,
          email: user.email,
          role: user.role,
          designation: user.employeeProfile?.designation ?? null,
          teamId: user.employeeProfile?.teamId ?? null,
          teamName: user.employeeProfile?.team?.name ?? 'Unassigned',
          image: user.avatarStorageKey ?? null,
          isActive: user.isActive,
          leadsAssigned: 0,
          leadsCreated: 0,
          calls: 0,
          connectedCalls: 0,
          followUpsCreated: 0,
          followUpsCompleted: 0,
          overdueFollowUps: 0,
          remarksAdded: 0,
          scoreEarned: 0,
          scoreBreakdown: new Map<string, any>(),
          siteVisitsScheduled: 0,
          siteVisitsCompleted: 0,
          tasksCompleted: 0,
          bookingsDone: 0,
          latestActivityAt: null,
        },
      ]),
    );

    const dateBetween = { gte: start, lte: end };
    const [
      leadsCreated,
      leadAssignments,
      callLogs,
      followUps,
      followUpActivities,
      notes,
      siteVisits,
      tasksCompleted,
      bookings,
      activities,
      statusScoreContext,
      teams,
    ] = await Promise.all([
      db.lead.findMany({
        where: this.tenantLeadWhere({
          createdAt: dateBetween,
          createdById: { in: userIds },
        }),
        select: {
          id: true,
          name: true,
          displayId: true,
          createdById: true,
          createdAt: true,
        },
      }),
      db.leadAssignment.findMany({
        where: {
          assignedAt: dateBetween,
          toUserId: { in: userIds },
          lead: { organizationId: this.organizationId },
        },
        select: {
          id: true,
          toUserId: true,
          assignedAt: true,
          assigneeType: true,
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.callLog.findMany({
        where: { startedAt: dateBetween, userId: { in: userIds } },
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.followUp.findMany({
        where: this.tenantFollowUpWhere({
          OR: [
            { createdAt: dateBetween },
            { completedAt: dateBetween },
            { scheduledAt: { lte: end } },
          ],
          assignedToId: { in: userIds },
        }),
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.activity.findMany({
        where: this.tenantActivityWhere({
          occurredAt: dateBetween,
          actorId: { in: userIds },
          type: {
            in: [
              'FOLLOW_UP_CREATED',
              'FOLLOW_UP_UPDATED',
              'FOLLOW_UP_COMPLETED',
              'FOLLOW_UP_REASSIGNED',
            ],
          },
        }),
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.note.findMany({
        where: {
          createdAt: dateBetween,
          authorId: { in: userIds },
          lead: { organizationId: this.organizationId },
        },
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.siteVisit.findMany({
        where: this.tenantSiteVisitWhere({
          OR: [{ scheduledAt: dateBetween }, { updatedAt: dateBetween }],
          assignedExecutiveId: { in: userIds },
        }),
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.task.findMany({
        where: { completedAt: dateBetween, assignedToId: { in: userIds } },
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.booking.findMany({
        where: this.tenantBookingWhere({
          bookingDate: dateBetween,
          closedById: { in: userIds },
        }),
        include: {
          lead: { select: { id: true, name: true, displayId: true } },
        },
      }),
      db.activity.findMany({
        where: this.tenantActivityWhere({
          occurredAt: dateBetween,
          OR: [
            { actorId: { in: userIds } },
            { type: { in: ['LEAD_CREATED', 'LEAD_UPDATED'] } },
          ],
        }),
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              displayId: true,
              statusId: true,
              telecallerId: true,
              fieldExecutiveId: true,
              ownerId: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
      }),
      this.loadStatusScoreContext(db, userIds, start, end),
      db.team.findMany({
        where: this.tenantTeamWhere({ isActive: true }),
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const { statusScoreByValue, initialStatusScoreActivities } =
      statusScoreContext;
    const scoredActivities = [...activities, ...initialStatusScoreActivities];

    leadsCreated.forEach((lead: any) => {
      this.addCount(rows, lead.createdById, 'leadsCreated');
      this.touchLatest(rows, lead.createdById, lead.createdAt);
    });
    leadAssignments.forEach((assignment: any) => {
      this.addCount(rows, assignment.toUserId, 'leadsAssigned');
      this.touchLatest(rows, assignment.toUserId, assignment.assignedAt);
    });
    callLogs.forEach((log: any) => {
      this.addCount(rows, log.userId, 'calls');
      if (
        String(log.outcome ?? '')
          .toLowerCase()
          .includes('connected')
      ) {
        this.addCount(rows, log.userId, 'connectedCalls');
      }
      this.touchLatest(rows, log.userId, log.startedAt);
    });
    followUpActivities.forEach((activity: any) => {
      if (activity.type === 'FOLLOW_UP_CREATED')
        this.addCount(rows, activity.actorId, 'followUpsCreated');
      this.touchLatest(rows, activity.actorId, activity.occurredAt);
    });
    followUps.forEach((followUp: any) => {
      if (
        followUp.completedAt &&
        new Date(followUp.completedAt) >= start &&
        new Date(followUp.completedAt) <= end
      ) {
        this.addCount(rows, followUp.assignedToId, 'followUpsCompleted');
        this.touchLatest(rows, followUp.assignedToId, followUp.completedAt);
      }
      if (
        !followUp.completedAt &&
        new Date(followUp.scheduledAt) < this.startOfDay(now)
      ) {
        this.addCount(rows, followUp.assignedToId, 'overdueFollowUps');
      }
    });
    notes.forEach((note: any) => {
      this.addCount(rows, note.authorId, 'remarksAdded');
      this.touchLatest(rows, note.authorId, note.createdAt);
    });
    siteVisits.forEach((visit: any) => {
      if (
        new Date(visit.scheduledAt) >= start &&
        new Date(visit.scheduledAt) <= end
      ) {
        this.addCount(rows, visit.assignedExecutiveId, 'siteVisitsScheduled');
      }
      if (visit.status === 'Completed' || visit.checkedOutAt) {
        this.addCount(rows, visit.assignedExecutiveId, 'siteVisitsCompleted');
      }
      this.touchLatest(
        rows,
        visit.assignedExecutiveId,
        visit.updatedAt ?? visit.scheduledAt,
      );
    });
    tasksCompleted.forEach((task: any) => {
      this.addCount(rows, task.assignedToId, 'tasksCompleted');
      this.touchLatest(rows, task.assignedToId, task.completedAt);
    });
    bookings.forEach((booking: any) => {
      this.addCount(rows, booking.closedById, 'bookingsDone');
      this.touchLatest(rows, booking.closedById, booking.bookingDate);
    });
    scoredActivities.forEach((activity: any) => {
      const recipients = this.getStatusScoreRecipients(
        activity,
        statusScoreByValue,
      ).filter((recipient: any) => rows.has(recipient.userId));
      if (!recipients.length) return;
      const statusName =
        this.getStatusScoreName(activity, statusScoreByValue) ??
        'Status update';
      const statusId = String(
        this.activityMetadata(activity).statusId ??
          activity.lead?.statusId ??
          statusName,
      );
      recipients.forEach((recipient: any) => {
        this.addCount(rows, recipient.userId, 'scoreEarned', recipient.points);
        const row = rows.get(recipient.userId);
        if (!row) return;
        const current = row.scoreBreakdown.get(statusId) ?? {
          statusId,
          statusName,
          points: 0,
          count: 0,
        };
        current.points += recipient.points;
        current.count += 1;
        row.scoreBreakdown.set(statusId, current);
        this.touchLatest(rows, recipient.userId, activity.occurredAt);
      });
    });

    const eventRows = [
      ...activities.map((activity: any) => ({
        statusScoreEarned: this.getStatusScoreEarned(
          activity,
          statusScoreByValue,
        ),
        statusScoreName: this.getStatusScoreName(activity, statusScoreByValue),
        id: `activity-${activity.id}`,
        actorId: activity.actorId,
        actorName:
          userMap.get(activity.actorId)?.fullName ??
          userMap.get(activity.actorId)?.email ??
          'Unknown user',
        actorRole: userMap.get(activity.actorId)?.role ?? 'User',
        actorImage: userMap.get(activity.actorId)?.avatarStorageKey ?? null,
        type: activity.type,
        title: activity.title,
        description:
          this.getStatusScoreEarned(activity, statusScoreByValue) > 0
            ? `${
                activity.description ?? activity.title
              } Status score earned: ${this.getStatusScoreEarned(
                activity,
                statusScoreByValue,
              )}${
                this.getStatusScoreName(activity, statusScoreByValue)
                  ? ` (${this.getStatusScoreName(
                      activity,
                      statusScoreByValue,
                    )})`
                  : ''
              }.`
            : activity.description ?? activity.title,
        leadId: activity.leadId,
        leadName: activity.lead?.name ?? null,
        leadDisplayId: activity.lead?.displayId ?? null,
        occurredAt: activity.occurredAt,
      })),
      ...callLogs.map((log: any) => ({
        id: `call-${log.id}`,
        actorId: log.userId,
        actorName:
          userMap.get(log.userId)?.fullName ??
          userMap.get(log.userId)?.email ??
          'Unknown user',
        actorRole: userMap.get(log.userId)?.role ?? 'User',
        actorImage: userMap.get(log.userId)?.avatarStorageKey ?? null,
        type: 'CALL_LOG',
        title: `${log.direction ?? 'Call'} call${
          log.outcome ? ` - ${log.outcome}` : ''
        }`,
        description:
          log.notes ?? log.customerResponse ?? 'Call activity recorded',
        leadId: log.leadId,
        leadName: log.lead?.name ?? null,
        leadDisplayId: log.lead?.displayId ?? null,
        occurredAt: log.startedAt,
      })),
      ...notes.map((note: any) => ({
        id: `note-${note.id}`,
        actorId: note.authorId,
        actorName:
          userMap.get(note.authorId)?.fullName ??
          userMap.get(note.authorId)?.email ??
          'Unknown user',
        actorRole: userMap.get(note.authorId)?.role ?? 'User',
        actorImage: userMap.get(note.authorId)?.avatarStorageKey ?? null,
        type: 'REMARK_ADDED',
        title: 'Remark added',
        description: note.text,
        leadId: note.leadId,
        leadName: note.lead?.name ?? null,
        leadDisplayId: note.lead?.displayId ?? null,
        occurredAt: note.createdAt,
      })),
      ...siteVisits.map((visit: any) => ({
        id: `visit-${visit.id}`,
        actorId: visit.assignedExecutiveId,
        actorName:
          userMap.get(visit.assignedExecutiveId)?.fullName ??
          userMap.get(visit.assignedExecutiveId)?.email ??
          'Unknown user',
        actorRole: userMap.get(visit.assignedExecutiveId)?.role ?? 'User',
        actorImage:
          userMap.get(visit.assignedExecutiveId)?.avatarStorageKey ?? null,
        type:
          visit.status === 'Completed' || visit.checkedOutAt
            ? 'SITE_VISIT_COMPLETED'
            : 'SITE_VISIT_SCHEDULED',
        title:
          visit.status === 'Completed' || visit.checkedOutAt
            ? 'Site visit completed'
            : 'Site visit scheduled',
        description: visit.feedback ?? visit.notes ?? 'Site visit activity',
        leadId: visit.leadId,
        leadName: visit.lead?.name ?? null,
        leadDisplayId: visit.lead?.displayId ?? null,
        occurredAt: visit.checkedOutAt ?? visit.updatedAt ?? visit.scheduledAt,
      })),
      ...tasksCompleted.map((task: any) => ({
        id: `task-${task.id}`,
        actorId: task.assignedToId,
        actorName:
          userMap.get(task.assignedToId)?.fullName ??
          userMap.get(task.assignedToId)?.email ??
          'Unknown user',
        actorRole: userMap.get(task.assignedToId)?.role ?? 'User',
        actorImage: userMap.get(task.assignedToId)?.avatarStorageKey ?? null,
        type: 'TASK_COMPLETED',
        title: `Task completed: ${task.title}`,
        description: task.description ?? 'Task marked completed',
        leadId: task.leadId,
        leadName: task.lead?.name ?? null,
        leadDisplayId: task.lead?.displayId ?? null,
        occurredAt: task.completedAt,
      })),
      ...bookings.map((booking: any) => ({
        id: `booking-${booking.id}`,
        actorId: booking.closedById,
        actorName:
          userMap.get(booking.closedById)?.fullName ??
          userMap.get(booking.closedById)?.email ??
          'Unknown user',
        actorRole: userMap.get(booking.closedById)?.role ?? 'User',
        actorImage: userMap.get(booking.closedById)?.avatarStorageKey ?? null,
        type: 'BOOKING_DONE',
        title: 'Booking done',
        description: `Booking amount ${booking.bookingAmount}`,
        leadId: booking.leadId,
        leadName: booking.lead?.name ?? null,
        leadDisplayId: booking.lead?.displayId ?? null,
        occurredAt: booking.bookingDate,
      })),
    ]
      .filter((event: any) => event.actorId && userMap.has(event.actorId))
      .filter(
        (event: any) =>
          selectedActivityType === 'all' || event.type === selectedActivityType,
      )
      .filter((event: any) => {
        if (!search) return true;
        return [
          event.actorName,
          event.actorRole,
          event.title,
          event.description,
          event.leadName,
          event.leadDisplayId,
        ]
          .filter(Boolean)
          .some((value: any) => String(value).toLowerCase().includes(search));
      })
      .sort(
        (left: any, right: any) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      );

    const scoreRankByUserId = new Map(
      [...rows.values()]
        .sort((left: any, right: any) => {
          if (right.scoreEarned !== left.scoreEarned) {
            return right.scoreEarned - left.scoreEarned;
          }
          const rightDate = right.latestActivityAt
            ? new Date(right.latestActivityAt).getTime()
            : 0;
          const leftDate = left.latestActivityAt
            ? new Date(left.latestActivityAt).getTime()
            : 0;
          if (rightDate !== leftDate) return rightDate - leftDate;
          return String(left.name).localeCompare(String(right.name));
        })
        .map((row: any, index: number) => [row.id, index + 1]),
    );

    const userRows = [...rows.values()]
      .filter((row: any) => {
        if (!search) return true;
        return [row.name, row.email, row.role, row.teamName, row.designation]
          .filter(Boolean)
          .some((value: any) => String(value).toLowerCase().includes(search));
      })
      .sort((left: any, right: any) => {
        const leftScore =
          left.calls +
          left.followUpsCompleted +
          left.siteVisitsCompleted +
          left.bookingsDone;
        const rightScore =
          right.calls +
          right.followUpsCompleted +
          right.siteVisitsCompleted +
          right.bookingsDone;
        return rightScore - leftScore;
      })
      .map((row: any) => ({
        ...row,
        scoreRank: scoreRankByUserId.get(row.id) ?? null,
        scoreBreakdown: [...row.scoreBreakdown.values()].sort(
          (left: any, right: any) => right.points - left.points,
        ),
      }));

    const summary = {
      totalCalls: userRows.reduce(
        (sum: number, row: any) => sum + row.calls,
        0,
      ),
      connectedCalls: userRows.reduce(
        (sum: number, row: any) => sum + row.connectedCalls,
        0,
      ),
      followUpsCompleted: userRows.reduce(
        (sum: number, row: any) => sum + row.followUpsCompleted,
        0,
      ),
      siteVisitsDone: userRows.reduce(
        (sum: number, row: any) => sum + row.siteVisitsCompleted,
        0,
      ),
      remarksAdded: userRows.reduce(
        (sum: number, row: any) => sum + row.remarksAdded,
        0,
      ),
      tasksCompleted: userRows.reduce(
        (sum: number, row: any) => sum + row.tasksCompleted,
        0,
      ),
      bookingsDone: userRows.reduce(
        (sum: number, row: any) => sum + row.bookingsDone,
        0,
      ),
      scoreEarned: userRows.reduce(
        (sum: number, row: any) => sum + row.scoreEarned,
        0,
      ),
    };

    const activityStart = (page - 1) * limit;
    return {
      meta: {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        page,
        limit,
        totalActivity: eventRows.length,
      },
      summary,
      users: userRows,
      activity: eventRows.slice(activityStart, activityStart + limit),
      filters: {
        employees: users.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.email,
          role: user.role,
          teamId: user.employeeProfile?.teamId ?? null,
        })),
        teams,
        roles: operationalRoles,
        activityTypes: Array.from(
          new Set(eventRows.map((event: any) => event.type)),
        ).sort(),
      },
    };
  }

  async getAdminDashboardData(query: Query = {}) {
    const db = this.prisma as any;
    const now = new Date();
    const range = this.normalizeRange(String(query.range ?? 'today'));
    const { start, end, label } = this.resolveWindow(range);
    const previousWindow = this.resolvePreviousWindow(range, start, end);
    const todayStart = this.startOfDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const activeVisitStatuses = ['Scheduled', 'Upcoming', 'Confirmed'];
    const operationalRoles = [Role.TELECALLER, Role.SALES_AGENT];

    const [
      totalLeads,
      followUpsDueToday,
      overdueFollowUps,
      siteVisitsPendingToday,
      siteVisitsCompletedToday,
      bookingsDoneToday,
      previousFollowUpsDue,
      previousOverdueFollowUps,
      previousSiteVisitsPending,
      previousSiteVisitsCompleted,
      previousBookingsDone,
      alertsRaw,
      sourceGroups,
      stageGroups,
      teams,
      operationalUsers,
      pendingFollowUpsRaw,
      todaySiteVisitsRaw,
      completedFollowUpsRaw,
      todayAgendaFollowUpsRaw,
      todayAgendaVisitsRaw,
      upcomingSiteVisitsRaw,
      reminderFollowUpsRaw,
      recentActivitiesRaw,
      currentWeekCompletedVisits,
      currentWeekBookedBookings,
      previousWeekCompletedVisits,
      previousWeekBookedBookings,
    ] = await Promise.all([
      db.lead.count({ where: this.tenantLeadWhere() }).catch(() => 0),
      db.followUp
        .count({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            scheduledAt: { gte: start, lte: end },
          }),
        })
        .catch(() => 0),
      db.followUp
        .count({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            scheduledAt: { lt: todayStart },
          }),
        })
        .catch(() => 0),
      db.siteVisit
        .count({
          where: this.tenantSiteVisitWhere({
            scheduledAt: { gte: start, lte: end },
            status: { in: activeVisitStatuses },
            checkedOutAt: null,
          }),
        })
        .catch(() => 0),
      db.siteVisit
        .count({
          where: this.tenantSiteVisitWhere({
            scheduledAt: { gte: start, lte: end },
            OR: [{ status: 'Completed' }, { checkedOutAt: { not: null } }],
          }),
        })
        .catch(() => 0),
      db.booking
        .count({
          where: this.tenantBookingWhere({
            bookingDate: { gte: start, lte: end },
            status: { in: ['Booked', 'Completed', 'Converted'] },
          }),
        })
        .catch(() => 0),
      db.followUp
        .count({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            scheduledAt: {
              gte: previousWindow.start,
              lte: previousWindow.end,
            },
          }),
        })
        .catch(() => 0),
      db.followUp
        .count({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            scheduledAt: { lt: previousWindow.end },
          }),
        })
        .catch(() => 0),
      db.siteVisit
        .count({
          where: this.tenantSiteVisitWhere({
            scheduledAt: {
              gte: previousWindow.start,
              lte: previousWindow.end,
            },
            status: { in: activeVisitStatuses },
            checkedOutAt: null,
          }),
        })
        .catch(() => 0),
      db.siteVisit
        .count({
          where: this.tenantSiteVisitWhere({
            scheduledAt: {
              gte: previousWindow.start,
              lte: previousWindow.end,
            },
            OR: [{ status: 'Completed' }, { checkedOutAt: { not: null } }],
          }),
        })
        .catch(() => 0),
      db.booking
        .count({
          where: this.tenantBookingWhere({
            bookingDate: {
              gte: previousWindow.start,
              lte: previousWindow.end,
            },
            status: { in: ['Booked', 'Completed', 'Converted'] },
          }),
        })
        .catch(() => 0),
      db.notification
        .findMany({
          where: {
            organizationId: this.organizationId,
            createdAt: { gte: start, lte: end },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        })
        .catch(() => []),
      db.lead
        .groupBy({
          by: ['sourceId'],
          where: this.tenantLeadWhere({
            createdAt: { gte: start, lte: end },
          }),
          _count: { _all: true },
        })
        .catch(() => []),
      db.lead
        .groupBy({
          by: ['stageId'],
          where: this.tenantLeadWhere({
            createdAt: { gte: start, lte: end },
          }),
          _count: { _all: true },
        })
        .catch(() => []),
      db.team
        .findMany({
          where: this.tenantTeamWhere({ isActive: true }),
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            leaderId: true,
            leader: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
            members: {
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        })
        .catch(() => []),
      db.user
        .findMany({
          where: this.tenantUserWhere({
            role: { in: operationalRoles },
            isActive: true,
          }),
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
          },
        })
        .catch(() => []),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            scheduledAt: { lte: end },
          }),
          take: 8,
          orderBy: [{ scheduledAt: 'asc' }],
          select: {
            id: true,
            leadId: true,
            assignedToId: true,
            scheduledAt: true,
            nextAction: true,
            lead: {
              select: {
                id: true,
                name: true,
                displayId: true,
              },
            },
          },
        })
        .catch(() => []),
      db.siteVisit
        .findMany({
          where: this.tenantSiteVisitWhere({
            scheduledAt: { gte: start, lte: end },
          }),
          take: 8,
          orderBy: [{ scheduledAt: 'asc' }],
          select: {
            id: true,
            displayId: true,
            leadId: true,
            status: true,
            scheduledAt: true,
            checkedInAt: true,
            checkedOutAt: true,
            assignedExecutiveId: true,
            lead: {
              select: {
                id: true,
                name: true,
                displayId: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
        .catch(() => []),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            completedAt: { not: null },
            assignedToId: { not: null },
            updatedAt: { gte: start, lte: end },
          }),
          select: {
            id: true,
            assignedToId: true,
            completedAt: true,
          },
        })
        .catch(() => []),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            scheduledAt: { gte: todayStart, lt: tomorrowStart },
          }),
          take: 6,
          orderBy: [{ scheduledAt: 'asc' }],
          select: {
            id: true,
            scheduledAt: true,
            nextAction: true,
            assignedToId: true,
            leadId: true,
            lead: {
              select: {
                id: true,
                name: true,
                displayId: true,
              },
            },
          },
        })
        .catch(() => []),
      db.siteVisit
        .findMany({
          where: this.tenantSiteVisitWhere({
            scheduledAt: { gte: todayStart, lt: tomorrowStart },
          }),
          take: 6,
          orderBy: [{ scheduledAt: 'asc' }],
          select: {
            id: true,
            displayId: true,
            scheduledAt: true,
            status: true,
            assignedExecutiveId: true,
            leadId: true,
            lead: {
              select: {
                id: true,
                name: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
        .catch(() => []),
      db.siteVisit
        .findMany({
          where: this.tenantSiteVisitWhere({
            scheduledAt: { gte: now },
          }),
          take: 4,
          orderBy: [{ scheduledAt: 'asc' }],
          select: {
            id: true,
            displayId: true,
            scheduledAt: true,
            status: true,
            assignedExecutiveId: true,
            lead: {
              select: {
                id: true,
                name: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        })
        .catch(() => []),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            scheduledAt: { gte: todayStart },
          }),
          take: 4,
          orderBy: [{ scheduledAt: 'asc' }],
          select: {
            id: true,
            scheduledAt: true,
            nextAction: true,
            assignedToId: true,
            lead: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
        .catch(() => []),
      db.activity
        .findMany({
          where: this.tenantActivityWhere({ occurredAt: { lte: end } }),
          take: 6,
          orderBy: { occurredAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            occurredAt: true,
            lead: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
        .catch(() => []),
      db.siteVisit
        .findMany({
          where: this.tenantSiteVisitWhere({
            scheduledAt: {
              gte: this.startOfDay(
                new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
              ),
              lt: tomorrowStart,
            },
            OR: [{ status: 'Completed' }, { checkedOutAt: { not: null } }],
          }),
          select: {
            scheduledAt: true,
          },
        })
        .catch(() => []),
      db.booking
        .findMany({
          where: this.tenantBookingWhere({
            bookingDate: {
              gte: this.startOfDay(
                new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
              ),
              lt: tomorrowStart,
            },
            status: { in: ['Booked', 'Completed', 'Converted'] },
          }),
          select: {
            bookingDate: true,
          },
        })
        .catch(() => []),
      db.siteVisit
        .findMany({
          where: this.tenantSiteVisitWhere({
            scheduledAt: {
              gte: this.startOfDay(
                new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000),
              ),
              lt: this.startOfDay(
                new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
              ),
            },
            OR: [{ status: 'Completed' }, { checkedOutAt: { not: null } }],
          }),
          select: {
            scheduledAt: true,
          },
        })
        .catch(() => []),
      db.booking
        .findMany({
          where: this.tenantBookingWhere({
            bookingDate: {
              gte: this.startOfDay(
                new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000),
              ),
              lt: this.startOfDay(
                new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
              ),
            },
            status: { in: ['Booked', 'Completed', 'Converted'] },
          }),
          select: {
            bookingDate: true,
          },
        })
        .catch(() => []),
    ]);

    const sourceTotal = sourceGroups.reduce(
      (sum: number, row: any) => sum + row._count._all,
      0,
    );
    const sourceDistribution = (
      await Promise.all(
        sourceGroups.map(async (row: any, index: number) => ({
          name: await this.masterName(row.sourceId),
          value: row._count._all,
          percent: this.percent(row._count._all, sourceTotal),
          color: this.chartColors[index % this.chartColors.length],
        })),
      )
    ).sort((left, right) => right.value - left.value);

    const stageTotal = stageGroups.reduce(
      (sum: number, row: any) => sum + row._count._all,
      0,
    );
    const conversionFunnel = (
      await Promise.all(
        stageGroups.map(async (row: any, index: number) => {
          const count = row._count._all;
          return {
            stage: await this.masterName(row.stageId),
            value: count.toLocaleString('en-IN'),
            percent: this.percent(count, stageTotal),
            width: `${Math.max(
              18,
              Math.round((count / Math.max(stageTotal, 1)) * 100),
            )}%`,
            color: this.chartColors[index % this.chartColors.length],
            rawValue: count,
          };
        }),
      )
    )
      .sort((left, right) => right.rawValue - left.rawValue)
      .map(({ ...item }) => item);

    const formatDateTime = (value?: Date | string | null) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatShortTime = (value?: Date | string | null) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatRelativeTime = (value?: Date | string | null) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (diffMinutes < 60) return `${diffMinutes} mins ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hrs ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    };

    const buildMetricChange = (current: number, previous: number) => {
      if (previous === 0) {
        if (current === 0) {
          return {
            change: '0%',
            direction: 'neutral' as const,
          };
        }
        return {
          change: '100%',
          direction: 'up' as const,
        };
      }

      if (current === previous) {
        return {
          change: '0%',
          direction: 'neutral' as const,
        };
      }

      return {
        change: `${Math.round(
          (Math.abs(current - previous) / previous) * 100,
        )}%`,
        direction: current > previous ? ('up' as const) : ('down' as const),
      };
    };

    const groupCountsByDay = (
      rows: Array<{ scheduledAt?: Date; bookingDate?: Date }>,
      dateKey: 'scheduledAt' | 'bookingDate',
      startOffsetDays: number,
    ) => {
      return Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(todayStart);
        date.setDate(todayStart.getDate() + startOffsetDays + index);
        const label = date.toLocaleDateString('en-IN', { weekday: 'short' });
        const dayStart = this.startOfDay(date).getTime();
        const dayEnd = this.endOfDay(date).getTime();
        const count = rows.filter((row: any) => {
          const value = row[dateKey] ? new Date(row[dateKey]).getTime() : NaN;
          return !Number.isNaN(value) && value >= dayStart && value <= dayEnd;
        }).length;
        return { label, count };
      });
    };

    const userMap = new Map<string, any>(
      operationalUsers.map((user: any) => [user.id, user]),
    );
    const allRelevantUserIds = Array.from(
      new Set(operationalUsers.map((user: any) => user.id).filter(Boolean)),
    ) as string[];

    const [leadAssignments, dueFollowUps, visitsToday] = await Promise.all([
      db.lead
        .findMany({
          where: this.tenantLeadWhere({
            OR: [
              { telecallerId: { in: allRelevantUserIds } },
              { fieldExecutiveId: { in: allRelevantUserIds } },
              { ownerId: { in: allRelevantUserIds } },
            ],
          }),
          select: {
            id: true,
            telecallerId: true,
            fieldExecutiveId: true,
            ownerId: true,
          },
        })
        .catch(() => []),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            completedAt: null,
            assignedToId: { in: allRelevantUserIds },
            scheduledAt: { lte: end },
          }),
          select: {
            id: true,
            assignedToId: true,
            scheduledAt: true,
          },
        })
        .catch(() => []),
      db.siteVisit
        .findMany({
          where: this.tenantSiteVisitWhere({
            assignedExecutiveId: { in: allRelevantUserIds },
            scheduledAt: { gte: start, lte: end },
          }),
          select: {
            id: true,
            assignedExecutiveId: true,
            status: true,
            checkedInAt: true,
            checkedOutAt: true,
          },
        })
        .catch(() => []),
    ]);

    const teamBuckets = teams.map((team: any) => {
      const members = (team.members ?? [])
        .map((entry: any) => entry.user)
        .map((member: any) => userMap.get(member?.id))
        .filter(Boolean);
      const combined = new Map<string, any>();
      members.forEach((member: any) => combined.set(member.id, member));
      const leader = team.leader?.id ? userMap.get(team.leader.id) : null;
      if (leader?.id && operationalRoles.some((role) => role === leader.role)) {
        combined.set(leader.id, leader);
      }
      const allMembers = Array.from(combined.values());
      return {
        id: team.id,
        name: team.name,
        leaderName:
          leader?.fullName?.trim() || leader?.email?.trim() || 'No leader',
        memberIds: allMembers.map((member: any) => member.id),
        telecallerIds: allMembers
          .filter((member: any) => member.role === 'TELECALLER')
          .map((member: any) => member.id),
        fieldExecutiveIds: allMembers
          .filter((member: any) => member.role === 'SALES_AGENT')
          .map((member: any) => member.id),
      };
    });

    const assignedTeamUserIds = new Set<string>();
    teamBuckets.forEach((team: any) =>
      team.memberIds.forEach((id: string) => assignedTeamUserIds.add(id)),
    );
    const unassignedUsers = operationalUsers.filter(
      (user: any) => !assignedTeamUserIds.has(user.id),
    );

    if (unassignedUsers.length) {
      teamBuckets.push({
        id: 'unassigned',
        name: 'Unassigned',
        leaderName: 'No team assigned',
        memberIds: unassignedUsers.map((user: any) => user.id),
        telecallerIds: unassignedUsers
          .filter((user: any) => user.role === 'TELECALLER')
          .map((user: any) => user.id),
        fieldExecutiveIds: unassignedUsers
          .filter((user: any) => user.role === 'SALES_AGENT')
          .map((user: any) => user.id),
      });
    }

    const teamPerformance = teamBuckets
      .map((team: any) => {
        const teamUserIds = new Set(team.memberIds);
        const fieldExecutiveIds = new Set(team.fieldExecutiveIds);
        const assignedLeadIds = new Set(
          leadAssignments
            .filter(
              (lead: any) =>
                (lead.telecallerId && teamUserIds.has(lead.telecallerId)) ||
                (lead.fieldExecutiveId &&
                  teamUserIds.has(lead.fieldExecutiveId)) ||
                (lead.ownerId && teamUserIds.has(lead.ownerId)),
            )
            .map((lead: any) => lead.id),
        );
        const teamFollowUps = dueFollowUps.filter(
          (followUp: any) =>
            followUp.assignedToId && teamUserIds.has(followUp.assignedToId),
        );
        const completedFollowUps = completedFollowUpsRaw.filter(
          (followUp: any) =>
            followUp.assignedToId && teamUserIds.has(followUp.assignedToId),
        ).length;
        const overdueCount = teamFollowUps.filter(
          (followUp: any) => new Date(followUp.scheduledAt) < todayStart,
        ).length;
        const teamVisits = visitsToday.filter(
          (visit: any) =>
            visit.assignedExecutiveId &&
            fieldExecutiveIds.has(visit.assignedExecutiveId),
        );
        const completedVisits = teamVisits.filter(
          (visit: any) =>
            visit.status === 'Completed' || Boolean(visit.checkedOutAt),
        ).length;
        const conversionRateRaw = assignedLeadIds.size
          ? (completedVisits / assignedLeadIds.size) * 100
          : 0;
        const completionRate = teamVisits.length
          ? completedVisits / teamVisits.length
          : 1;
        const health =
          overdueCount >= 5 || (teamVisits.length > 0 && completionRate < 0.4)
            ? 'Critical'
            : overdueCount > 0 ||
              (teamVisits.length > 0 && completionRate < 0.7)
            ? 'Attention'
            : 'On Track';
        return {
          id: team.id,
          name: team.name,
          leaderName: team.leaderName,
          telecallerCount: team.telecallerIds.length,
          fieldExecutiveCount: team.fieldExecutiveIds.length,
          assignedLeads: assignedLeadIds.size,
          followUpsDone: completedFollowUps,
          pendingFollowUps: teamFollowUps.length,
          overdueFollowUps: overdueCount,
          todaySiteVisitsScheduled: teamVisits.length,
          todaySiteVisitsCompleted: completedVisits,
          conversionRate: `${Math.round(conversionRateRaw)}%`,
          health,
          completionRate: `${Math.round(completionRate * 100)}%`,
        };
      })
      .sort((left: any, right: any) => {
        const healthPriority = {
          Critical: 0,
          Attention: 1,
          'On Track': 2,
        } as Record<string, number>;
        const healthDelta =
          healthPriority[left.health] - healthPriority[right.health];
        if (healthDelta !== 0) return healthDelta;
        return right.assignedLeads - left.assignedLeads;
      });

    const teamsNeedingAttention = teamPerformance.filter(
      (team: any) => team.health !== 'On Track',
    ).length;
    const topTeam =
      [...teamPerformance].sort((left: any, right: any) => {
        const leftScore =
          left.todaySiteVisitsCompleted * 10 +
          left.assignedLeads -
          left.overdueFollowUps * 3;
        const rightScore =
          right.todaySiteVisitsCompleted * 10 +
          right.assignedLeads -
          right.overdueFollowUps * 3;
        return rightScore - leftScore;
      })[0] ?? null;
    const attentionTeam =
      teamPerformance.find((team: any) => team.health !== 'On Track') ?? null;

    const visitExecutionSummary = {
      pending: siteVisitsPendingToday,
      inProgress: todaySiteVisitsRaw.filter(
        (visit: any) => visit.checkedInAt && !visit.checkedOutAt,
      ).length,
      completed: siteVisitsCompletedToday,
      overdue: todaySiteVisitsRaw.filter(
        (visit: any) =>
          new Date(visit.scheduledAt) < now &&
          visit.status !== 'Completed' &&
          !visit.checkedOutAt,
      ).length,
    };

    const pendingFollowUps = pendingFollowUpsRaw.map((followUp: any) => {
      const assignee = followUp.assignedToId
        ? userMap.get(followUp.assignedToId)
        : null;
      return {
        id: followUp.id,
        leadId: followUp.leadId,
        leadName: followUp.lead?.name ?? 'Lead',
        leadDisplayId: followUp.lead?.displayId ?? followUp.leadId,
        assignedToId: assignee?.id ?? followUp.assignedToId ?? null,
        assignedToName:
          assignee?.fullName?.trim() || assignee?.email?.trim() || 'Unassigned',
        assignedToImage: assignee?.avatarStorageKey ?? null,
        assignedToRole: assignee?.role
          ? getUserRoleLabel(assignee.role)
          : 'Sales',
        scheduledAt: followUp.scheduledAt,
        dueLabel: formatDateTime(followUp.scheduledAt),
        nextAction: followUp.nextAction ?? 'Follow up',
        isOverdue: new Date(followUp.scheduledAt) < todayStart,
      };
    });

    const todaySiteVisits = todaySiteVisitsRaw.map((visit: any) => {
      const executive = visit.assignedExecutiveId
        ? userMap.get(visit.assignedExecutiveId)
        : null;
      return {
        id: visit.id,
        displayId: visit.displayId ?? visit.id,
        leadId: visit.leadId,
        leadName: visit.lead?.name ?? 'Lead',
        leadDisplayId: visit.lead?.displayId ?? visit.leadId,
        projectName: visit.project?.name ?? 'Project',
        scheduledAt: visit.scheduledAt,
        scheduledLabel: formatDateTime(visit.scheduledAt),
        status: visit.status,
        checkedInAt: visit.checkedInAt,
        checkedOutAt: visit.checkedOutAt,
        assignedExecutiveId: executive?.id ?? visit.assignedExecutiveId ?? null,
        assignedExecutiveName:
          executive?.fullName?.trim() ||
          executive?.email?.trim() ||
          'Unassigned',
        assignedExecutiveImage: executive?.avatarStorageKey ?? null,
      };
    });

    const alerts = alertsRaw.map((item: any) => ({
      title: item.title,
      subtitle: item.description ?? item.badge ?? '',
      time: formatRelativeTime(item.createdAt),
      tone:
        String(item.type ?? '').includes('follow-up') ||
        String(item.type ?? '').includes('site-visit')
          ? 'warning'
          : 'danger',
    }));

    const todayAgenda = [
      ...todayAgendaVisitsRaw.map((visit: any) => {
        const executive = visit.assignedExecutiveId
          ? userMap.get(visit.assignedExecutiveId)
          : null;
        return {
          id: `visit-${visit.id}`,
          time: formatShortTime(visit.scheduledAt),
          title: visit.project?.name ?? 'Site visit',
          subtitle: visit.lead?.name ?? 'Lead',
          type: 'Site visit',
          statusLabel: visit.status,
          statusTone:
            visit.status === 'Completed'
              ? 'success'
              : visit.status === 'Confirmed'
              ? 'info'
              : 'warning',
          assigneeName:
            executive?.fullName?.trim() ||
            executive?.email?.trim() ||
            'Unassigned',
          assigneeImage: executive?.avatarStorageKey ?? null,
        };
      }),
      ...todayAgendaFollowUpsRaw.map((followUp: any) => {
        const assignee = followUp.assignedToId
          ? userMap.get(followUp.assignedToId)
          : null;
        return {
          id: `follow-${followUp.id}`,
          time: formatShortTime(followUp.scheduledAt),
          title: followUp.nextAction ?? 'Follow-up call',
          subtitle: followUp.lead?.name ?? 'Lead',
          type: 'Follow-up',
          statusLabel:
            new Date(followUp.scheduledAt) < todayStart ? 'Overdue' : 'Pending',
          statusTone:
            new Date(followUp.scheduledAt) < todayStart ? 'danger' : 'warning',
          assigneeName:
            assignee?.fullName?.trim() ||
            assignee?.email?.trim() ||
            'Unassigned',
          assigneeImage: assignee?.avatarStorageKey ?? null,
        };
      }),
    ]
      .sort((left, right) => {
        const leftDate = new Date(
          `${todayStart.toDateString()} ${left.time}`,
        ).getTime();
        const rightDate = new Date(
          `${todayStart.toDateString()} ${right.time}`,
        ).getTime();
        return leftDate - rightDate;
      })
      .slice(0, 5);

    const upcomingSiteVisits = upcomingSiteVisitsRaw.map((visit: any) => {
      const executive = visit.assignedExecutiveId
        ? userMap.get(visit.assignedExecutiveId)
        : null;
      return {
        id: visit.id,
        displayId: visit.displayId ?? visit.id,
        projectName: visit.project?.name ?? 'Project',
        projectImage: visit.project?.imageUrl ?? null,
        leadName: visit.lead?.name ?? 'Lead',
        scheduledAt: visit.scheduledAt,
        scheduledLabel: formatShortTime(visit.scheduledAt),
        status: visit.status,
        assigneeName:
          executive?.fullName?.trim() ||
          executive?.email?.trim() ||
          'Unassigned',
        assigneeImage: executive?.avatarStorageKey ?? null,
      };
    });

    const reminders = reminderFollowUpsRaw.map((followUp: any) => {
      const assignee = followUp.assignedToId
        ? userMap.get(followUp.assignedToId)
        : null;
      return {
        id: followUp.id,
        title: followUp.nextAction ?? 'Follow-up reminder',
        leadName: followUp.lead?.name ?? 'Lead',
        scheduledAt: followUp.scheduledAt,
        scheduledLabel: formatDateTime(followUp.scheduledAt),
        assigneeName:
          assignee?.fullName?.trim() || assignee?.email?.trim() || 'Unassigned',
        assigneeImage: assignee?.avatarStorageKey ?? null,
      };
    });

    const recentActivity = recentActivitiesRaw.map((activity: any) => ({
      id: activity.id,
      title: activity.title,
      subtitle:
        activity.description ?? activity.lead?.name ?? 'CRM activity update',
      occurredAt: activity.occurredAt,
      occurredLabel: formatRelativeTime(activity.occurredAt),
      type: activity.type ?? 'activity',
    }));

    const currentWeekVisitsByDay = groupCountsByDay(
      currentWeekCompletedVisits,
      'scheduledAt',
      -6,
    );
    const currentWeekBookingsByDay = groupCountsByDay(
      currentWeekBookedBookings,
      'bookingDate',
      -6,
    );
    const previousWeekVisitsByDay = groupCountsByDay(
      previousWeekCompletedVisits,
      'scheduledAt',
      -13,
    );
    const previousWeekBookingsByDay = groupCountsByDay(
      previousWeekBookedBookings,
      'bookingDate',
      -13,
    );

    const currentWeekTrend = currentWeekVisitsByDay.map((day, index) => {
      const denominator = Math.max(
        day.count + currentWeekBookingsByDay[index].count,
        1,
      );
      const rate = Math.round(
        (currentWeekBookingsByDay[index].count / denominator) * 100,
      );
      return {
        label: day.label,
        rate,
      };
    });
    const previousWeekTrend = previousWeekVisitsByDay.map((day, index) => {
      const denominator = Math.max(
        day.count + previousWeekBookingsByDay[index].count,
        1,
      );
      const rate = Math.round(
        (previousWeekBookingsByDay[index].count / denominator) * 100,
      );
      return {
        label: day.label,
        rate,
      };
    });
    const currentRate =
      currentWeekTrend.reduce((sum, day) => sum + day.rate, 0) /
      Math.max(currentWeekTrend.length, 1);
    const previousRate =
      previousWeekTrend.reduce((sum, day) => sum + day.rate, 0) /
      Math.max(previousWeekTrend.length, 1);

    const metricCards = [
      {
        id: 'follow-ups-due',
        label: 'Follow-ups due',
        value: followUpsDueToday,
        helper: `vs ${range === 'today' ? 'yesterday' : 'previous period'}`,
        ...buildMetricChange(followUpsDueToday, previousFollowUpsDue),
      },
      {
        id: 'overdue-follow-ups',
        label: 'Overdue follow-ups',
        value: overdueFollowUps,
        helper: `vs ${range === 'today' ? 'yesterday' : 'previous period'}`,
        ...buildMetricChange(overdueFollowUps, previousOverdueFollowUps),
      },
      {
        id: 'site-visits-pending',
        label: 'Site visits (pending)',
        value: siteVisitsPendingToday,
        helper: `vs ${range === 'today' ? 'yesterday' : 'previous period'}`,
        ...buildMetricChange(siteVisitsPendingToday, previousSiteVisitsPending),
      },
      {
        id: 'site-visits-completed',
        label: 'Site visits (completed)',
        value: siteVisitsCompletedToday,
        helper: `vs ${range === 'today' ? 'yesterday' : 'previous period'}`,
        ...buildMetricChange(
          siteVisitsCompletedToday,
          previousSiteVisitsCompleted,
        ),
      },
      {
        id: 'bookings-today',
        label: 'Bookings (today)',
        value: bookingsDoneToday,
        helper: `vs ${range === 'today' ? 'yesterday' : 'previous period'}`,
        ...buildMetricChange(bookingsDoneToday, previousBookingsDone),
      },
      {
        id: 'teams-needing-attention',
        label: 'Teams needing attention',
        value: teamsNeedingAttention,
        helper: `${teamPerformance.length} active teams`,
        ...buildMetricChange(teamsNeedingAttention, teamPerformance.length),
      },
    ];

    return {
      meta: {
        range,
        label,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      },
      kpi: {
        totalLeads,
        followUpsDueToday,
        overdueFollowUps,
        siteVisitsPendingToday,
        siteVisitsCompletedToday,
        bookingsDoneToday,
        teamsNeedingAttention,
      },
      metricCards,
      sourceDistribution,
      conversionFunnel,
      teamPerformance,
      pendingFollowUps,
      todaySiteVisits,
      todayAgenda,
      upcomingSiteVisits,
      reminders,
      recentActivity,
      conversionTrend: {
        summaryRate: `${Math.round(currentRate)}%`,
        summaryChange: `${Math.round(
          currentRate - previousRate,
        )}% vs last week`,
        currentWeek: currentWeekTrend,
        previousWeek: previousWeekTrend,
      },
      visitExecutionSummary,
      teamHealthSummary: {
        topTeamName: topTeam?.name ?? 'No active team',
        topTeamRate: topTeam?.completionRate ?? '0%',
        attentionTeamName: attentionTeam?.name ?? 'No team at risk',
        totalTeams: teamPerformance.length,
      },
      alerts,
    };
  }

  async getTelecallerDashboardData(userId: string) {
    await this.tenantAccess.assertEmployee(userId);
    const db = this.prisma as any;
    const [
      totalAssignedLeads,
      newLeads,
      todaysFollowUps,
      missedFollowUps,
      interestedLeads,
      notInterestedLeads,
      siteVisitScheduled,
      bookingsDone,
      callsMade,
      callsConnected,
      upcomingFollowUps,
      activeRemindersData,
      recentActivities,
      callLogs,
    ] = await Promise.all([
      db.lead
        .count({ where: this.tenantLeadWhere({ telecallerId: userId }) })
        .catch(() => 0),
      db.lead
        .count({
          where: this.tenantLeadWhere({
            telecallerId: userId,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          }),
        })
        .catch(() => 0),
      db.followUp
        .count({
          where: this.tenantFollowUpWhere({
            assignedToId: userId,
            scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          }),
        })
        .catch(() => 0),
      db.followUp
        .count({
          where: this.tenantFollowUpWhere({
            assignedToId: userId,
            scheduledAt: { lt: new Date() },
            completedAt: null,
          }),
        })
        .catch(() => 0),
      db.lead
        .count({
          where: this.tenantLeadWhere({
            telecallerId: userId,
            interestLevel: { in: ['Interested', 'High', 'Very High'] },
          }),
        })
        .catch(() => 0),
      db.lead
        .count({
          where: this.tenantLeadWhere({
            telecallerId: userId,
            interestLevel: 'Not Interested',
          }),
        })
        .catch(() => 0),
      db.siteVisit
        .count({
          where: this.tenantSiteVisitWhere({
            assignedExecutiveId: userId,
            status: { in: ['Scheduled', 'Upcoming'] },
          }),
        })
        .catch(() => 0),
      db.booking
        .count({
          where: this.tenantBookingWhere({
            status: 'Booked',
            lead: { telecallerId: userId },
          }),
        })
        .catch(() => 0),
      db.callLog.count({ where: { userId } }).catch(() => 0),
      db.callLog
        .count({ where: { userId, outcome: 'Connected' } })
        .catch(() => 0),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            assignedToId: userId,
            completedAt: null,
            scheduledAt: { gte: new Date() },
          }),
          take: 5,
          orderBy: { scheduledAt: 'asc' },
          include: { lead: { include: { requirement: true } } },
        })
        .catch(() => []),
      db.followUp
        .findMany({
          where: this.tenantFollowUpWhere({
            assignedToId: userId,
            completedAt: null,
            setReminder: true,
            scheduledAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          }),
          take: 10,
          orderBy: { scheduledAt: 'asc' },
          include: { lead: { include: { requirement: true } } },
        })
        .catch(() => []),
      db.activity
        .findMany({
          where: this.tenantActivityWhere({ actorId: userId }),
          take: 5,
          orderBy: { occurredAt: 'desc' },
        })
        .catch(() => []),
      db.callLog
        .findMany({
          where: {
            userId,
            startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          select: { startedAt: true },
        })
        .catch(() => []),
    ]);
    const callingTrend = Array.from({ length: 10 }, (_, index) => {
      const hour = index + 9;
      const count = callLogs.filter(
        (log: any) => new Date(log.startedAt).getHours() === hour,
      ).length;
      return {
        time: `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`,
        count,
      };
    });
    const leadDistribution = [
      { name: 'New Leads', value: newLeads, color: '#26a329' },
      { name: 'Interested', value: interestedLeads, color: '#2788c7' },
      { name: 'Not Interested', value: notInterestedLeads, color: '#a0a0a0' },
      { name: 'Bookings Done', value: bookingsDone, color: '#ff921e' },
    ].map((item) => ({
      ...item,
      percent: this.percent(item.value, Math.max(totalAssignedLeads, 1)),
    }));
    const contacted = await db.callLog
      .groupBy({
        by: ['leadId'],
        where: {
          userId,
          leadId: { not: null },
          lead: { organizationId: this.organizationId },
        },
      })
      .then((rows: any[]) => rows.length)
      .catch(() => 0);
    const conversionFunnel = [
      { stage: 'Total Leads', value: totalAssignedLeads, color: '#2c83c5' },
      { stage: 'Contacted', value: contacted, color: '#48a6df' },
      { stage: 'Interested', value: interestedLeads, color: '#68c84f' },
      { stage: 'Site Visit', value: siteVisitScheduled, color: '#ff991f' },
      { stage: 'Bookings Done', value: bookingsDone, color: '#f04438' },
    ].map((item) => ({
      ...item,
      width: `${Math.max(
        20,
        Math.round((item.value / Math.max(totalAssignedLeads, 1)) * 100),
      )}%`,
    }));

    return {
      kpi: {
        totalAssignedLeads,
        newLeads: { value: newLeads, badge: 'Today' },
        todaysFollowUps: { value: todaysFollowUps, badge: 'Today' },
        missedFollowUps: { value: missedFollowUps, badge: 'Overdue' },
        hotLeads: 0,
        coldLeads: 0,
        interestedLeads,
        notInterestedLeads,
        siteVisitScheduled,
        bookingsDone: { value: bookingsDone, badge: 'This Month' },
        convertedLeads: { value: bookingsDone, badge: 'This Month' },
      },
      performance: {
        callsMade,
        callsConnected,
        callsNotAnswered: Math.max(callsMade - callsConnected, 0),
        followUpsCreated: todaysFollowUps,
        siteVisitsGenerated: siteVisitScheduled,
        conversionRate: totalAssignedLeads
          ? `${((bookingsDone / totalAssignedLeads) * 100).toFixed(1)}%`
          : '0%',
      },
      callingTrend,
      leadDistribution,
      conversionFunnel,
      tasks: [
        { label: 'Make Calls', count: totalAssignedLeads, icon: 'phone' },
        { label: 'Follow-ups', count: todaysFollowUps, icon: 'calendar' },
        { label: 'Site Visits', count: siteVisitScheduled, icon: 'mapPin' },
        { label: 'Missed Follow-ups', count: missedFollowUps, icon: 'bell' },
      ],
      upcomingFollowUps: upcomingFollowUps.map((follow: any) => ({
        id: follow.id,
        leadId: follow.leadId ?? follow.lead?.id ?? null,
        name: follow.lead?.name ?? 'Lead',
        time: new Date(follow.scheduledAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        project:
          follow.lead?.requirement?.preferredLocation ?? 'No project selected',
      })),
      recentActivities: recentActivities.map((activity: any) => ({
        title: activity.title,
        subtext: activity.description ?? '',
        time: new Date(activity.occurredAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        icon:
          activity.type === 'call'
            ? 'phone'
            : activity.type === 'site_visit'
            ? 'mapPin'
            : 'checkCircle',
      })),
      activeReminders: activeRemindersData.map((follow: any) => ({
        id: follow.id,
        leadId: follow.leadId ?? follow.lead?.id ?? null,
        name: follow.lead?.name ?? 'Lead',
        time: new Date(follow.scheduledAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        project:
          follow.lead?.requirement?.preferredLocation ?? 'No project selected',
      })),
      recommendations: [
        'Review overdue follow-ups first.',
        'Prioritize interested leads with upcoming visit windows.',
      ],
    };
  }

  async getFieldExecutiveDashboardData(userId: string) {
    await this.tenantAccess.assertEmployee(userId);
    const db = this.prisma as any;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const activeStatuses = ['Scheduled', 'Upcoming', 'Confirmed'];
    const visitWhere: Prisma.SiteVisitWhereInput = {
      OR: [
        { assignedExecutiveId: userId },
        { createdById: userId },
        {
          lead: {
            OR: [
              { fieldExecutiveId: userId },
              { ownerId: userId },
              { telecallerId: userId },
            ],
          },
        },
      ],
    };

    const [
      assignedLeads,
      todaysVisits,
      upcomingVisits,
      completedVisits,
      pendingFollowUps,
      missedVisits,
      checkInsPending,
      bookingsAssisted,
      todaySchedule,
      followUps,
      activities,
    ] = await Promise.all([
      db.lead.count({
        where: this.tenantLeadWhere({
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { fieldExecutiveId: userId },
            { telecallerId: userId },
            { managerId: userId },
            { assignments: { some: { toUserId: userId, isCurrent: true } } },
            { siteVisits: { some: { assignedExecutiveId: userId } } },
            { followUps: { some: { assignedToId: userId } } },
          ],
        }),
      }),
      db.siteVisit.count({
        where: this.tenantSiteVisitWhere({
          AND: [
            visitWhere,
            { scheduledAt: { gte: todayStart, lt: tomorrowStart } },
          ],
        }),
      }),
      db.siteVisit.count({
        where: this.tenantSiteVisitWhere({
          AND: [
            visitWhere,
            { scheduledAt: { gte: now }, status: { in: activeStatuses } },
          ],
        }),
      }),
      db.siteVisit.count({
        where: this.tenantSiteVisitWhere({
          AND: [
            visitWhere,
            {
              OR: [
                { status: { in: ['Completed', 'Visited', 'Done'] } },
                { checkedOutAt: { not: null } },
              ],
            },
          ],
        }),
      }),
      db.followUp.count({
        where: this.tenantFollowUpWhere({
          assignedToId: userId,
          completedAt: null,
          scheduledAt: { gte: todayStart },
        }),
      }),
      db.siteVisit.count({
        where: this.tenantSiteVisitWhere({
          AND: [
            visitWhere,
            {
              scheduledAt: { lt: now },
              status: { in: activeStatuses },
              checkedInAt: null,
            },
          ],
        }),
      }),
      db.siteVisit.count({
        where: this.tenantSiteVisitWhere({
          AND: [
            visitWhere,
            {
              scheduledAt: { gte: todayStart, lt: tomorrowStart },
              checkedInAt: null,
              status: { in: activeStatuses },
            },
          ],
        }),
      }),
      db.booking.count({
        where: this.tenantBookingWhere({
          closedById: userId,
          status: { in: ['Booked', 'Completed', 'Converted'] },
        }),
      }),
      db.siteVisit.findMany({
        where: this.tenantSiteVisitWhere({
          AND: [
            visitWhere,
            { scheduledAt: { gte: todayStart, lt: tomorrowStart } },
          ],
        }),
        include: { lead: true, project: true, unit: true },
        orderBy: { scheduledAt: 'asc' },
      }),
      db.followUp.findMany({
        where: this.tenantFollowUpWhere({
          assignedToId: userId,
          completedAt: null,
        }),
        include: { lead: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      db.activity.findMany({
        where: this.tenantActivityWhere({ actorId: userId }),
        orderBy: { occurredAt: 'desc' },
        take: 6,
      }),
    ]);

    const checkedIn = todaySchedule.filter(
      (visit: any) => visit.checkedInAt,
    ).length;
    const checkedOut = todaySchedule.filter(
      (visit: any) => visit.checkedOutAt,
    ).length;

    const formatTime = (date: Date) =>
      new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

    return {
      kpis: {
        assignedLeads,
        todaysVisits,
        upcomingVisits,
        completedVisits,
        pendingFollowUps,
        missedVisits,
        checkInsPending,
        bookingsAssisted,
      },
      myDay: {
        todaysVisits,
        followUpsToday: pendingFollowUps,
        checkInsPending,
        completedVisits: checkedOut,
        nextVisit: todaySchedule[0]
          ? formatTime(todaySchedule[0].scheduledAt)
          : null,
      },
      todaySchedule: todaySchedule.map((visit: any) => ({
        id: visit.id,
        displayId: visit.displayId,
        time: formatTime(visit.scheduledAt),
        scheduledAt: visit.scheduledAt,
        leadId: visit.leadId,
        leadName: visit.lead?.name ?? 'Lead',
        leadPhone: `${visit.lead?.mobileCountryCode ?? '+91'} ${
          visit.lead?.mobile ?? ''
        }`.trim(),
        projectId: visit.projectId,
        projectName: visit.project?.name ?? 'Project',
        location: visit.project?.location ?? visit.meetingPoint ?? '',
        meetingPoint: visit.meetingPoint ?? 'Meeting point pending',
        status: visit.status,
        checkedInAt: visit.checkedInAt,
        checkedOutAt: visit.checkedOutAt,
      })),
      funnel: [
        { label: 'Scheduled', value: upcomingVisits },
        { label: 'Checked In', value: checkedIn },
        { label: 'Visit Completed', value: completedVisits },
      ],
      checkInStatus: {
        checkedIn,
        checkedOut,
        pending: checkInsPending,
        missed: missedVisits,
      },
      followUps: followUps.map((followUp: any) => ({
        id: followUp.id,
        leadId: followUp.leadId,
        leadName: followUp.lead?.name ?? 'Lead',
        scheduledAt: followUp.scheduledAt,
        nextAction: followUp.nextAction ?? 'Follow up',
      })),
      recentActivities: activities.map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description ?? '',
        occurredAt: activity.occurredAt,
        type: activity.type,
      })),
    };
  }
}
