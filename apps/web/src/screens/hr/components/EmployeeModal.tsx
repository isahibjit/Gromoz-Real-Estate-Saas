import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogContent,
  Input,
  MultiSelect,
  SearchableSelect,
} from "ui";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  EyeOff,
  Network,
  ShieldCheck,
  Trophy,
  UserPlus,
} from "lucide-react";
import { ImageCropModal } from "./ImageCropModal";
import { api } from "../../../common/api";
import {
  WorkspaceAccessEditor,
  type AccessModuleDefinition,
} from "../../../common/access/WorkspaceAccessEditor";
import { PermissionEditor } from "../../../common/access/PermissionEditor";
import { PageVisibilityEditor } from "../../../common/access/PageVisibilityEditor";
import { RankingTeamAccessEditor } from "../../../common/access/RankingTeamAccessEditor";
import {
  TeamLeaderMonitorAccessEditor,
  type MonitorEmployeeOption,
} from "../../../common/access/TeamLeaderMonitorAccessEditor";
import {
  LeadVisibilityAccessEditor,
  type LeadVisibilityEmployeeOption,
} from "../../../common/access/LeadVisibilityAccessEditor";
import type { ModulePermission } from "@truroot/shared/auth";

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  joiningDate: string;
  image?: string;
  designation?: string;
  monthlyBasic?: number;
  justificationMultiplier?: number;
  justificationMode?: "MULTIPLIER" | "MANUAL";
  justificationAmount?: number;
  reportingManagerId?: string;
  manager?: string;
  teamId?: string;
  teamName?: string;
  leaderOfTeamId?: string | null;
  leaderOfTeamName?: string | null;
  leaderOfTeamIds?: string[];
  leaderOfTeamNames?: string[];
  isTeamLeader?: boolean;
  shiftId?: string | null;
  shiftName?: string | null;
  shift?: {
    id: string;
    name: string;
    startTimeMinutes: number;
    endTimeMinutes: number;
    lateGraceMinutes: number;
    lateThresholdCount: number;
    latePenaltyStatus: string;
    isActive: boolean;
  } | null;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  password?: string;
  permissions?: ModulePermission[];
  isAccessCustomized?: boolean;
  rankingTeamIds?: string[];
  rankingTeams?: Array<{ id: string; name: string }>;
  managedTeamIds?: string[];
  managedTeams?: Array<{
    id: string;
    name: string;
    code?: string;
    leaderId?: string;
    leaderName?: string | null;
  }>;
  isRankingAccessCustomized?: boolean;
  monitorTeamIds?: string[];
  monitorTeams?: Array<{ id: string; name: string }>;
  monitorUserIds?: string[];
  monitorUsers?: Array<{ id: string; name: string; email?: string | null }>;
  leadVisibilityAllowedUserIds?: string[];
  leadVisibilityAllowedUsers?: Array<{
    id: string;
    name: string;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  }>;
  leadVisibilityBlockedUserIds?: string[];
  leadVisibilityBlockedUsers?: Array<{
    id: string;
    name: string;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  }>;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Partial<Employee>) => Promise<boolean>;
  employee?: Employee | null;
}

type ManagerOption = {
  id: string;
  name: string;
  email?: string;
  role: string;
  image?: string | null;
  employeeCode?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  reportingToId?: string | null;
  leaderOfTeamId?: string | null;
  leaderOfTeamIds?: string[];
};
type TeamOption = {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  leaderId?: string | null;
  leader?: {
    id: string;
    fullName?: string | null;
    role?: string;
    isActive?: boolean;
  } | null;
};

type ShiftOption = {
  id: string;
  name: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  lateGraceMinutes: number;
  lateThresholdCount: number;
  latePenaltyStatus: string;
  isActive: boolean;
};

type AccessTemplate = {
  role: string;
  permissions: ModulePermission[];
};

const adminReportingRoles = new Set(["ADMIN", "SUPER_ADMIN"]);
const teamLeaderReportingRoles = new Set(["MANAGER", "SALES_MANAGER"]);
const staffReportingRoles = new Set(["TEAM_LEADER"]);

const roleForHierarchy = (role?: string) =>
  role === "FIELD_EXECUTIVE" ? "SALES_AGENT" : role ?? "";

const reportingRolesForRole = (role?: string) => {
  const normalizedRole = roleForHierarchy(role);
  if (normalizedRole === "MANAGER" || normalizedRole === "SALES_MANAGER") {
    return adminReportingRoles;
  }
  if (normalizedRole === "TEAM_LEADER") {
    return teamLeaderReportingRoles;
  }
  if (
    normalizedRole === "TELECALLER" ||
    normalizedRole === "SALES_AGENT" ||
    normalizedRole === "MARKETING" ||
    normalizedRole === "BACKEND"
  ) {
    return staffReportingRoles;
  }
  if (normalizedRole === "HR") {
    return adminReportingRoles;
  }
  return new Set<string>();
};

const reportingDescriptionForRole = (role?: string) => {
  const normalizedRole = roleForHierarchy(role);
  if (normalizedRole === "MANAGER" || normalizedRole === "SALES_MANAGER") {
    return "Managers report to admins.";
  }
  if (normalizedRole === "TEAM_LEADER") {
    return "Team Leaders report to managers.";
  }
  if (normalizedRole === "TELECALLER" || normalizedRole === "SALES_AGENT") {
    return "Pre Sales and Sales Executives can report to a Team Leader.";
  }
  if (normalizedRole === "MARKETING") {
    return "This role can report to a Team Leader.";
  }
  if (normalizedRole === "BACKEND") {
    return "Back-End Executive can report to a Team Leader or Manager.";
  }
  if (normalizedRole === "HR") {
    return "HR can report to an admin.";
  }
  return "No reporting manager is required for this role.";
};

const initialFormData: Partial<Employee> = {
  fullName: "",
  role: "TELECALLER",
  email: "",
  phone: "",
  phoneCountryCode: "+91",
  joiningDate: new Date().toISOString().split("T")[0],
  image: "",
  designation: "",
  monthlyBasic: 0,
  justificationMultiplier: 0,
  justificationMode: "MULTIPLIER",
  justificationAmount: 0,
  reportingManagerId: "",
  manager: "",
  teamId: "",
  leaderOfTeamId: "",
  leaderOfTeamName: "",
  shiftId: "",
  shiftName: "",
  twoFactorEnabled: false,
  password: "",
  permissions: [],
  rankingTeamIds: [],
  managedTeamIds: [],
  monitorTeamIds: [],
  monitorUserIds: [],
  leadVisibilityAllowedUserIds: [],
  leadVisibilityBlockedUserIds: [],
};

const inputClassName =
  "h-11 rounded-md border-slate-200 bg-white font-semibold text-secondary placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary";

const fieldLabelClassName =
  "modal-label text-[12px] font-semibold text-secondary";

const countryCodeOptions = [
  { value: "+91", label: "+91", country: "India" },
  { value: "+1", label: "+1", country: "US / Canada" },
  { value: "+44", label: "+44", country: "United Kingdom" },
  { value: "+971", label: "+971", country: "UAE" },
  { value: "+61", label: "+61", country: "Australia" },
  { value: "+65", label: "+65", country: "Singapore" },
] as const;

const roleSelectOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "TELECALLER", label: "Pre Sales Executive" },
  { value: "FIELD_EXECUTIVE", label: "Sales Executive" },
  { value: "BACKEND", label: "Back-End Executive" },
  { value: "HR", label: "HR" },
];

const justificationModeOptions = [
  { value: "MULTIPLIER", label: "Use salary multiplier" },
  { value: "MANUAL", label: "Enter manual target" },
];

function splitEmployeePhone(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  const matchedOption = countryCodeOptions.find((option) =>
    trimmed.startsWith(option.value),
  );

  if (!trimmed) {
    return { phoneCountryCode: "+91", phone: "" };
  }

  if (matchedOption) {
    return {
      phoneCountryCode: matchedOption.value,
      phone: trimmed.slice(matchedOption.value.length).replace(/\D/g, ""),
    };
  }

  return {
    phoneCountryCode: "+91",
    phone: trimmed.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
  };
}

function composeEmployeePhone(countryCode?: string, phone?: string) {
  const normalizedCode =
    countryCodeOptions.find((option) => option.value === countryCode)?.value ??
    "+91";
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits ? `${normalizedCode} ${digits}` : "";
}

const getInitials = (name?: string) => {
  if (!name?.trim()) {
    return "AR";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const formatShiftTime = (minutes?: number) => {
  if (minutes === undefined) {
    return "--:--";
  }
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ModalSection({
  icon,
  title,
  description,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-md border border-slate-200 bg-white p-4 sm:p-5 ${className}`}
    >
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-secondary">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-extrabold text-secondary">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function OverviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-secondary">
        {value}
      </p>
    </div>
  );
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employee,
}) => {
  const generatedId = useId();
  const [formData, setFormData] = useState<Partial<Employee>>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const [imageError, setImageError] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<ManagerOption[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [accessModules, setAccessModules] = useState<AccessModuleDefinition[]>(
    [],
  );
  const [accessTemplates, setAccessTemplates] = useState<AccessTemplate[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [customizeAccess, setCustomizeAccess] = useState(false);
  const [customizeTab, setCustomizeTab] = useState<"modules" | "pages">(
    "modules",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
  const [pendingCropFileName, setPendingCropFileName] = useState("");
  useEffect(() => {
    if (employee) {
      const phoneParts = splitEmployeePhone(employee.phone);
      setFormData({
        ...employee,
        ...phoneParts,
        joiningDate: employee.joiningDate
          ? employee.joiningDate.slice(0, 10)
          : new Date().toISOString().split("T")[0],
        teamId: employee.teamId || "",
        leaderOfTeamId: employee.leaderOfTeamId || "",
        leaderOfTeamName: employee.leaderOfTeamName || "",
        shiftId: employee.shiftId || employee.shift?.id || "",
        shiftName: employee.shiftName || employee.shift?.name || "",
        justificationMode: employee.justificationMode ?? "MULTIPLIER",
        justificationAmount: Number(employee.justificationAmount ?? 0),
        twoFactorEnabled: Boolean(employee.twoFactorEnabled),
        password: employee.password || "ChangeMe@123",
        permissions: employee.permissions ?? [],
        rankingTeamIds:
          employee.rankingTeamIds ??
          employee.rankingTeams?.map((team) => team.id) ??
          [],
        managedTeamIds:
          employee.managedTeamIds ??
          employee.managedTeams?.map((team) => team.id) ??
          [],
        monitorTeamIds:
          employee.monitorTeamIds ??
          employee.monitorTeams?.map((team) => team.id) ??
          [],
        monitorUserIds:
          employee.monitorUserIds ??
          employee.monitorUsers?.map((user) => user.id) ??
          [],
        leadVisibilityAllowedUserIds:
          employee.leadVisibilityAllowedUserIds ??
          employee.leadVisibilityAllowedUsers?.map((user) => user.id) ??
          [],
        leadVisibilityBlockedUserIds:
          employee.leadVisibilityBlockedUserIds ??
          employee.leadVisibilityBlockedUsers?.map((user) => user.id) ??
          [],
      });
      setCustomizeAccess(
        Boolean(employee.isAccessCustomized || employee.permissions?.length),
      );
      setImageFileName(employee.image ? "Current employee photo" : "");
    } else {
      setFormData({
        ...initialFormData,
        joiningDate: new Date().toISOString().split("T")[0],
      });
      setCustomizeAccess(false);
      setImageFileName("");
    }
    setImageError("");
    setIsDraggingImage(false);
    setPendingCropImage(null);
    setPendingCropFileName("");
    setShowPassword(false);
    setErrors({});
  }, [employee, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadManagersAndTeams = async () => {
      setIsLoadingManagers(true);
      setIsLoadingTeams(true);
      setIsLoadingShifts(true);
      setIsLoadingAccess(true);
      try {
        const loadAllEmployees = async () => {
          const firstPage = await api.get<{
            data: Employee[];
            meta?: { total?: number };
          }>("/employees", { params: { page: 1, limit: 100 } });
          const firstRows = firstPage.data?.data ?? [];
          const total = Number(firstPage.data?.meta?.total ?? firstRows.length);
          const pageCount = Math.ceil(total / 100);
          if (pageCount <= 1) return firstPage;

          const remainingPages = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              api.get<{ data: Employee[] }>("/employees", {
                params: { page: index + 2, limit: 100 },
              }),
            ),
          );
          return {
            ...firstPage,
            data: {
              ...firstPage.data,
              data: [
                ...firstRows,
                ...remainingPages.flatMap(
                  (response) => response.data?.data ?? [],
                ),
              ],
            },
          };
        };

        const [managersRes, teamsRes, shiftsRes, modulesRes, templatesRes] =
          await Promise.all([
            loadAllEmployees(),
            api.get<{ data: any[] }>("/teams"),
            api.get<{ data: ShiftOption[] }>("/shifts"),
            api.get<{ data: AccessModuleDefinition[] }>("/access/modules"),
            api.get<{ data: AccessTemplate[] }>("/access/templates"),
          ]);
        if (isMounted) {
          const managers = (managersRes.data?.data || [])
            .filter((m: any) =>
              [
                "ADMIN",
                "HR",
                "SALES_MANAGER",
                "TEAM_LEADER",
                "MANAGER",
              ].includes(String(m.role)),
            )
            .map((m: any) => ({
              id: m.id,
              name: m.fullName || m.name,
              email: m.email,
              role: m.role,
              image: m.image ?? null,
              employeeCode: m.employeeCode ?? null,
              teamId: m.teamId ?? null,
              teamName: m.teamName ?? null,
              reportingToId: m.reportingToId ?? null,
              leaderOfTeamId: m.leaderOfTeamId ?? null,
              leaderOfTeamIds: m.leaderOfTeamIds ?? [],
            }));
          const employees = (managersRes.data?.data || []).map((m: any) => ({
            id: m.id,
            name: m.fullName || m.name || m.email || "Unnamed employee",
            email: m.email,
            role: m.role,
            image: m.image ?? null,
            employeeCode: m.employeeCode ?? null,
            teamId: m.teamId ?? null,
            teamName: m.teamName ?? null,
            reportingToId: m.reportingToId ?? null,
            leaderOfTeamId: m.leaderOfTeamId ?? null,
            leaderOfTeamIds: m.leaderOfTeamIds ?? [],
          }));
          setManagerOptions(managers);
          setEmployeeOptions(employees);
          setTeamOptions(teamsRes.data?.data || []);
          setShiftOptions(shiftsRes.data?.data || []);
          setAccessModules(modulesRes.data?.data || []);
          setAccessTemplates(templatesRes.data?.data || []);
        }
      } catch {
        if (isMounted) {
          setManagerOptions([]);
          setEmployeeOptions([]);
          setTeamOptions([]);
          setShiftOptions([]);
          setAccessModules([]);
          setAccessTemplates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingManagers(false);
          setIsLoadingTeams(false);
          setIsLoadingShifts(false);
          setIsLoadingAccess(false);
        }
      }
    };

    loadManagersAndTeams();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const readImageFile = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPG, PNG, or WebP images are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Keep the employee photo under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingCropImage(reader.result as string);
      setPendingCropFileName(file.name);
      setImageError("");
    };
    reader.onerror = () => {
      setImageError("Could not read that image. Try another file.");
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setFormData((current) => ({ ...current, image: croppedDataUrl }));
    setImageFileName(pendingCropFileName);
    setPendingCropImage(null);
    setPendingCropFileName("");
  };

  const handleCropCancel = () => {
    setPendingCropImage(null);
    setPendingCropFileName("");
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readImageFile(file);
    }
    event.target.value = "";
  };

  const handleImageDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      readImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((current) => ({ ...current, image: "" }));
    setImageFileName("");
    setImageError("");
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName?.trim())
      newErrors.fullName = "Full name is required.";

    if (!formData.email?.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Email address must contain an '@' symbol.";
    }

    if (formData.phone?.trim()) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length < 6 || phoneDigits.length > 15) {
        newErrors.phone = "Enter a valid phone number between 6 and 15 digits.";
      }
    }

    if (!formData.role) {
      newErrors.role = "Role designation is required.";
    }

    if (
      roleForHierarchy(formData.role) === "TEAM_LEADER" &&
      !formData.leaderOfTeamId
    ) {
      newErrors.leaderOfTeamId = "Assign a team to the Team Leader.";
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const roleForAccessTemplate = (role?: string) =>
    role === "FIELD_EXECUTIVE" ? "SALES_AGENT" : role || "TELECALLER";

  const permissionsForRole = (role?: string) =>
    accessTemplates.find(
      (template) => template.role === roleForAccessTemplate(role),
    )?.permissions ?? [];

  const accessPermissionModules = accessModules.filter(
    (module) => module.kind !== "page",
  );





  const accessPageModules = accessModules.filter(
    (module) => module.kind === "page",
  );

  const normalizedPermissions = (permissions: ModulePermission[]) =>
    accessModules.map(
      (module) =>
        permissions.find(
          (permission) => permission.moduleKey === module.key,
        ) ?? {
          moduleKey: module.key,
          canView: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canPunchIn: false,
          canPunchOut: false,
        },
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      let imageUrl = formData.image;
      if (formData.image && formData.image.startsWith("data:image/")) {
        const fileToUpload = dataURLtoFile(
          formData.image,
          imageFileName || "avatar.png",
        );
        const uploadForm = new FormData();
        uploadForm.append("file", fileToUpload);
        const uploadRes = await api.post<{ url: string }>(
          "/uploads/images",
          uploadForm,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        imageUrl = uploadRes.data.url;
      }

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone:
          composeEmployeePhone(formData.phoneCountryCode, formData.phone) ||
          undefined,
        role:
          formData.role === "FIELD_EXECUTIVE" ? "SALES_AGENT" : formData.role,
        designation: formData.designation || undefined,
        joiningDate: formData.joiningDate,
        monthlyBasic: Number(formData.monthlyBasic || 0),
        justificationMultiplier: Number(formData.justificationMultiplier || 0),
        justificationMode: formData.justificationMode ?? "MULTIPLIER",
        justificationAmount: Number(formData.justificationAmount || 0),
        reportingToId: formData.reportingManagerId || undefined,
        teamId:
          (formData.role === "TELECALLER" ||
            formData.role === "FIELD_EXECUTIVE" ||
            formData.role === "BACKEND" ||
            formData.role === "MARKETING") &&
          formData.teamId &&
          formData.teamId !== "none"
            ? formData.teamId
            : undefined,
        leaderOfTeamId: isTeamLeaderRole
          ? formData.leaderOfTeamId || null
          : null,
        shiftId:
          formData.shiftId && formData.shiftId !== "none"
            ? formData.shiftId
            : null,
        image: imageUrl || undefined,
        password: formData.password?.trim() || undefined,
        twoFactorEnabled: Boolean(formData.twoFactorEnabled),
        permissions: customizeAccess
          ? normalizedPermissions(formData.permissions ?? [])
          : [],
        rankingTeamIds: formData.rankingTeamIds ?? [],
        managedTeamIds: isManagerRole ? formData.managedTeamIds ?? [] : [],
        monitorTeamIds: formData.monitorTeamIds ?? [],
        monitorUserIds: formData.monitorUserIds ?? [],
        leadVisibilityAllowedUserIds:
          formData.leadVisibilityAllowedUserIds ?? [],
        leadVisibilityBlockedUserIds:
          formData.leadVisibilityBlockedUserIds ?? [],
      };

      const didSave = await onSave(payload);
      if (didSave) {
        onClose();
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        if (Array.isArray(msg)) {
          const validationErrors: Record<string, string> = {};
          msg.forEach((m: string) => {
            const field = m.split(" ")[0];
            if (field) validationErrors[field] = m;
          });
          setErrors(validationErrors);
        } else {
          setErrors({ general: msg });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedReportingRoles = reportingRolesForRole(formData.role);
  const reportingManagerOptions = managerOptions.filter(
    (manager) =>
      manager.id !== employee?.id && allowedReportingRoles.has(manager.role),
  );
  const selectedManagerExists = reportingManagerOptions.some(
    (manager) => manager.id === formData.reportingManagerId,
  );
  const selectedTeamExists = teamOptions.some(
    (team) => team.id === formData.teamId,
  );
  const selectedShiftExists = shiftOptions.some(
    (shift) => shift.id === formData.shiftId,
  );
  const selectedShift =
    shiftOptions.find((shift) => shift.id === formData.shiftId) ??
    (formData.shiftId
      ? {
          id: formData.shiftId,
          name: formData.shiftName || "Assigned shift",
          startTimeMinutes: employee?.shift?.startTimeMinutes,
          endTimeMinutes: employee?.shift?.endTimeMinutes,
          lateGraceMinutes: 0,
          lateThresholdCount: 0,
          latePenaltyStatus: "",
          isActive: true,
        }
      : null);
  const selectedShiftLabel = selectedShift
    ? `${selectedShift.name}${
        selectedShift.startTimeMinutes !== undefined &&
        selectedShift.endTimeMinutes !== undefined
          ? ` (${formatShiftTime(
              selectedShift.startTimeMinutes,
            )} - ${formatShiftTime(selectedShift.endTimeMinutes)})`
          : ""
      }`
    : "No shift assigned";
  const defaultRolePermissions = normalizedPermissions(
    permissionsForRole(formData.role),
  );
  const effectiveDraftPermissions = normalizedPermissions(
    formData.permissions?.length
      ? formData.permissions
      : defaultRolePermissions,
  );
  const monitorEmployeeOptions: MonitorEmployeeOption[] = employeeOptions
    .filter((manager) => manager.id !== employee?.id)
    .map((manager) => ({
      id: manager.id,
      name: manager.name || manager.email || "Unnamed employee",
      email: manager.email,
      image: manager.image ?? null,
    }));
  const leadVisibilityEmployeeOptions: LeadVisibilityEmployeeOption[] =
    employeeOptions.map((option) => ({
      id: option.id,
      name: option.name || option.email || "Unnamed employee",
      email: option.email,
      role: option.role,
      image: option.image ?? null,
      teamId: option.teamId ?? null,
      teamName: option.teamName ?? null,
      reportingToId: option.reportingToId ?? null,
      leaderOfTeamId: option.leaderOfTeamId ?? null,
      leaderOfTeamIds: option.leaderOfTeamIds ?? [],
    }));

  const isTelecaller = formData.role === "TELECALLER";
  const isFieldExec = formData.role === "FIELD_EXECUTIVE";
  const isBackend = formData.role === "BACKEND";
  const isMarketing = formData.role === "MARKETING";
  const isTeamLeaderRole = roleForHierarchy(formData.role) === "TEAM_LEADER";
  const isManagerRole = teamLeaderReportingRoles.has(
    roleForHierarchy(formData.role),
  );
  const managedTeamOptions = teamOptions
    .filter(
      (team) =>
        team.isActive !== false &&
        Boolean(team.leaderId) &&
        team.leader?.role === "TEAM_LEADER" &&
        team.leader.isActive !== false,
    )
    .map((team) => ({
      value: team.id,
      label: `${team.name} (${team.code}) - ${
        team.leader?.fullName || "Team Leader"
      }`,
    }));
  const teamLeaderTeamOptions = teamOptions
    .filter(
      (team) =>
        team.isActive !== false &&
        (!team.leaderId || team.leaderId === employee?.id),
    )
    .map((team) => ({
      value: team.id,
      label: `${team.name} (${team.code})`,
      description:
        team.leaderId === employee?.id ? "Current assigned team" : "Available",
    }));
  const canSelectReportingManager = allowedReportingRoles.size > 0;
  const usesManualJustification = formData.justificationMode === "MANUAL";
  const monthlyJustificationTarget = usesManualJustification
    ? Number(formData.justificationAmount || 0)
    : Number(formData.monthlyBasic || 0) *
      Number(formData.justificationMultiplier || 0);
  const overviewName = formData.fullName?.trim() || "New employee";
  const overviewRole =
    roleSelectOptions.find((option) => option.value === formData.role)?.label ||
    String(formData.role || "Role not selected");
  const overviewManager =
    formData.manager?.trim() ||
    reportingManagerOptions.find(
      (manager) => manager.id === formData.reportingManagerId,
    )?.name ||
    "No manager";
  const overviewTeam = isTeamLeaderRole
    ? formData.leaderOfTeamName?.trim() ||
      teamOptions.find((team) => team.id === formData.leaderOfTeamId)?.name ||
      "No assigned team"
    : formData.teamName?.trim() ||
      teamOptions.find((team) => team.id === formData.teamId)?.name ||
      "No primary team";
  const overviewAccess = customizeAccess ? "Custom access" : "Role default";
  const overviewMonitorScope =
    (formData.monitorTeamIds?.length ?? 0) +
    (formData.monitorUserIds?.length ?? 0);
  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,1180px)] max-w-none flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-0 shadow-none">
          <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-secondary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-headline text-xl font-extrabold tracking-tight text-secondary sm:text-2xl">
                  {employee ? "Edit employee details" : "Add new employee"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Configure profile, team access, login security, and payroll
                  settings.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-5 p-4 lg:grid-cols-[260px_minmax(0,1fr)] sm:p-6">
                <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-base font-extrabold text-secondary">
                        {formData.image ? (
                          <img
                            src={formData.image}
                            alt=""
                            className="block h-full w-full object-cover object-center"
                          />
                        ) : (
                          getInitials(formData.fullName)
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-secondary">
                          {overviewName}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                          {formData.email || "Email pending"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <OverviewItem label="Role" value={overviewRole} />
                      <OverviewItem label="Reports to" value={overviewManager} />
                      <OverviewItem
                        label={isTeamLeaderRole ? "Assigned team" : "Primary team"}
                        value={overviewTeam}
                      />
                      <OverviewItem label="Access mode" value={overviewAccess} />
                    </div>

                    {isTeamLeaderRole ? (
                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-bold text-muted-foreground">
                          Monitor scope
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-secondary">
                          {overviewMonitorScope
                            ? `${overviewMonitorScope} extra ${
                                overviewMonitorScope === 1 ? "scope" : "scopes"
                              }`
                            : "Direct teams only"}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      <div>
                        <p className="text-sm font-extrabold text-secondary">
                          {formData.joiningDate || "Joining date pending"}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                          {selectedShiftLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="space-y-5">
                  {errors.general && (
                    <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600">
                      {errors.general}
                    </div>
                  )}

              <ModalSection
                icon={<BadgeCheck className="h-4 w-4" />}
                title="Profile and contact"
                description="Set the employee identity, contact number used for OTP, and joining details."
              >
                <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isSubmitting}
                      className="sr-only"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleImageDrop}
                      disabled={isSubmitting}
                      className={`flex min-h-[188px] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed p-4 text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        isDraggingImage
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-xl font-extrabold text-secondary">
                        {formData.image ? (
                          <img
                            src={formData.image}
                            alt="Employee preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(formData.fullName)
                        )}
                      </span>
                      <span className="space-y-1">
                        <span className="block text-sm font-bold text-secondary">
                          {formData.image ? "Change photo" : "Upload photo"}
                        </span>
                        <span className="block text-[11px] font-medium leading-relaxed text-muted-foreground">
                          JPG, PNG, or WebP under 5 MB.
                        </span>
                      </span>
                    </button>

                    <div className="flex min-h-5 items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs font-semibold text-muted-foreground/60">
                        {imageFileName || "No photo selected"}
                      </p>
                      {formData.image && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={isSubmitting}
                          className="shrink-0 text-xs font-semibold text-red-500 transition-colors hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {imageError && (
                      <p className="text-xs font-semibold text-red-500">
                        {imageError}
                      </p>
                    )}
                  </div>

                  <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
                    <label
                      className="space-y-2 sm:col-span-2"
                      htmlFor={`${generatedId}-fullName`}
                    >
                      <span className={fieldLabelClassName}>Full name</span>
                      <Input
                        id={`${generatedId}-fullName`}
                        value={formData.fullName || ""}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            fullName: event.target.value,
                          })
                        }
                        placeholder="e.g. Megha Jain"
                        className={inputClassName}
                        disabled={isSubmitting}
                        required
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.fullName}
                        </p>
                      )}
                    </label>

                    <label
                      className="space-y-2 sm:col-span-2"
                      htmlFor={`${generatedId}-email`}
                    >
                      <span className={fieldLabelClassName}>Email address</span>
                      <Input
                        id={`${generatedId}-email`}
                        type="email"
                        value={formData.email || ""}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            email: event.target.value,
                          })
                        }
                        placeholder="name@truroot.in"
                        className={inputClassName}
                        disabled={isSubmitting}
                        required
                      />
                      {errors.email && (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.email}
                        </p>
                      )}
                    </label>

                    <div className="space-y-2 sm:col-span-2">
                      <span className={fieldLabelClassName}>Contact phone</span>
                      <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <SearchableSelect
                          value={formData.phoneCountryCode || "+91"}
                          onValueChange={(value) =>
                            setFormData((current) => ({
                              ...current,
                              phoneCountryCode: value,
                            }))
                          }
                          options={countryCodeOptions.map((option) => ({
                            value: option.value,
                            label: `${option.label} ${option.country}`,
                          }))}
                          placeholder="+91"
                          searchPlaceholder="Search country code..."
                          className="h-11 min-w-0 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                          disabled={isSubmitting}
                          modal
                        />
                        <Input
                          id={`${generatedId}-phone`}
                          aria-label="Contact phone number"
                          inputMode="tel"
                          autoComplete="tel-national"
                          value={formData.phone || ""}
                          onChange={(event) => {
                            const onlyDigits = event.target.value.replace(
                              /\D/g,
                              "",
                            );
                            setFormData({ ...formData, phone: onlyDigits });
                          }}
                          placeholder="9876543210"
                          className={inputClassName}
                          disabled={isSubmitting}
                          maxLength={15}
                        />
                      </div>
                      <p className="text-[11px] font-semibold leading-5 text-muted-foreground">
                        Used for SMS OTP and employee contact. Select the
                        country code first.
                      </p>
                      {errors.phone && (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <span className={fieldLabelClassName}>Joining date</span>
                      <DatePicker
                        value={formData.joiningDate}
                        onChange={(event) => {
                          setFormData({
                            ...formData,
                            joiningDate: event.target.value,
                          });
                        }}
                        disabled={isSubmitting}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </ModalSection>

              <ModalSection
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                title="Role, payroll and security"
                description="Define the employee role, shift, login requirements, salary, and justification target."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className={fieldLabelClassName}>
                      Role designation
                    </span>
                    <SearchableSelect
                      value={String(formData.role || "")}
                      onValueChange={(value) => {
                        const nextReportingRoles = reportingRolesForRole(value);
                        const currentManager = managerOptions.find(
                          (manager) =>
                            manager.id === formData.reportingManagerId,
                        );
                        const keepReportingManager = Boolean(
                          currentManager &&
                            nextReportingRoles.has(currentManager.role),
                        );
                        const nextIsTeamLeaderRole =
                          roleForHierarchy(value) === "TEAM_LEADER";
                        const nextIsManagerRole = teamLeaderReportingRoles.has(
                          roleForHierarchy(value),
                        );

                        setFormData({
                          ...formData,
                          role: value,
                          teamId:
                            value === "TELECALLER" ||
                            value === "FIELD_EXECUTIVE"
                              ? formData.teamId
                              : "",
                          reportingManagerId: keepReportingManager
                            ? formData.reportingManagerId
                            : "",
                          manager: keepReportingManager ? formData.manager : "",
                          monitorTeamIds: nextIsTeamLeaderRole
                            ? formData.monitorTeamIds
                            : [],
                          monitorUserIds: nextIsTeamLeaderRole
                            ? formData.monitorUserIds
                            : [],
                          managedTeamIds: nextIsManagerRole
                            ? formData.managedTeamIds
                            : [],
                          leaderOfTeamId: nextIsTeamLeaderRole
                            ? formData.leaderOfTeamId
                            : "",
                          leaderOfTeamName: nextIsTeamLeaderRole
                            ? formData.leaderOfTeamName
                            : "",
                          permissions: permissionsForRole(value),
                        });
                      }}
                      options={roleSelectOptions}
                      placeholder="Select role"
                      searchPlaceholder="Search role..."
                      className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                      disabled={isSubmitting}
                      modal
                    />
                    {errors.role && (
                      <p className="mt-1 text-[11px] font-bold text-red-500">
                        {errors.role}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        className={fieldLabelClassName}
                        htmlFor={`${generatedId}-password`}
                      >
                        {employee ? "Employee password" : "Login password"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none"
                      >
                        {showPassword ? (
                          <>
                            <EyeOff className="size-3.5" />
                            <span>Hide password</span>
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" />
                            <span>Show password</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id={`${generatedId}-password`}
                        type={showPassword ? "text" : "password"}
                        value={formData.password || ""}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            password: event.target.value,
                          })
                        }
                        placeholder={
                          employee
                            ? "Employee password"
                            : "Default: ChangeMe@123"
                        }
                        className={`${inputClassName} pr-10 font-mono`}
                        disabled={isSubmitting}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        title={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {employee
                        ? "View the employee password or enter a new one to update it."
                        : "Leave blank to create the employee with the default temporary password (ChangeMe@123)."}
                    </p>
                    {errors.password && (
                      <p className="mt-1 text-[11px] font-bold text-red-500">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className={fieldLabelClassName}>Assigned shift</span>
                    <SearchableSelect
                      value={formData.shiftId || "none"}
                      onValueChange={(value) => {
                        const selectedShift = shiftOptions.find(
                          (shift) => shift.id === value,
                        );
                        setFormData({
                          ...formData,
                          shiftId: value === "none" ? "" : value,
                          shiftName:
                            value === "none" ? "" : selectedShift?.name || "",
                        });
                      }}
                      options={[
                        { value: "none", label: "No shift assigned" },
                        ...(formData.shiftId &&
                        !selectedShiftExists &&
                        formData.shiftName
                          ? [
                              {
                                value: formData.shiftId,
                                label: formData.shiftName,
                              },
                            ]
                          : []),
                        ...shiftOptions.map((shift) => ({
                          value: shift.id,
                          label: shift.name,
                          description: `${formatShiftTime(
                            shift.startTimeMinutes,
                          )} - ${formatShiftTime(shift.endTimeMinutes)}`,
                        })),
                      ]}
                      placeholder={
                        isLoadingShifts ? "Loading..." : selectedShiftLabel
                      }
                      searchPlaceholder="Search shift..."
                      className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                      disabled={isLoadingShifts || isSubmitting}
                      modal
                    />
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Shift timing controls punch-in grace, late counts, and
                      half-day rules.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`${generatedId}-designation`}>
                      <span className={fieldLabelClassName}>
                        Employee title / Designation
                      </span>
                      <Input
                        id={`${generatedId}-designation`}
                        value={formData.designation || ""}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            designation: event.target.value,
                          })
                        }
                        placeholder="e.g. Pre Sales Executive"
                        className={inputClassName}
                        disabled={isSubmitting}
                      />
                    </label>
                    {errors.designation && (
                      <p className="mt-1 text-[11px] font-bold text-red-500">
                        {errors.designation}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                    <label
                      htmlFor={`${generatedId}-two-factor`}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={`${generatedId}-two-factor`}
                        checked={Boolean(formData.twoFactorEnabled)}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            twoFactorEnabled: event.currentTarget.checked,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                      <span>
                        <span className="block text-sm font-bold text-secondary">
                          Require OTP after password login
                        </span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-muted-foreground">
                          This employee must verify SMS OTP after entering the
                          correct password.
                        </span>
                      </span>
                    </label>
                  </div>

                  <label
                    className="space-y-2"
                    htmlFor={`${generatedId}-monthlyBasic`}
                  >
                    <span className={fieldLabelClassName}>
                      Base monthly salary (INR)
                    </span>
                    <Input
                      id={`${generatedId}-monthlyBasic`}
                      type="number"
                      min="0"
                      value={formData.monthlyBasic ?? 0}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          monthlyBasic: Number(event.target.value),
                        })
                      }
                      placeholder="42000"
                      className={inputClassName}
                      disabled={isSubmitting}
                    />
                    {errors.monthlyBasic && (
                      <p className="mt-1 text-[11px] font-bold text-red-500">
                        {errors.monthlyBasic}
                      </p>
                    )}
                  </label>

                  <div className="space-y-2">
                    <label
                      className={fieldLabelClassName}
                      htmlFor={`${generatedId}-justificationMode`}
                    >
                      Justification method
                    </label>
                    <SearchableSelect
                      value={formData.justificationMode ?? "MULTIPLIER"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          justificationMode:
                            value === "MANUAL" ? "MANUAL" : "MULTIPLIER",
                        })
                      }
                      options={justificationModeOptions}
                      placeholder="Select method"
                      searchPlaceholder="Search method..."
                      className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary"
                      disabled={isSubmitting}
                      modal
                    />
                  </div>

                  {usesManualJustification ? (
                    <label
                      className="space-y-2 sm:col-span-2"
                      htmlFor={`${generatedId}-justificationAmount`}
                    >
                      <span className={fieldLabelClassName}>
                        Manual justification target (INR)
                      </span>
                      <Input
                        id={`${generatedId}-justificationAmount`}
                        type="number"
                        min="0"
                        value={formData.justificationAmount ?? 0}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            justificationAmount: Number(event.target.value),
                          })
                        }
                        placeholder="150000"
                        className={inputClassName}
                        disabled={isSubmitting}
                      />
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Monthly justification target: INR{" "}
                        {Math.round(monthlyJustificationTarget).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                      {errors.justificationAmount && (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.justificationAmount}
                        </p>
                      )}
                    </label>
                  ) : (
                    <label
                      className="space-y-2 sm:col-span-2"
                      htmlFor={`${generatedId}-justificationMultiplier`}
                    >
                      <span className={fieldLabelClassName}>
                        Justification multiplier
                      </span>
                      <Input
                        id={`${generatedId}-justificationMultiplier`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.justificationMultiplier ?? 0}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            justificationMultiplier: Number(event.target.value),
                          })
                        }
                        placeholder="3"
                        className={inputClassName}
                        disabled={isSubmitting}
                      />
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Monthly justification target: INR{" "}
                        {Math.round(monthlyJustificationTarget).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                      {errors.justificationMultiplier && (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.justificationMultiplier}
                        </p>
                      )}
                    </label>
                  )}
                </div>
              </ModalSection>

              <ModalSection
                icon={<Network className="h-4 w-4" />}
                title="Reporting hierarchy"
                description="Set who this employee reports to and which team they belong to."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {canSelectReportingManager ? (
                    <div className="space-y-2">
                      <span className={fieldLabelClassName}>
                        Reporting manager
                      </span>
                      <SearchableSelect
                        value={formData.reportingManagerId || "none"}
                        onValueChange={(value) => {
                          if (value === "none") {
                            setFormData({
                              ...formData,
                              reportingManagerId: "",
                              manager: "",
                            });
                            return;
                          }
                          const selected = reportingManagerOptions.find(
                            (manager) => manager.id === value,
                          );
                          setFormData({
                            ...formData,
                            reportingManagerId: value,
                            manager: selected?.name || "",
                          });
                        }}
                        options={[
                          {
                            value: "none",
                            label: "No reporting manager",
                            description: reportingDescriptionForRole(
                              formData.role,
                            ),
                          },
                          ...(formData.reportingManagerId &&
                          !selectedManagerExists &&
                          formData.manager
                            ? [
                                {
                                  value: formData.reportingManagerId,
                                  label: formData.manager,
                                  description: "Current manager",
                                },
                              ]
                            : []),
                          ...reportingManagerOptions.map((manager) => ({
                            value: manager.id,
                            label: manager.name,
                            description: `${
                              manager.employeeCode ?? "No code"
                            } - ${manager.email || manager.role}`,
                            avatarUrl: manager.image ?? undefined,
                          })),
                        ]}
                        placeholder={
                          isLoadingManagers ? "Loading..." : "Select manager"
                        }
                        searchPlaceholder="Search manager..."
                        noOptionsText="No eligible reporting managers found."
                        className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                        disabled={isLoadingManagers || isSubmitting}
                        modal
                      />
                      <p className="text-[11px] font-semibold leading-5 text-muted-foreground">
                        {reportingDescriptionForRole(formData.role)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-bold text-secondary">
                        No reporting manager required
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                        This role sits at the top of its reporting chain.
                      </p>
                    </div>
                  )}

                  {(isTelecaller || isFieldExec || isBackend || isMarketing) && (
                    <div className="space-y-2">
                      <span className={fieldLabelClassName}>
                        Primary team
                      </span>
                      <SearchableSelect
                        value={formData.teamId || "none"}
                        onValueChange={(value) => {
                          const selectedTeam = teamOptions.find(
                            (team) => team.id === value,
                          );
                          setFormData({
                            ...formData,
                            teamId: value === "none" ? "" : value,
                            teamName:
                              value === "none" ? "" : selectedTeam?.name ?? "",
                          });
                        }}
                        options={[
                          { value: "none", label: "Unassigned" },
                          ...(formData.teamId &&
                          !selectedTeamExists &&
                          formData.teamName
                            ? [
                                {
                                  value: formData.teamId,
                                  label: formData.teamName,
                                },
                              ]
                            : []),
                          ...teamOptions.map((team) => ({
                            value: team.id,
                            label: `${team.name} (${team.code})`,
                          })),
                        ]}
                        placeholder={
                          isLoadingTeams ? "Loading..." : "Select team"
                        }
                        searchPlaceholder="Search team..."
                        className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                        disabled={isLoadingTeams || isSubmitting}
                        modal
                      />
                      {errors.teamId && (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.teamId}
                        </p>
                      )}
                    </div>
                  )}

                  {isTeamLeaderRole ? (
                    <div className="space-y-2">
                      <span className={fieldLabelClassName}>
                        Assigned team <span className="text-red-500">*</span>
                      </span>
                      <SearchableSelect
                        value={formData.leaderOfTeamId || ""}
                        onValueChange={(value) => {
                          const selectedTeam = teamOptions.find(
                            (team) => team.id === value,
                          );
                          setFormData((current) => ({
                            ...current,
                            leaderOfTeamId: value,
                            leaderOfTeamName: selectedTeam?.name ?? "",
                          }));
                          setErrors((current) => {
                            const nextErrors = { ...current };
                            delete nextErrors.leaderOfTeamId;
                            return nextErrors;
                          });
                        }}
                        options={teamLeaderTeamOptions}
                        placeholder={
                          isLoadingTeams
                            ? "Loading..."
                            : "Select an available team"
                        }
                        searchPlaceholder="Search available teams..."
                        noOptionsText="No active teams without a Team Leader found."
                        ariaLabel="Assigned team"
                        className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                        disabled={isLoadingTeams || isSubmitting}
                        modal
                      />
                      <p className="text-[11px] font-semibold leading-5 text-muted-foreground">
                        Only active teams without another Team Leader are available.
                      </p>
                      {errors.leaderOfTeamId ? (
                        <p className="mt-1 text-[11px] font-bold text-red-500">
                          {errors.leaderOfTeamId}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {isManagerRole ? (
                    <div className="space-y-2 sm:col-span-2">
                      <span className={fieldLabelClassName}>Assigned teams</span>
                      <MultiSelect
                        value={formData.managedTeamIds ?? []}
                        onValueChange={(managedTeamIds) =>
                          setFormData((current) => ({
                            ...current,
                            managedTeamIds,
                          }))
                        }
                        options={managedTeamOptions}
                        placeholder={
                          isLoadingTeams ? "Loading..." : "Select teams"
                        }
                        searchPlaceholder="Search teams..."
                        noOptionsText="No active teams with a Team Leader found."
                        selectedLabelText="team"
                        selectedLabelTextPlural="teams"
                        ariaLabel="Assigned teams"
                        className="h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary focus:border-primary"
                        disabled={isLoadingTeams || isSubmitting}
                        modal
                      />
                      <p className="text-[11px] font-semibold leading-5 text-muted-foreground">
                        Selecting a team assigns its current Team Leader to this
                        manager. Removing it clears that reporting relationship.
                      </p>
                    </div>
                  ) : null}

                  {isTeamLeaderRole ? (
                    <div className="sm:col-span-2">
                      <TeamLeaderMonitorAccessEditor
                        teams={teamOptions}
                        employees={monitorEmployeeOptions}
                        teamIds={formData.monitorTeamIds ?? []}
                        userIds={formData.monitorUserIds ?? []}
                        onTeamIdsChange={(monitorTeamIds) =>
                          setFormData((current) => ({
                            ...current,
                            monitorTeamIds,
                          }))
                        }
                        onUserIdsChange={(monitorUserIds) =>
                          setFormData((current) => ({
                            ...current,
                            monitorUserIds,
                          }))
                        }
                        disabled={isLoadingTeams || isSubmitting}
                        className="bg-slate-50"
                      />
                    </div>
                  ) : null}
                </div>
              </ModalSection>

              <LeadVisibilityAccessEditor
                employees={leadVisibilityEmployeeOptions}
                viewerId={employee?.id ?? null}
                viewerRole={formData.role ?? null}
                allowedUserIds={formData.leadVisibilityAllowedUserIds ?? []}
                blockedUserIds={formData.leadVisibilityBlockedUserIds ?? []}
                onAllowedUserIdsChange={(leadVisibilityAllowedUserIds) =>
                  setFormData((current) => ({
                    ...current,
                    leadVisibilityAllowedUserIds,
                    leadVisibilityBlockedUserIds: (
                      current.leadVisibilityBlockedUserIds ?? []
                    ).filter(
                      (userId) =>
                        !leadVisibilityAllowedUserIds.includes(userId),
                    ),
                  }))
                }
                onBlockedUserIdsChange={(leadVisibilityBlockedUserIds) =>
                  setFormData((current) => ({
                    ...current,
                    leadVisibilityBlockedUserIds,
                    leadVisibilityAllowedUserIds: (
                      current.leadVisibilityAllowedUserIds ?? []
                    ).filter(
                      (userId) =>
                        !leadVisibilityBlockedUserIds.includes(userId),
                    ),
                  }))
                }
                disabled={isLoadingManagers || isSubmitting}
              />

              <ModalSection
                icon={<Trophy className="h-4 w-4" />}
                title="Performance ranking visibility"
                description="Configure which teams' leaderboards and ranking performance this employee can view."
              >
                <RankingTeamAccessEditor
                  teams={teamOptions}
                  value={formData.rankingTeamIds ?? []}
                  onChange={(rankingTeamIds) =>
                    setFormData((current) => ({ ...current, rankingTeamIds }))
                  }
                  assignedTeamId={formData.teamId}
                  assignedTeamName={formData.teamName}
                  disabled={isLoadingTeams || isSubmitting}
                  className="bg-slate-50"
                />
              </ModalSection>

              <ModalSection
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Access and modules"
                description="Apply role defaults or customize the employee's module permissions."
              >
                <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      Access mode
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {customizeAccess
                        ? "Custom access will override the selected role template."
                        : `${roleForAccessTemplate(
                            formData.role,
                          )} role defaults will be applied.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-md px-3 text-xs shadow-none"
                      disabled={isLoadingAccess || isSubmitting}
                      onClick={() => {
                        const next = !customizeAccess;
                        setCustomizeAccess(next);
                        setFormData((current) => ({
                          ...current,
                          permissions: next
                            ? normalizedPermissions(
                                current.permissions?.length
                                  ? current.permissions
                                  : permissionsForRole(current.role),
                              )
                            : [],
                        }));
                      }}
                    >
                      {customizeAccess
                        ? "Use role default"
                        : "Customize access"}
                    </Button>
                    {customizeAccess ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-md px-3 text-xs shadow-none"
                        disabled={isLoadingAccess || isSubmitting}
                        onClick={() =>
                          setFormData((current) => ({
                            ...current,
                            permissions: permissionsForRole(current.role),
                          }))
                        }
                      >
                        Reset template
                      </Button>
                    ) : null}
                  </div>
                </div>

                {customizeAccess ? (
                  <div className="mt-4 space-y-3">
                    <WorkspaceAccessEditor
                      modules={accessModules}
                      permissions={effectiveDraftPermissions}
                      role={roleForAccessTemplate(formData.role)}
                      disabled={isLoadingAccess || isSubmitting}
                      compact
                      onChange={(permissions) =>
                        setFormData((current) => ({
                          ...current,
                          permissions,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </ModalSection>
            </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-white p-5 justify-end sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="h-11 px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="h-11 px-6"
              >
                {isSubmitting
                  ? "Saving..."
                  : employee
                  ? "Save changes"
                  : "Create employee"}
              </Button>
            </div>
          </form>
        </DialogContent>

        <ImageCropModal
          isOpen={pendingCropImage !== null}
          imageSrc={pendingCropImage || ""}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          cropShape="round"
          aspect={1}
        />
      </Dialog>
    </>
  );
};
