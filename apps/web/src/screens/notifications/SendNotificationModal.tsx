import {
  Layers,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SearchInput,
  cn,
} from "ui";
import trurootLogo from "../../assets/truroot-logo.png";
import { api } from "../../common/api";

interface SendNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editData?: {
    id?: string;
    title?: string;
    message?: string;
    type?: string;
    targetType?: "ALL" | "ROLE" | "TEAM" | "INDIVIDUAL";
    targetRole?: string;
    targetTeamId?: string;
    recipientIds?: string[];
    sendPush?: boolean;
    sendWhatsApp?: boolean;
  } | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  fullName: string;
  role: string;
  email?: string;
  avatarUrl?: string;
}

const ROLE_OPTIONS = [
  { label: "Sales Agents", value: "SALES_AGENT" },
  { label: "Telecallers", value: "TELECALLER" },
  { label: "Sales Managers", value: "SALES_MANAGER" },
  { label: "Team Leaders", value: "TEAM_LEADER" },
  { label: "Marketing Team", value: "MARKETING" },
  { label: "Admins & Executives", value: "ADMIN" },
];

export function SendNotificationModal({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: SendNotificationModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [targetType, setTargetType] = useState<
    "ALL" | "ROLE" | "TEAM" | "INDIVIDUAL"
  >("ALL");
  const [targetRole, setTargetRole] = useState("SALES_AGENT");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendPush, setSendPush] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || "");
      setMessage(editData.message || "");
      setType(editData.type || "announcement");
      setTargetType(editData.targetType || "ALL");
      setTargetRole(editData.targetRole || "SALES_AGENT");
      setTargetTeamId(editData.targetTeamId || "");
      setSelectedUserIds(editData.recipientIds || []);
      setSendPush(editData.sendPush !== false);
      setSendWhatsApp(editData.sendWhatsApp !== false);
    } else {
      resetForm();
    }
  }, [editData, open]);

  useEffect(() => {
    if (!open) return;
    setIsLoadingOptions(true);
    Promise.all([
      api
        .get<{ data: TeamOption[] }>("/teams")
        .catch(() => ({ data: { data: [] } })),
      api
        .get<{ data: UserOption[] }>("/notifications/recipients")
        .catch(() =>
          api
            .get<{ data: UserOption[] }>("/employees")
            .catch(() => ({ data: { data: [] } })),
        ),
    ])
      .then(([teamsRes, usersRes]) => {
        const teamList =
          teamsRes.data?.data ||
          (Array.isArray(teamsRes.data) ? teamsRes.data : []);
        const userList =
          usersRes.data?.data ||
          (Array.isArray(usersRes.data) ? usersRes.data : []);
        setTeams(teamList);
        setUsers(userList);
        if (teamList.length > 0 && !targetTeamId) {
          setTargetTeamId(teamList[0].id);
        }
      })
      .finally(() => setIsLoadingOptions(false));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Notification Title is required");
      return;
    }
    if (!message.trim()) {
      toast.error("Notification Message is required");
      return;
    }
    if (targetType === "TEAM" && !targetTeamId) {
      toast.error("Please select a target team");
      return;
    }
    if (targetType === "INDIVIDUAL" && selectedUserIds.length === 0) {
      toast.error("Please select at least one employee recipient");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetType,
        targetRole: targetType === "ROLE" ? targetRole : undefined,
        targetTeamId: targetType === "TEAM" ? targetTeamId : undefined,
        targetUserIds:
          targetType === "INDIVIDUAL" ? selectedUserIds : undefined,
        sendPush,
        sendWhatsApp,
      };

      const res = await api.post<{
        recipientCount: number;
        pushCount: number;
        message: string;
      }>("/notifications/send", payload);

      toast.success(
        res.data?.message ||
          `Broadcast sent to ${res.data?.recipientCount || 1} recipient(s)!`,
      );

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send notification";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("announcement");
    setTargetType("ALL");
    setTargetRole("SALES_AGENT");
    setSelectedUserIds([]);
    setSearchUserQuery("");
    setSendPush(true);
    setSendWhatsApp(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const filteredUsers = users.filter((u) => {
    if (!searchUserQuery.trim()) return true;
    const q = searchUserQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const selectAllFilteredUsers = () => {
    const allFilteredIds = filteredUsers.map((u) => u.id);
    const combined = Array.from(
      new Set([...selectedUserIds, ...allFilteredIds]),
    );
    setSelectedUserIds(combined);
  };

  const clearUserSelection = () => {
    setSelectedUserIds([]);
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] w-full h-[85vh] max-h-[660px] flex flex-col p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-border [&>button]:hidden">
        {/* Header - Fixed Height */}
        <DialogHeader className="shrink-0 p-5 border-b border-border bg-white flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 p-1.5 flex items-center justify-center border border-border shrink-0">
              <img
                src={trurootLogo}
                alt="Truroot Realty"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-secondary flex items-center gap-2">
                {editData
                  ? "Edit & Resend Notification"
                  : "Create & Broadcast Notification"}
              </DialogTitle>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                Send in-app and mobile FCM push alerts to your team.
              </p>
            </div>
          </div>
          <DialogClose className="rounded-lg p-1.5 opacity-70 transition-opacity hover:opacity-100 hover:bg-slate-100">
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {/* Form Container - Flex column to fill fixed modal container */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0 bg-white"
        >
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
            {/* Notification Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary flex items-center gap-1">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Sales Meeting at 4:00 PM"
                className="w-full h-10 px-3.5 text-xs font-semibold rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Type & Target Recipients */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary">
                  Category / Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="announcement">📢 Announcement</option>
                  <option value="alert">⚠️ Urgent Alert</option>
                  <option value="reminder">⏰ Reminder</option>
                  <option value="system">⚙️ System Update</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary">
                  Target Recipients
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="ALL">🌐 All Employees ({users.length})</option>
                  <option value="ROLE">👔 Specific Role</option>
                  <option value="TEAM">👥 Specific Team</option>
                  <option value="INDIVIDUAL">👤 Selected Employees</option>
                </select>
              </div>
            </div>

            {/* Conditional Target Options */}
            {targetType === "ROLE" && (
              <div className="space-y-2 p-4 bg-slate-50/80 rounded-xl border border-border">
                <label className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Select Role
                  Group
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "TEAM" && (
              <div className="space-y-2 p-4 bg-slate-50/80 rounded-xl border border-border">
                <label className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Select Team
                </label>
                {teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-semibold">
                    {isLoadingOptions
                      ? "Loading teams..."
                      : "No teams available."}
                  </p>
                ) : (
                  <select
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Premium Selected Employees Dropdown Container */}
            {targetType === "INDIVIDUAL" && (
              <div className="space-y-3 p-4 bg-slate-50/90 rounded-2xl border border-border/80 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs font-extrabold text-secondary">
                      Select Recipient Employees
                    </span>
                    <Badge
                      variant="neutral"
                      className="bg-primary/10 text-primary border-0 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full"
                    >
                      {selectedUserIds.length} selected
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={selectAllFilteredUsers}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearUserSelection}
                      className="text-muted-foreground hover:text-secondary transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <SearchInput
                    autoComplete="off"
                    name="recipientEmployeeSearchQuery"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Search employees by name, role, or email..."
                    className="h-10 text-xs font-semibold rounded-xl border border-border bg-white shadow-none pr-8"
                  />
                  {searchUserQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchUserQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-secondary hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scrollable Employee Directory Cards */}
                <div className="h-44 overflow-y-auto space-y-1.5 bg-white p-2 border border-border rounded-xl shadow-inner">
                  {isLoadingOptions ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-semibold gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />{" "}
                      Loading directory...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
                      No active employees match your search.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleUserSelection(u.id)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border",
                            isSelected
                              ? "bg-primary/5 border-primary/30 text-secondary"
                              : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200",
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Functional Checkbox */}
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleUserSelection(u.id);
                              }}
                              className="shrink-0 cursor-pointer"
                            />

                            {/* Avatar & Info */}
                            {u.avatarUrl || (u as any).image || (u as any).avatar ? (
                              <img
                                src={u.avatarUrl || (u as any).image || (u as any).avatar}
                                alt={u.fullName}
                                className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                  const sibling = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                  if (sibling) sibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-black text-secondary items-center justify-center shrink-0",
                                (u.avatarUrl || (u as any).image || (u as any).avatar) ? "hidden" : "flex",
                              )}
                            >
                              {getInitials(u.fullName)}
                            </div>

                            <div className="truncate">
                              <div className="text-[12px] font-extrabold text-secondary truncate leading-tight">
                                {u.fullName}
                              </div>
                              {u.email && (
                                <div className="text-[11px] font-semibold text-muted-foreground truncate">
                                  {u.email}
                                </div>
                              )}
                            </div>
                          </div>

                          <Badge
                            variant="neutral"
                            className="text-[10px] uppercase font-extrabold bg-slate-100 text-slate-600 border-0 px-2 py-0.5 rounded-md shrink-0"
                          >
                            {u.role?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary flex items-center gap-1">
                Message Body <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type the detailed notification message to deliver..."
                className="w-full p-3.5 text-xs font-semibold rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
            </div>

            {/* FCM Mobile Push Toggle */}
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                  <Smartphone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-secondary">
                    Send Mobile Push Notification (FCM)
                  </h4>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    Delivers instant push popups with Truroot logo to mobile
                    devices.
                  </p>
                </div>
              </div>
              <Checkbox
                checked={sendPush}
                onChange={(e) => setSendPush(e.currentTarget.checked)}
              />
            </div>

            {/* Send WhatsApp Notification Toggle */}
            <div className="p-4 border border-emerald-500/20 bg-emerald-50/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-secondary">
                    Send WhatsApp Notification
                  </h4>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    Delivers instant WhatsApp text messages via WABA Pinbot API to recipients.
                  </p>
                </div>
              </div>
              <Checkbox
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.currentTarget.checked)}
              />
            </div>
          </div>

          {/* Fixed Footer Action Bar */}
          <div className="shrink-0 px-6 py-4 border-t border-border bg-slate-50/80 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-5 font-bold text-xs rounded-xl bg-white border-slate-200 shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 font-extrabold text-xs bg-primary text-white hover:bg-primary/90 rounded-xl shadow-sm min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-2" />{" "}
                  {editData ? "Resend Notification" : "Send Notification"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
