import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  TablePageSizeOptions,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchableSelect,
  Badge,
} from "ui";
import { Plus, Search, Users, ShieldAlert, Award, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { HrStatCard } from "./components/HrStatCard";

function TablePagination({ total, page, pageSize, onPageChange, onPageSizeChange, label = "records" }: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between bg-white">
      <p className="text-xs font-semibold text-secondary">
        Showing {total ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="h-8 w-8 rounded-md p-0 shadow-none" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="navy" className="h-8 w-8 rounded-md p-0 text-xs shadow-none">{page}</Button>
        <Button type="button" variant="outline" className="h-8 w-8 rounded-md p-0 shadow-none" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
        <SelectTrigger aria-label="Rows per page" className="h-8 w-[100px] rounded-md text-xs font-bold shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <TablePageSizeOptions />
        </SelectContent>
      </Select>
    </div>
  );
}
import { api } from "../../common/api";
import { TeamModal, Team } from "./components/TeamModal";
import { HrEmployeeIdentityCell } from "./components/HrEmployeeIdentityCell";
import toast from "react-hot-toast";

interface EmployeeOption {
  id: string;
  fullName: string;
  role: string;
  designation?: string | null;
  teamId?: string | null;
  teamName?: string | null;
}

export function HrTeamsScreen() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const [teamsRes, employeesRes] = await Promise.all([
        api.get<{ data: Team[] }>("/teams"),
        api.get<{ data: EmployeeOption[] }>("/employees", {
          params: { limit: 1000, status: "Active" },
        }),
      ]);
      setTeams(teamsRes.data.data);
      setEmployees(employeesRes.data.data);
    } catch (error) {
      console.error("Failed to fetch teams and employees", error);
      toast.error("Failed to load teams data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  };

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setIsTeamModalOpen(true);
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const totalTeams = teams.length;
    const activeLeaders = teams.filter((t) => t.leaderId && t.isActive).length;
    const totalAllocatedMembers = teams.reduce((acc, t) => acc + (t.members?.length ?? 0), 0);
    const unassignedTelecallers = employees.filter(
      (emp) =>
        (emp.role === "TELECALLER" || emp.role === "SALES_AGENT") &&
        !emp.teamId
    ).length;

    return {
      totalTeams,
      activeLeaders,
      totalAllocatedMembers,
      unassignedTelecallers,
    };
  }, [teams, employees]);

  // Filtering
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && team.isActive) ||
        (statusFilter === "inactive" && !team.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredTeams.length / pageSize)));
  const pagedTeams = filteredTeams.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 font-semibold text-muted-foreground text-sm">Loading teams directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-body">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary">Teams Directory</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Manage organizational teams, managers, and member assignments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleCreateTeam} className="h-11 rounded-md px-5 shadow-none">
            <Plus className="w-5 h-5" />
            Add Team
          </Button>
        </div>
      </section>

      {/* KPI Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HrStatCard
          title="Total Teams"
          value={kpis.totalTeams}
          subtitle="Configured groups"
          icon={Users}
          tone="bg-blue-50 text-blue-600"
        />
        <HrStatCard
          title="Active Leaders"
          value={kpis.activeLeaders}
          subtitle="Assigned team heads"
          icon={Award}
          tone="bg-amber-50 text-amber-600"
        />
        <HrStatCard
          title="Allocated Members"
          value={kpis.totalAllocatedMembers}
          subtitle="Mapped employees"
          icon={Users}
          tone="bg-green-50 text-success"
        />
        <HrStatCard
          title="Unassigned Agents"
          value={kpis.unassignedTelecallers}
          subtitle="Ready for allocation"
          icon={ShieldAlert}
          tone="bg-red-50 text-red-600"
        />
      </div>

      {/* Header and Controls */}
      <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 items-end gap-3">
            <label className="space-y-2 flex-1 max-w-xs">
              <span className="text-xs font-extrabold text-secondary">Search</span>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  className="pl-9 h-10 rounded-md text-xs font-bold shadow-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">Status</span>
              <SearchableSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: "all", label: "All status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                placeholder="Status"
                searchPlaceholder="Search status..."
                className="h-10 w-[140px] rounded-md text-xs font-bold shadow-none"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Teams Table */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-50 text-[11px] font-extrabold text-secondary">
              <tr>
                {["Team", "Code", "Leader", "Members", "Status", ""].map((heading) => (
                  <th key={heading} className="px-4 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Users className="size-8 text-slate-400 mb-3" />
                      <p className="text-sm font-bold text-muted-foreground">No teams found matching search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedTeams.map((team) => (
                  <tr
                    key={team.id}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => navigate(`/admin/teams/${team.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-extrabold text-secondary">{team.name}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 max-w-xs truncate">{team.description || "No description"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                      {team.code}
                    </td>
                    <td className="px-4 py-3">
                      {team.leader ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto justify-start rounded-lg px-2 py-1.5 text-left hover:bg-slate-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin/employees/${team.leader?.id}`);
                          }}
                        >
                          <HrEmployeeIdentityCell
                            fullName={team.leader.fullName}
                            email={team.leader.email}
                            image={team.leader.avatarStorageKey ?? null}
                            disabled
                          />
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-secondary">
                      {team.members?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`border-0 px-2 py-1 text-[11px] font-extrabold ${team.isActive ? "bg-green-50 text-success" : "bg-red-50 text-red-600"}`}>
                        {team.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 shadow-none"
                          onClick={() => handleEditTeam(team)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shadow-none"
                          onClick={() => navigate(`/admin/teams/${team.id}`)}
                        >
                          Members
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination total={filteredTeams.length} label="teams" page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSave={fetchTeams}
        team={selectedTeam}
      />
    </div>
  );
}
