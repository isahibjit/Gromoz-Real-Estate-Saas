import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  Users,
  Shield,
  UserPlus,
  MoreVertical,
  Download,
  Filter,
  Building2,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Info,
  ChevronDown,
  Mail,
  UserCheck,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Copy,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { tenantService } from '../../features/platform/tenants/services/tenant.service';
import { tenantMembershipService } from '../../features/platform/tenants/services/tenant-membership.service';
import { Tenant } from '../../features/platform/tenants/types/platform.types';
import { TenantMember, PlatformTenantAccess, TenantAccessRequest, MemberStatus } from '../../features/platform/tenants/types/membership.types';

function UserAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgError(true)}
        className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs border border-indigo-200 shadow-2xs">
      {initials || 'U'}
    </div>
  );
}

function TenantLogo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="h-14 w-14 shrink-0 rounded-sm object-cover border border-slate-200 p-1 bg-white shadow-2xs"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-amber-200 bg-amber-50 text-amber-700 font-extrabold text-xl shadow-2xs">
      {(name || 'T')[0]}
    </div>
  );
}

export function TenantUsersPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all-users';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [platformAccess, setPlatformAccess] = useState<PlatformTenantAccess[]>([]);
  const [accessRequests, setAccessRequests] = useState<TenantAccessRequest[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Field Executive');
  const [inviteDept, setInviteDept] = useState('Field Operations');

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadData = async () => {
    if (!tenantId) return;
    const t = await tenantService.getTenantById(tenantId);
    if (t) {
      setTenant(t);
      const mems = await tenantMembershipService.getMemberships(t.id);
      setMembers(mems);
      const pa = await tenantMembershipService.getPlatformAccess(t.id);
      setPlatformAccess(pa);
      const ar = await tenantMembershipService.getAccessRequests(t.id);
      setAccessRequests(ar);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  if (!tenantId || !tenant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center font-sans space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Info className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0D1F3D]">Tenant Not Found</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            This tenant could not be found or may no longer be available.
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => navigate('/platform/tenants')}
          className="font-bold px-6 shadow-xs"
        >
          Back to All Tenants
        </Button>
      </div>
    );
  }

  // Filter members according to active tab
  let displayedMembers = members;
  if (activeTab === 'pending-invitations') {
    displayedMembers = members.filter((m) => m.status === 'Invited');
  } else if (activeTab === 'suspended-users') {
    displayedMembers = members.filter((m) => m.status === 'Suspended');
  }

  if (searchQuery.trim()) {
    displayedMembers = displayedMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.roleLabel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Derived counts
  const activeCount = members.filter((m) => m.status === 'Active').length;
  const invitedCount = members.filter((m) => m.status === 'Invited').length;
  const suspendedCount = members.filter((m) => m.status === 'Suspended').length;
  const seatLimit = tenant.seatLimit ? parseInt(tenant.seatLimit, 10) || tenant.userLicensesCount : tenant.userLicensesCount;
  const availableSeats = Math.max(0, seatLimit - members.length);

  const seatChartData = [
    { name: 'Active Users', value: activeCount, color: '#4F46E5' },
    { name: 'Invited', value: invitedCount, color: '#3B82F6' },
    { name: 'Suspended', value: suspendedCount, color: '#EF4444' },
    { name: 'Available Seats', value: availableSeats, color: '#E2E8F0' },
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(displayedMembers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Please enter Full Name and Email Address');
      return;
    }

    await tenantMembershipService.inviteMember(tenant.id, {
      name: inviteName,
      email: inviteEmail,
      roleLabel: inviteRole,
      department: inviteDept,
    });

    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteName('');
    setInviteEmail('');
    setShowInviteModal(false);
    await loadData();
  };

  const handleUpdateUserStatus = async (memberId: string, status: 'Active' | 'Suspended') => {
    await tenantMembershipService.updateMemberStatus(tenant.id, memberId, status);
    toast.success(`User membership status updated to ${status}`);
    setActiveRowMenuId(null);
    await loadData();
  };

  const handleResendInvite = async (memberId: string) => {
    await tenantMembershipService.resendInvite(tenant.id, memberId);
    toast.success('Invitation email resent successfully');
    setActiveRowMenuId(null);
  };

  const handleCopyInviteLink = (memberId: string) => {
    const inviteUrl = `${window.location.origin}/accept-invitation?id=${memberId}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invitation link copied to clipboard');
    setActiveRowMenuId(null);
  };

  const handleBulkStatusChange = async (status: 'Active' | 'Suspended') => {
    await tenantMembershipService.bulkUpdateStatus(tenant.id, selectedUserIds, status);
    toast.success(`Updated ${selectedUserIds.length} user status to ${status}`);
    setSelectedUserIds([]);
    setShowBulkMenu(false);
    await loadData();
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* Top Header Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <button type="button" onClick={() => navigate('/platform/dashboard')} className="hover:text-[#0D1F3D]">Dashboard</button>
            <span>›</span>
            <button type="button" onClick={() => navigate('/platform/tenants')} className="hover:text-[#0D1F3D]">Tenants</button>
            <span>›</span>
            <button type="button" onClick={() => navigate(`/platform/tenants/${tenant.id}`)} className="hover:text-[#0D1F3D]">{tenant.companyName}</button>
            <span>›</span>
            <span className="font-extrabold text-[#0D1F3D]">Users & Memberships</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight">Tenant Users & Memberships</h1>
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-purple-100 text-purple-700">
              <Users className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage users, roles and access for {tenant.companyName}. Invite, activate or suspend members and control their permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(`/platform/tenants/${tenant.id}`)} className="gap-1.5 font-bold text-slate-700">
            ← Back to Tenant
          </Button>

          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowMoreActions(!showMoreActions)} className="gap-1.5 font-bold text-slate-700">
              More Actions <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl text-xs font-semibold space-y-1">
                <button type="button" onClick={() => { setShowMoreActions(false); navigate(`/platform/tenants/${tenant.id}/modules`); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs">Manage Modules</button>
                <button type="button" onClick={() => { setShowMoreActions(false); navigate('/platform/audit'); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs">Audit Logs</button>
              </div>
            )}
          </div>

          <Button variant="accent" size="sm" onClick={() => setShowInviteModal(true)} className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
            <UserPlus className="h-4 w-4" /> Invite User
          </Button>
        </div>
      </div>

      {/* Top Tenant Banner Card */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 flex items-start gap-4">
          <TenantLogo name={tenant.companyName} logoUrl={tenant.logoUrl} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#0D1F3D]">{tenant.companyName}</h2>
              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">{tenant.tenantStatus}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Industry: <strong className="text-slate-800">{tenant.industryLabel}</strong> • Plan: <strong className="text-slate-800">{tenant.planName}</strong>
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Tenant Code: <strong className="font-mono text-slate-800">{tenant.slug.toUpperCase()}</strong> • Licenses: <strong className="text-slate-800">{seatLimit}</strong>
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 border-l border-slate-100 pl-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Subscription Status</span>
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">{tenant.subscriptionStatus}</span>
          </div>
          <p className="text-xs font-extrabold text-[#0D1F3D]">Created {tenant.createdAt.split(' ·')[0]}</p>
          <p className="text-[11px] text-slate-400 font-medium">MRR: ₹{tenant.mrr.toLocaleString('en-IN')} / mo</p>
        </div>

        <div className="lg:col-span-3 border-l border-slate-100 pl-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Active Seat Usage</span>
            <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">{members.length} / {seatLimit}</span>
          </div>
          <p className="text-xs font-extrabold text-[#0D1F3D]">{availableSeats} Available Seats</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT MAIN AREA */}
        <div className="lg:col-span-8 space-y-5">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-8 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setTab('all-users')}
              className={`pb-3 text-xs font-extrabold transition-all border-b-2 ${
                activeTab === 'all-users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All Users ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('platform-access')}
              className={`pb-3 text-xs font-extrabold transition-all border-b-2 ${
                activeTab === 'platform-access' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Platform Managed Access ({platformAccess.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('pending-invitations')}
              className={`pb-3 text-xs font-extrabold transition-all border-b-2 ${
                activeTab === 'pending-invitations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending Invitations ({invitedCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('suspended-users')}
              className={`pb-3 text-xs font-extrabold transition-all border-b-2 ${
                activeTab === 'suspended-users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Suspended Users ({suspendedCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('access-requests')}
              className={`pb-3 text-xs font-extrabold transition-all border-b-2 ${
                activeTab === 'access-requests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Access Requests ({accessRequests.length})
            </button>
          </div>

          {/* Search & Bulk Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="h-8 text-xs font-bold text-slate-700 gap-1.5"
                >
                  {selectedUserIds.length > 0 ? `Bulk Actions (${selectedUserIds.length})` : 'Bulk Actions'}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </Button>

                {showBulkMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      disabled={selectedUserIds.length === 0}
                      onClick={() => handleBulkStatusChange('Active')}
                      className="w-full text-left px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xs disabled:opacity-40"
                    >
                      Reactivate Selected
                    </button>
                    <button
                      type="button"
                      disabled={selectedUserIds.length === 0}
                      onClick={() => handleBulkStatusChange('Suspended')}
                      className="w-full text-left px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-50 rounded-xs disabled:opacity-40"
                    >
                      Suspend Selected
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table for Platform Access Tab vs Regular Users Tab */}
          {activeTab === 'platform-access' ? (
            platformAccess.length === 0 ? (
              <div className="rounded-sm border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3 font-sans">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0D1F3D]">No Platform Managed Access</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                    No platform super administrators currently have emergency override access assigned to this tenant workspace.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-sm border border-slate-200 bg-white overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F8FAFC] text-slate-700 font-extrabold">
                      <th className="py-3 px-3">Platform Super Admin</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Access Level</th>
                      <th className="py-3 px-3">Granted On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {platformAccess.map((pa) => (
                      <tr key={pa.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-extrabold text-[#0D1F3D]">
                          {pa.name} <span className="text-[11px] text-slate-400 font-normal block">{pa.email}</span>
                        </td>
                        <td className="py-3 px-3 text-purple-700 font-bold">{pa.platformRole}</td>
                        <td className="py-3 px-3 text-slate-600 font-semibold">{pa.accessLevel}</td>
                        <td className="py-3 px-3 text-slate-500">{pa.grantedOn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'access-requests' ? (
            <div className="rounded-sm border border-slate-200 bg-white p-8 shadow-xs text-center space-y-3">
              <UserCheck className="mx-auto h-8 w-8 text-indigo-500" />
              <h3 className="text-sm font-extrabold text-[#0D1F3D]">No Pending Access Requests</h3>
              <p className="text-xs text-slate-500">All tenant user membership requests have been reviewed.</p>
            </div>
          ) : displayedMembers.length === 0 ? (
            <div className="rounded-sm border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3 font-sans">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0D1F3D]">
                  {searchQuery
                    ? 'No matching users found'
                    : activeTab === 'pending-invitations'
                    ? 'No Pending Invitations'
                    : activeTab === 'suspended-users'
                    ? 'No Suspended Users'
                    : 'No Users Found'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No users match "${searchQuery}". Try searching with a different name, email, or role.`
                    : activeTab === 'pending-invitations'
                    ? 'There are currently no invited users awaiting acceptance in this tenant workspace.'
                    : activeTab === 'suspended-users'
                    ? 'There are no suspended user accounts in this tenant workspace.'
                    : 'No user accounts have been added to this tenant yet.'}
                </p>
              </div>
              {activeTab === 'all-users' && !searchQuery && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                  className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs mx-auto mt-2"
                >
                  <UserPlus className="h-4 w-4" /> Invite First User
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-sm border border-slate-200 bg-white shadow-xs relative">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAFC] text-slate-700 font-extrabold">
                    <th className="py-3 px-3 w-8">
                      <Checkbox
                        checked={selectedUserIds.length === displayedMembers.length && displayedMembers.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Role & Department</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Joined On</th>
                    <th className="py-3 px-3">Last Active</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMembers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <tr key={u.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-3 px-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectUser(u.id)}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} avatar={u.avatar} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[#0D1F3D]">{u.name}</span>
                                {u.isOwner && <span className="rounded-sm bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">Owner</span>}
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block rounded-xs px-2 py-0.5 text-[10px] font-extrabold ${u.roleBg} ${u.roleColor}`}>
                            {u.roleLabel}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-medium mt-0.5">{u.department}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            u.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-600">{u.joinedOn}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600">{u.lastActive}</td>
                        <td className="py-3 px-3 text-right">
                          <RowActionsMenu
                            items={
                              u.status === 'Invited'
                                ? [
                                    { label: 'Copy Invite Link', icon: Copy, onClick: () => handleCopyInviteLink(u.id) },
                                    { label: 'Resend Invite', icon: Mail, onClick: () => handleResendInvite(u.id) },
                                  ]
                                : u.status === 'Active'
                                ? [{ label: 'Suspend Access', icon: PauseCircle, danger: true, onClick: () => handleUpdateUserStatus(u.id, 'Suspended') }]
                                : [{ label: 'Reactivate User', icon: PlayCircle, onClick: () => handleUpdateUserStatus(u.id, 'Active') }]
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR AREA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#0D1F3D] border-b border-slate-100 pb-3">User Seats & Usage</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={seatChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {seatChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xs font-extrabold text-[#0D1F3D] leading-tight">{members.length} / {seatLimit}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                    {seatLimit > 0 ? Math.round((members.length / seatLimit) * 100) : 0}% Used
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-indigo-600" /> Active Users</span>
                  <span className="font-extrabold text-[#0D1F3D]">{activeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-blue-500" /> Invited</span>
                  <span className="font-extrabold text-[#0D1F3D]">{invitedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-rose-500" /> Suspended</span>
                  <span className="font-extrabold text-[#0D1F3D]">{suspendedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-slate-300" /> Available Seats</span>
                  <span className="font-extrabold text-[#0D1F3D]">{availableSeats}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite User to Tenant Workspace"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 font-sans">
          <div className="space-y-3">
            <Input label="Full Name *" placeholder="Enter full name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            <Input label="Email Address *" type="email" placeholder="user@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <Select
              label="Role *"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              searchable={true}
              options={[
                { value: 'Field Executive', label: 'Field Executive' },
                { value: 'Sales Manager', label: 'Sales Manager' },
                { value: 'Team Leader', label: 'Team Leader' },
                { value: 'Tenant Admin', label: 'Tenant Admin' },
              ]}
            />
            <Select
              label="Department / Zone *"
              value={inviteDept}
              onChange={(e) => setInviteDept(e.target.value)}
              searchable={true}
              options={[
                { value: 'Field Operations', label: 'Field Operations' },
                { value: 'Sales', label: 'Sales' },
                { value: 'Operations', label: 'Operations' },
                { value: 'Customer Support', label: 'Customer Support' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button type="submit" variant="accent" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Send Invitation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
