import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getUserRoleLabel } from "../../common/roleLabels";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  SearchableSelect,
  cn,
} from "ui";
import {
  Calendar,
  CalendarCheck,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "../../common/api";
import { Team } from "./components/TeamModal";
import { HrEmployeeIdentityCell } from "./components/HrEmployeeIdentityCell";
import toast from "react-hot-toast";

interface EmployeeOption {
  id: string;
  fullName: string;
  email?: string | null;
  role: string;
  image?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  teamId?: string | null;
  teamName?: string | null;
}

function initials(name?: string | null) {
  return (name ?? "Employee")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function HrTeamDetailsScreen() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "attendance">("members");
  const [selectedNewMemberId, setSelectedNewMemberId] = useState<string>("none");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Attendance filter state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchTeamDetails = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const [teamRes, employeesRes, attendanceRes] = await Promise.all([
        api.get<Team>(`/teams/${teamId}`),
        api.get<{ data: EmployeeOption[] }>("/employees", {
          params: { limit: 1000, status: "Active" },
        }),
        api.get<{ data: any[] }>("/attendance", {
          params: { month, year },
        }),
      ]);
      setTeam(teamRes.data);
      setEmployees(employeesRes.data.data);
      setAttendanceRecords(attendanceRes.data.data);
    } catch (error) {
      console.error("Failed to load team details", error);
      toast.error("Failed to load team details");
      navigate("/admin/teams");
    } finally {
      setIsLoading(false);
    }
  }, [teamId, month, year, navigate]);

  useEffect(() => {
    fetchTeamDetails();
  }, [fetchTeamDetails]);

  
  const handleAddMember = async () => {
    if (!teamId || selectedNewMemberId === "none" || isSubmittingMember) return;
    setIsSubmittingMember(true);
    try {
      await api.post(`/teams/${teamId}/members`, {
        memberUserId: selectedNewMemberId,
      });
      toast.success("Member added to team");
      setSelectedNewMemberId("none");
      fetchTeamDetails();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to add member");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!teamId) return;
    try {
      await api.delete(`/teams/${teamId}/members/${memberUserId}`);
      toast.success("Member removed from team");
      fetchTeamDetails();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  };

  // Filter out candidates for members (active Pre Sales users or field execs with no team)
  const memberCandidates = useMemo(() => {
    return employees.filter(
      (emp) =>
        (emp.role === "TELECALLER" || emp.role === "SALES_AGENT") &&
        !emp.teamId
    );
  }, [employees]);

  // Filter attendance records to only show for current team members
  const teamAttendance = useMemo(() => {
    const memberIds = new Set(team?.members?.map((m) => m.user.id) || []);
    return attendanceRecords.filter((record) => memberIds.has(record.employeeId));
  }, [attendanceRecords, team]);

  const memberOptions = useMemo(
    () =>
      memberCandidates.map((emp) => ({
        value: emp.id,
        label: emp.fullName,
        description: [
          emp.employeeCode,
          emp.email,
          emp.role === "SALES_AGENT" ? "Sales Executive" : emp.role,
        ]
          .filter(Boolean)
          .join(" - "),
        avatarUrl: emp.image ?? undefined,
      })),
    [memberCandidates],
  );

  const selectedMember = useMemo(
    () => memberCandidates.find((employee) => employee.id === selectedNewMemberId),
    [memberCandidates, selectedNewMemberId],
  );

  const activeMembers = useMemo(
    () => team?.members?.filter((member) => member.user.isActive).length ?? 0,
    [team?.members],
  );

  const fieldExecutives = useMemo(
    () =>
      team?.members?.filter((member) => member.user.role === "SALES_AGENT")
        .length ?? 0,
    [team?.members],
  );

  const telecallers = useMemo(
    () =>
      team?.members?.filter((member) => member.user.role === "TELECALLER")
        .length ?? 0,
    [team?.members],
  );

  const presentAttendance = useMemo(
    () =>
      teamAttendance.filter((record) =>
        String(record.status ?? "").toLowerCase().includes("present"),
      ).length,
    [teamAttendance],
  );

  const dateLabel = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  const formatRole = getUserRoleLabel;

  const memberCount = team?.members?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 font-semibold text-muted-foreground text-sm">Loading team details...</span>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-bold text-muted-foreground">Team not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 2xl:px-8">
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/admin/teams")}
              aria-label="Back to teams"
              className="h-10 w-10 shrink-0 rounded-md border-slate-200 shadow-none"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold text-secondary">
                  {team.name}
                </h1>
                <Badge
                  className={cn(
                    "border-0",
                    team.isActive
                      ? "bg-green-50 text-success"
                      : "bg-red-50 text-red-600",
                  )}
                >
                  {team.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Code: {team.code}
              </p>
              {team.description ? (
                <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
                  {team.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-white text-xs font-extrabold text-secondary ring-1 ring-slate-200">
                {team.leader?.avatarStorageKey ? (
                  <img
                    src={team.leader.avatarStorageKey}
                    alt={team.leader.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(team.leader?.fullName ?? "TL")
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  Team leader
                </p>
                <p className="text-sm font-extrabold text-secondary">
                  {team.leader?.fullName || "Unassigned"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Team members",
              value: String(memberCount),
              helper: `${activeMembers} active`,
              icon: Users,
            },
            {
              label: "Sales executives",
              value: String(fieldExecutives),
              helper: "Site visit owners",
              icon: UserPlus,
            },
            {
              label: "Pre Sales Executive",
              value: String(telecallers),
              helper: "Pre-sales owners",
              icon: ShieldCheck,
            },
            {
              label: "Attendance records",
              value: String(teamAttendance.length),
              helper: `${presentAttendance} present in selected month`,
              icon: CalendarCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-md border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-secondary">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {item.helper}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-primary ring-1 ring-slate-200">
                    <Icon className="size-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-secondary"
          }`}
        >
          <Users className="size-4" /> Members ({team.members?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "attendance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-secondary"
          }`}
        >
          <Calendar className="size-4" /> Attendance
        </button>
      </div>

      {activeTab === "members" && (
        <div className="space-y-5">
          <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 className="text-base font-extrabold text-secondary">
                    Add team member
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    Assign an unallocated Pre Sales Executive or sales executive to this
                    team. Team leader changes are managed from edit team.
                  </p>
                </div>
                <SearchableSelect
                  value={selectedNewMemberId === "none" ? "" : selectedNewMemberId}
                  onValueChange={(value) => setSelectedNewMemberId(value || "none")}
                  options={memberOptions}
                  placeholder="Search and choose an employee"
                  searchPlaceholder="Search by name, email, code, or role..."
                  noOptionsText="No unassigned employees found"
                  ariaLabel="Choose employee to add to team"
                  className="h-11 bg-white"
                />
                {selectedMember ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span>
                      Selected: {selectedMember.fullName}
                      {selectedMember.employeeCode
                        ? ` - ${selectedMember.employeeCode}`
                        : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto rounded-md px-2 py-1 text-xs font-bold text-primary hover:bg-orange-50"
                      onClick={() => setSelectedNewMemberId("none")}
                    >
                      Clear selection
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={handleAddMember}
                disabled={selectedNewMemberId === "none" || isSubmittingMember}
                className="h-11 rounded-md px-5 font-bold shadow-none"
              >
                <UserPlus className="mr-2 size-4" /> Add member
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-secondary">
                  Team roster
                </h2>
                <p className="text-sm font-semibold text-muted-foreground">
                  Members assigned to {team.name}.
                </p>
              </div>
              <Badge className="w-fit border-0 bg-blue-50 text-blue-700">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-bold text-secondary">Employee</TableHead>
                  <TableHead className="font-bold text-secondary">Employee Code</TableHead>
                  <TableHead className="font-bold text-secondary">Role</TableHead>
                  <TableHead className="font-bold text-secondary">Status</TableHead>
                  <TableHead className="font-bold text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members && team.members.length > 0 ? (
                  team.members.map((member) => (
                    <TableRow
                      key={member.user.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() =>
                        navigate(`/admin/employees/${member.user.id}`)
                      }
                      >
                      <TableCell className="font-bold text-secondary">
                        <HrEmployeeIdentityCell
                          fullName={member.user.fullName}
                          email={member.user.email}
                          image={member.user.avatarStorageKey ?? null}
                          href={`/admin/employees/${member.user.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {member.employeeCode || "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {formatRole(member.user.role)}
                      </TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {member.user.isActive ? (
                          <Badge className="border-0 bg-green-50 text-success">Active</Badge>
                        ) : (
                          <Badge className="border-0 bg-red-50 text-red-600">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveMember(member.user.id);
                          }}
                          className="h-8 rounded-md border-red-200 font-bold text-red-600 shadow-none hover:bg-red-50"
                        >
                          <UserMinus className="mr-1.5 size-3.5" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="mx-auto max-w-sm">
                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-primary ring-1 ring-slate-200">
                          <Users className="size-5" />
                        </span>
                        <p className="mt-3 text-sm font-extrabold text-secondary">
                          No members assigned yet
                        </p>
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">
                          Choose an employee above to start building this team.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="space-y-5">
          <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-secondary">
                  Attendance snapshot
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Review monthly attendance records for members of {team.name}.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchableSelect
                  value={String(month)}
                  onValueChange={(val) => setMonth(Number(val))}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1),
                    label: new Date(2026, i, 1).toLocaleString("en-US", {
                      month: "long",
                    }),
                  }))}
                  placeholder="Month"
                  searchPlaceholder="Search month..."
                  noOptionsText="No month found"
                  className="h-10 w-full rounded-md border-slate-200 bg-white font-semibold text-secondary shadow-none sm:w-40"
                />

                <SearchableSelect
                  value={String(year)}
                  onValueChange={(val) => setYear(Number(val))}
                  options={[2024, 2025, 2026, 2027].map((yr) => ({
                    value: String(yr),
                    label: String(yr),
                  }))}
                  placeholder="Year"
                  searchPlaceholder="Search year..."
                  noOptionsText="No year found"
                  className="h-10 w-full rounded-md border-slate-200 bg-white font-semibold text-secondary shadow-none sm:w-32"
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-bold text-secondary">Member Name</TableHead>
                  <TableHead className="font-bold text-secondary">Date</TableHead>
                  <TableHead className="font-bold text-secondary">Status</TableHead>
                  <TableHead className="font-bold text-secondary">Check-In</TableHead>
                  <TableHead className="font-bold text-secondary">Check-Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamAttendance.length > 0 ? (
                  teamAttendance.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() =>
                        record.employeeId &&
                        navigate(`/admin/employees/${record.employeeId}`)
                      }
                      >
                      <TableCell className="font-bold text-secondary">
                        <HrEmployeeIdentityCell
                          fullName={record.employee?.fullName}
                          email={record.employee?.email}
                          image={record.employee?.image}
                          href={
                            record.employeeId
                              ? `/admin/employees/${record.employeeId}`
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-secondary">
                        {dateLabel(record.attendanceDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`border-0 ${
                            record.status === "Present"
                              ? "bg-green-50 text-success"
                              : record.status === "On Leave"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-muted-foreground">
                        {record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-muted-foreground">
                        {record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="mx-auto max-w-sm">
                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-primary ring-1 ring-slate-200">
                          <Calendar className="size-5" />
                        </span>
                        <p className="mt-3 text-sm font-extrabold text-secondary">
                          No attendance records found
                        </p>
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">
                          Attendance for this team will appear here when members
                          have records in the selected month.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
