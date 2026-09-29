import React, { useEffect, useState } from "react";
import {
  Building,
  TrendingUp,
  Users,
  ShieldCheck,
  Search,
  ExternalLink,
  DollarSign,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "ui";
import { api } from "../../common/api";

export function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organizations/platform-metrics");
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load platform metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSwitchToOrg = (orgId: string, orgName: string) => {
    localStorage.setItem("active_organization_id", orgId);
    toast.success(`Switched active workspace to ${orgName}`);
    window.location.href = "/dashboard";
  };

  const filteredOrgs = (data?.organizations || []).filter((org: any) =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Platform SuperAdmin
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SaaS Platform Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global visibility across all customer organizations, subscriptions, and revenue.
          </p>
        </div>

        <Button variant="outline" onClick={fetchMetrics}>
          Refresh Metrics
        </Button>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Organizations
            </span>
            <Building className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground">
              {overview.totalOrganizations || 0}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {overview.activeOrganizations || 0} Active • {overview.pendingSetup || 0} Pending Setup
          </p>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Active CRM Members
            </span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground">
              {overview.totalMembers || 0}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Total staff/agents across all tenants
          </p>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Revenue (INR)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-emerald-600">
              ₹{(overview.totalRevenueINR || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Setup fees + recurring seat charges
          </p>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Platform Status
            </span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-foreground">
              Healthy & Multi-Tenant
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Row-level tenant isolation active
          </p>
        </Card>
      </div>

      {/* Organizations Directory */}
      <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-border/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Customer Organizations ({filteredOrgs.length})
          </CardTitle>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search company or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase border-b border-border/50">
                <tr>
                  <th className="px-6 py-3 font-semibold">Organization</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Plan</th>
                  <th className="px-6 py-3 font-semibold">Seats / Users</th>
                  <th className="px-6 py-3 font-semibold">Leads</th>
                  <th className="px-6 py-3 font-semibold">Projects</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {filteredOrgs.length ? (
                  filteredOrgs.map((org: any) => (
                    <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-xs text-foreground">{org.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">/{org.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            org.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {org.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs capitalize font-medium">
                        {org.planTier?.toLowerCase()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-semibold">{org.activeMembers}</span>
                        <span className="text-muted-foreground"> / {org.allocatedSeats}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {org.leadsCount || 0}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {org.projectsCount || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2.5 flex items-center gap-1.5"
                          onClick={() => handleSwitchToOrg(org.id, org.name)}
                        >
                          Access Workspace
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-muted-foreground">
                      No organizations matched your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
