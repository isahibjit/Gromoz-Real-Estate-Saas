import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  SearchableSelect,
} from "ui";
import { api } from "../../../common/api";
import toast from "react-hot-toast";

export interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  leaderId?: string | null;
  leader?: {
    id: string;
    fullName: string;
    email: string;
    avatarStorageKey?: string | null;
  } | null;
  isActive: boolean;
  members?: {
    userId: string;
    employeeCode: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isActive: boolean;
      avatarStorageKey?: string | null;
    };
  }[];
}

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  team?: Team | null;
}

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

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  team,
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available options
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(team?.name ?? "");
      setCode(team?.code ?? "");
      setDescription(team?.description ?? "");
      setLeaderId(team?.leaderId ?? "none");
      setIsActive(team?.isActive ?? true);
      setErrors({});
      fetchEmployees();
    }
  }, [isOpen, team]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await api.get<{ data: EmployeeOption[] }>("/employees", {
        params: { limit: 1000, status: "Active" },
      });
      setEmployees(res.data.data);
    } catch (error) {
      console.error("Failed to load employees for dropdowns", error);
      toast.error("Failed to load employees list");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Team name is required";
    if (!code.trim()) newErrors.code = "Team code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      leaderId: leaderId === "none" ? null : leaderId,
      isActive,
    };

    try {
      if (team) {
        await api.patch(`/teams/${team.id}`, payload);
        toast.success("Team updated successfully");
      } else {
        await api.post("/teams", payload);
        toast.success("Team created successfully");
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "An error occurred";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter candidates for Team Leaders (typically employees with Team Leader in designation, or Admins, but we list all for flexibility)
  const leaderCandidates = employees.filter(
    (emp) =>
      emp.role === "ADMIN" ||
      emp.role === "SUPER_ADMIN" ||
      emp.designation?.toLowerCase().includes("leader") ||
      emp.designation?.toLowerCase().includes("tl")
  );

  // Fallback to list all employees if no specific TL designees
  const displayedLeaders = leaderCandidates.length > 0 ? leaderCandidates : employees;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-xl p-6 shadow-2xl border border-slate-100 bg-white">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-extrabold text-secondary">
            {team ? "Edit Team Details" : "Create New Team"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-secondary">Team Name *</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Alpha"
                className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary placeholder:text-slate-400 focus:border-primary transition-all"
              />
              {errors.name && (
                <span className="text-xs text-red-500 font-semibold">{errors.name}</span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-secondary">Team Code (Unique) *</span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ALPHA"
                disabled={!!team}
                className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary placeholder:text-slate-400 focus:border-primary transition-all disabled:bg-slate-50"
              />
              {errors.code && (
                <span className="text-xs text-red-500 font-semibold">{errors.code}</span>
              )}
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-secondary">Team Leader</span>
            <SearchableSelect
              value={leaderId}
              onValueChange={setLeaderId}
              options={[
                { value: "none", label: "No leader assigned" },
                ...displayedLeaders.map((emp) => ({
                  value: emp.id,
                  label: emp.fullName,
                  description: emp.email ?? emp.designation ?? emp.role,
                  avatarUrl: emp.image ?? undefined,
                })),
              ]}
              placeholder={isLoadingEmployees ? "Loading..." : "Select Team Leader"}
              searchPlaceholder="Search team leader..."
              noOptionsText="No employee found"
              disabled={isLoadingEmployees || isSubmitting}
              className="h-11 rounded-lg border border-slate-200 font-semibold text-secondary focus:border-primary"
              modal={false}
              portaled={false}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-secondary">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of the team..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-3 font-semibold text-secondary placeholder:text-slate-400 focus:border-primary focus:outline-none transition-all"
            />
          </label>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm font-bold text-secondary cursor-pointer">
              Active Team
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-lg px-6 font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 rounded-lg px-6 font-bold bg-primary text-white hover:bg-primary-hover">
              {isSubmitting ? "Saving..." : team ? "Save Changes" : "Create Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
