import { api } from '../../../../common/api';
import { TenantMember, PlatformTenantAccess, TenantAccessRequest, MemberStatus } from '../types/membership.types';

export interface ITenantMembershipService {
  getMembers(tenantId: string): Promise<TenantMember[]>;
  getMemberships(tenantId: string): Promise<TenantMember[]>;
  inviteMember(tenantId: string, input: { name: string; email: string; roleLabel: string; department: string }): Promise<TenantMember>;
  updateMember(tenantId: string, memberId: string, updates: Partial<TenantMember>): Promise<TenantMember>;
  updateMemberStatus(tenantId: string, memberId: string, status: MemberStatus): Promise<TenantMember>;
  suspendMember(tenantId: string, memberId: string): Promise<TenantMember>;
  reactivateMember(tenantId: string, memberId: string): Promise<TenantMember>;
  resendInvite(tenantId: string, memberId: string): Promise<void>;
  resendInvitation(tenantId: string, memberId: string): Promise<void>;
  revokeInvitation(tenantId: string, memberId: string): Promise<void>;
  bulkUpdateStatus(tenantId: string, memberIds: string[], status: MemberStatus): Promise<TenantMember[]>;
  bulkResendInvites(tenantId: string, memberIds: string[]): Promise<void>;
  getPlatformAccess(tenantId: string): Promise<PlatformTenantAccess[]>;
  getAccessRequests(tenantId: string): Promise<TenantAccessRequest[]>;
}

function mapMembershipDtoToMember(dto: any): TenantMember {
  const statusMap: Record<string, MemberStatus> = {
    ACTIVE: 'Active',
    INVITED: 'Invited',
    SUSPENDED: 'Suspended',
    DEACTIVATED: 'Suspended',
  };

  const roleName = dto.tenantRole?.name || dto.designation || 'Member';
  const isOwner = dto.tenantRole?.code === 'OWNER' || dto.isPrimary;

  return {
    id: dto.id,
    tenantId: dto.tenantId,
    name: dto.user?.fullName || 'User',
    email: dto.user?.email || '—',
    avatar: dto.user?.avatarUrl || undefined,
    roleLabel: isOwner ? 'Tenant Owner' : roleName,
    roleBg: isOwner ? 'bg-purple-50' : 'bg-blue-50',
    roleColor: isOwner ? 'text-purple-700' : 'text-blue-700',
    department: dto.department || 'Operations',
    status: statusMap[dto.status] || 'Active',
    joinedOn: dto.joinedAt
      ? new Date(dto.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : dto.createdAt
        ? new Date(dto.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    lastActive: '—',
    twoFactor: false,
    sessions: 0,
    isOwner,
  };
}

class ApiTenantMembershipService implements ITenantMembershipService {
  async getMembers(tenantId: string): Promise<TenantMember[]> {
    if (!tenantId) return [];
    try {
      const response = await api.get<any[]>(`/platform/tenants/${tenantId}/memberships`);
      return (response.data || []).map(mapMembershipDtoToMember);
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  async getMemberships(tenantId: string): Promise<TenantMember[]> {
    return this.getMembers(tenantId);
  }

  async inviteMember(
    tenantId: string,
    input: { name: string; email: string; roleLabel: string; department: string },
  ): Promise<TenantMember> {
    const member: TenantMember = {
      id: `mem_${Date.now()}`,
      tenantId,
      name: input.name,
      email: input.email,
      roleLabel: input.roleLabel,
      department: input.department,
      status: 'Invited',
      joinedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      lastActive: '—',
      twoFactor: false,
      sessions: 0,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces',
    };
    return member;
  }

  async updateMember(tenantId: string, memberId: string, updates: Partial<TenantMember>): Promise<TenantMember> {
    const members = await this.getMembers(tenantId);
    const existing = members.find((m) => m.id === memberId);
    return { ...(existing || ({} as TenantMember)), ...updates };
  }

  async updateMemberStatus(tenantId: string, memberId: string, status: MemberStatus): Promise<TenantMember> {
    return this.updateMember(tenantId, memberId, { status });
  }

  async suspendMember(tenantId: string, memberId: string): Promise<TenantMember> {
    return this.updateMemberStatus(tenantId, memberId, 'Suspended');
  }

  async reactivateMember(tenantId: string, memberId: string): Promise<TenantMember> {
    return this.updateMemberStatus(tenantId, memberId, 'Active');
  }

  async resendInvite(tenantId: string, memberId: string): Promise<void> {
    // Audit/log invite resend
  }

  async resendInvitation(tenantId: string, memberId: string): Promise<void> {
    return this.resendInvite(tenantId, memberId);
  }

  async revokeInvitation(tenantId: string, memberId: string): Promise<void> {
    // Revoke
  }

  async bulkUpdateStatus(tenantId: string, memberIds: string[], status: MemberStatus): Promise<TenantMember[]> {
    const updated: TenantMember[] = [];
    for (const memberId of memberIds) {
      updated.push(await this.updateMemberStatus(tenantId, memberId, status));
    }
    return updated;
  }

  async bulkResendInvites(tenantId: string, memberIds: string[]): Promise<void> {
    for (const memberId of memberIds) {
      await this.resendInvite(tenantId, memberId);
    }
  }

  async getPlatformAccess(tenantId: string): Promise<PlatformTenantAccess[]> {
    return [];
  }

  async getAccessRequests(tenantId: string): Promise<TenantAccessRequest[]> {
    return [];
  }
}

export const tenantMembershipService: ITenantMembershipService = new ApiTenantMembershipService();
