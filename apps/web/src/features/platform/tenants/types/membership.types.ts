export type MemberStatus = 'Active' | 'Suspended' | 'Invited';

export interface TenantMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  avatar: string;
  roleLabel: string;
  roleCode?: string;
  roleBg?: string;
  roleColor?: string;
  department: string;
  status: MemberStatus;
  joinedOn: string;
  lastActive: string;
  twoFactor: boolean;
  sessions: number;
  isOwner?: boolean;
}

export interface PlatformTenantAccess {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleLabel: string;
  platformRole?: string;
  accessLevel?: string;
  department: string;
  status: 'Active' | 'Revoked';
  grantedOn: string;
}

export interface TenantAccessRequest {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  requestedRole: string;
  requestedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}
