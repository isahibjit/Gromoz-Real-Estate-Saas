import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Users,
  TrendingUp,
  Search,
  RotateCcw,
  Download,
  Plus,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Layers,
  PauseCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "../../common/api";
import { Button, Card, Input, Badge } from "ui";
import { ProvisionTenantModal } from "./ProvisionTenantModal";

interface TenantOrg {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "TRIAL" | "SETUP_PENDING" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  planTier: "STARTER" | "GROWTH" | "ENTERPRISE";
  setupFeePaid: boolean;
  allocatedSeats: number;
  pricePerSeatMonth?: number;
  customDomain?: string;
  activeMembers: number;
  leadsCount: number;
  projectsCount: number;
  createdAt: string;
}

export function AllTenantsScreen() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Tenant Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".tenant-action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get("/organizations/platform-metrics");
      setTenants(res.data.organizations || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load tenant organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleAccessTenant = (tenant: TenantOrg) => {
    localStorage.setItem("active_organization_id", tenant.id);
    toast.success(`Accessed ${tenant.name}'s workspace`);
    window.location.href = "/admin/dashboard";
  };

  const handleUpdateStatus = async (tenantId: string, newStatus: string) => {
    try {
      await api.patch(`/organizations/tenant-status/${tenantId}`, {
        id: tenantId,
        status: newStatus,
      });
      toast.success(`Tenant status updated to ${newStatus}`);
      fetchTenants();
      setActiveMenuId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update tenant status");
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        searchTerm === "" ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customDomain && t.customDomain.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchPlan = selectedPlan === "All" || t.planTier === selectedPlan;
      const matchStatus = selectedStatus === "All" || t.status === selectedStatus;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [tenants, searchTerm, selectedPlan, selectedStatus]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPlan, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTenants.slice(start, start + pageSize);
  }, [filteredTenants, currentPage, pageSize]);

  // Compute KPIs
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const trialTenants = tenants.filter((t) => t.status === "TRIAL" || t.status === "SETUP_PENDING").length;
  const suspendedTenants = tenants.filter((t) => t.status === "SUSPENDED").length;
  const totalUsers = tenants.reduce((sum, t) => sum + (t.activeMembers || 0), 0);
  const totalSeats = tenants.reduce((sum, t) => sum + (t.allocatedSeats || 1), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">Active</span>;
      case "TRIAL":
        return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">Trial</span>;
      case "SETUP_PENDING":
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">Setup Pending</span>;
      case "PAST_DUE":
        return <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700 border border-orange-200">Past Due</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">Suspended</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{status}</span>;
    }
  };

  const getPlanBadge = (tier: string) => {
    switch (tier) {
      case "STARTER":
        return <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">Starter</span>;
      case "GROWTH":
        return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">Growth</span>;
      case "ENTERPRISE":
        return <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">Enterprise</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{tier}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-primary">Tenant Organizations</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Manage, provision, monitor, and directly access all tenant workspaces across the platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTenants}
            className="gap-2 font-bold text-slate-700"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 font-bold bg-primary text-white hover:bg-[#132d56] shadow-xs"
          >
            <Plus className="h-4 w-4" /> Provision Tenant
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Tenants</p>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-primary mt-2">{totalTenants}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Customer Workspaces</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Active Tenants</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{activeTenants}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            {totalTenants > 0 ? `${((activeTenants / totalTenants) * 100).toFixed(0)}% active` : "0%"}
          </p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Trial / Pending</p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{trialTenants}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Evaluating / Setup</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Suspended</p>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-rose-700 mt-2">{suspendedTenants}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Access Locked</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Active CRM Users</p>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">{totalUsers}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Total Agents</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Allocated Seats</p>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-700 mt-2">{totalSeats}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Licensed Capacity</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants by name, slug, domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="h-10 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
            >
              <option value="All">All Plans</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SETUP_PENDING">Setup Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedPlan("All");
                setSelectedStatus("All");
              }}
              className="gap-2 font-bold text-slate-700 h-10"
            >
              <RotateCcw className="h-4 w-4 text-slate-400" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Tenants Table Container with Fixed Min Height Layout */}
      <div className="rounded-sm border border-slate-200 bg-white shadow-xs min-h-[580px] flex flex-col justify-between overflow-hidden">
        <div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">Tenant Workspaces Directory</h3>
            <span className="text-xs font-medium text-slate-500">
              Showing <strong className="text-primary">{filteredTenants.length}</strong> of{" "}
              <strong className="text-primary">{totalTenants}</strong> tenants
            </span>
          </div>

          <div className="overflow-x-auto min-h-[440px] pb-32">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-primary">
                  <th className="py-3 px-4 w-8">#</th>
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Slug / Subdomain</th>
                  <th className="py-3 px-4">Commercial Plan</th>
                  <th className="py-3 px-4">Users / Seats</th>
                  <th className="py-3 px-4">Leads / Inventory</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-slate-500">
                      <div className="inline-block animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-3" />
                      <p className="text-xs font-semibold">Loading tenant directory...</p>
                    </td>
                  </tr>
                ) : paginatedTenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-slate-500">
                      <Building2 className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-primary">No tenant organizations found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting search filters or provision a new tenant.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTenants.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 text-slate-400 font-semibold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary text-white font-extrabold shadow-2xs group-hover:bg-[#1e3b6a] transition">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-primary group-hover:text-blue-600 transition flex items-center gap-1.5">
                              {t.name}
                              <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition" />
                            </p>
                            <p className="text-[11px] font-medium text-slate-400">
                              {t.customDomain || `${t.slug}.gromoze.com`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800">
                        {t.slug}
                      </td>
                      <td className="py-3.5 px-4">{getPlanBadge(t.planTier)}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{t.activeMembers}</span>
                        <span className="text-slate-400 text-[11px]"> / {t.allocatedSeats} seats</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">{t.leadsCount} leads</span>
                        <span className="text-slate-400 text-[11px]"> • {t.projectsCount} projects</span>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                            className="inline-flex items-center gap-1 rounded-sm bg-slate-100 hover:bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                            title="View Tenant Workspace Overview"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAccessTenant(t)}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                            title="Open Tenant Workspace"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Access Workspace
                          </button>

                          <div className="relative tenant-action-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === t.id ? null : t.id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeMenuId === t.id && (
                              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-sm border border-slate-200 bg-white p-1.5 shadow-2xl font-sans text-left animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/superadmin/tenants/${t.id}`);
                                  }}
                                  className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                                >
                                  <Eye className="h-4 w-4 text-slate-500" /> View Overview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAccessTenant(t)}
                                  className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  <ExternalLink className="h-4 w-4 text-blue-600" /> Access Workspace
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(t.slug);
                                    toast.success(`Copied slug: ${t.slug}`);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Copy className="h-4 w-4 text-slate-400" /> Copy Slug
                                </button>
                                {t.status === "ACTIVE" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(t.id, "SUSPENDED")}
                                    className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-t border-slate-100"
                                  >
                                    <PauseCircle className="h-4 w-4 text-rose-600" /> Suspend Workspace
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(t.id, "ACTIVE")}
                                    className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 border-t border-slate-100"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Activate Workspace
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Footer / Pagination Controls */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>
              Showing {filteredTenants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredTenants.length)} of {filteredTenants.length} entries
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs font-bold text-slate-700"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="px-2 font-bold text-primary">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs font-bold text-slate-700"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Provision Tenant Modal */}
      <ProvisionTenantModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTenantCreated={fetchTenants}
      />
    </div>
  );
}
