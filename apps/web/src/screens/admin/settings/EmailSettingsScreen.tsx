import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Plus,
  CheckCircle2,
  XCircle,
  Send,
  Trash2,
  Check,
  History,
  Key,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";
import { api } from "../../../common/api";
import { currentOrganizationId } from "../../../common/tenantRequestScope";

type EmailConnectorItem = {
  id: string;
  name: string;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName?: string;
  fromEmail: string;
  notificationEmail?: string;
  isDefault: boolean;
  isActive: boolean;
  lastTestedAt?: string;
  lastTestStatus?: string;
  createdAt: string;
  _count?: { logs: number };
};

type EmailLogItem = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  error?: string;
  sentAt: string;
  connector?: { name: string; username: string };
};

const PROVIDER_PRESETS = [
  {
    value: "gmail",
    label: "Gmail / Google Workspace",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  },
  {
    value: "outlook",
    label: "Microsoft Outlook / Office 365",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
  },
  {
    value: "custom",
    label: "Custom SMTP Server",
    host: "",
    port: 587,
    secure: false,
  },
];

export function EmailSettingsScreen() {
  const queryClient = useQueryClient();
  const organizationId = currentOrganizationId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingConnector, setEditingConnector] =
    useState<EmailConnectorItem | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingConnector, setDeletingConnector] =
    useState<EmailConnectorItem | null>(null);
  const [showGmailHelp, setShowGmailHelp] = useState(false);

  const [formState, setFormState] = useState({
    name: "Primary Gmail SMTP",
    provider: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    notificationEmail: "",
    isDefault: true,
  });

  const connectorsQuery = useQuery<EmailConnectorItem[]>({
    queryKey: ["email-connectors", organizationId],
    queryFn: async () => {
      const response = await api.get("/email-connectors");
      return response.data;
    },
  });

  const logsQuery = useQuery<EmailLogItem[]>({
    queryKey: ["email-connector-logs", organizationId],
    queryFn: async () => {
      const response = await api.get("/email-connectors/logs");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formState) => {
      if (editingConnector) {
        return (
          await api.patch(`/email-connectors/${editingConnector.id}`, payload)
        ).data;
      }
      return (await api.post("/email-connectors", payload)).data;
    },
    onSuccess: () => {
      toast.success(
        editingConnector ? "Email connector updated" : "Email connector added",
      );
      setIsAddDialogOpen(false);
      setEditingConnector(null);
      queryClient.invalidateQueries({ queryKey: ["email-connectors"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to save email connector",
      );
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async ({ id, email }: { id: string; email?: string }) => {
      return (
        await api.post(`/email-connectors/${id}/test`, {
          recipientEmail: email,
        })
      ).data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "SMTP Connection Verified!");
      queryClient.invalidateQueries({ queryKey: ["email-connectors"] });
      queryClient.invalidateQueries({ queryKey: ["email-connector-logs"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "SMTP Verification failed");
    },
    onSettled: () => {
      setTestingId(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/email-connectors/${id}/set-default`)).data;
    },
    onSuccess: () => {
      toast.success("Default email connector updated");
      queryClient.invalidateQueries({ queryKey: ["email-connectors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/email-connectors/${id}`)).data;
    },
    onSuccess: () => {
      toast.success("Email connector removed");
      queryClient.invalidateQueries({ queryKey: ["email-connectors"] });
    },
  });

  const handleProviderChange = (presetValue: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.value === presetValue);
    if (preset) {
      setFormState((prev) => ({
        ...prev,
        provider: preset.value,
        host: preset.host || prev.host,
        port: preset.port,
        secure: preset.secure,
      }));
    }
  };

  const handleEdit = (connector: EmailConnectorItem) => {
    setEditingConnector(connector);
    setFormState({
      name: connector.name,
      provider: connector.provider,
      host: connector.host,
      port: connector.port,
      secure: connector.secure,
      username: connector.username,
      password: "",
      fromName: connector.fromName || "",
      fromEmail: connector.fromEmail,
      notificationEmail: connector.notificationEmail || "",
      isDefault: connector.isDefault,
    });
    setIsAddDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingConnector(null);
    setFormState({
      name: "Primary Gmail SMTP",
      provider: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      username: "",
      password: "",
      fromName: "",
      fromEmail: "",
      notificationEmail: "",
      isDefault: true,
    });
    setIsAddDialogOpen(true);
  };

  const connectors = connectorsQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  return (
    <div className="space-y-8 p-6 font-sans text-secondary antialiased">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-start gap-3">
            <span className="flex shrink-0 size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs mt-0.5">
              <Mail className="size-5 shrink-0" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-secondary">
                Email Accounts & SMTP Settings
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                Link and verify outgoing email connectors for project brochures,
                lead follow-ups, and notifications.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={openNewDialog}
          className="h-10 shrink-0 rounded-xl px-5 text-xs font-extrabold shadow-sm"
        >
          <Plus className="mr-1.5 size-4 shrink-0" />
          Link Email Account
        </Button>
      </div>

      {/* Main Grid: Connected Accounts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {connectors.length > 0 ? (
          connectors.map((connector) => (
            <Card
              key={connector.id}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border p-6 transition-all shadow-xs hover:shadow-md",
                connector.isDefault
                  ? "border-primary/40 bg-white ring-2 ring-primary/10"
                  : "border-slate-200/90 bg-white",
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex shrink-0 size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs uppercase">
                      {connector.provider.slice(0, 2)}
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-secondary leading-tight">
                        {connector.name}
                      </h3>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {connector.username}
                      </p>
                    </div>
                  </div>

                  {connector.isDefault ? (
                    <Badge className="border-0 bg-primary/10 text-[10px] font-black text-primary">
                      Default Primary
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SMTP Server:</span>
                    <span className="font-bold text-secondary">
                      {connector.host}:{connector.port}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">From Address:</span>
                    <span className="font-bold text-secondary">
                      {connector.fromEmail}
                    </span>
                  </div>
                  {connector.notificationEmail ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Notification To:</span>
                      <span className="font-bold text-secondary">
                        {connector.notificationEmail}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Security:</span>
                    <span className="font-bold text-secondary">
                      {connector.secure
                        ? "SSL / TLS (Port 465)"
                        : "STARTTLS (Port 587)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Last Verified:
                    </span>
                    <span className="font-bold text-secondary">
                      {connector.lastTestedAt
                        ? new Date(connector.lastTestedAt).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Not verified yet"}
                    </span>
                  </div>
                </div>

                {connector.lastTestStatus ? (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 p-2.5 text-[11px] font-bold">
                    {connector.lastTestStatus.startsWith("Success") ? (
                      <>
                        <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                        <span className="text-success">
                          SMTP Verified & Active
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5 shrink-0 text-red-500" />
                        <span className="text-red-600 truncate">
                          {connector.lastTestStatus}
                        </span>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs font-bold shadow-none"
                    onClick={() => {
                      setTestingId(connector.id);
                      testConnectionMutation.mutate({
                        id: connector.id,
                        email: connector.fromEmail,
                      });
                    }}
                    disabled={testingId === connector.id}
                  >
                    {testingId === connector.id ? (
                      "Testing..."
                    ) : (
                      <>
                        <Send className="mr-1 size-3 shrink-0 text-primary" />
                        Test
                      </>
                    )}
                  </Button>

                  {!connector.isDefault ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-bold shadow-none"
                      onClick={() => setDefaultMutation.mutate(connector.id)}
                    >
                      <Check className="mr-1 size-3 shrink-0" />
                      Set Default
                    </Button>
                  ) : null}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold"
                    onClick={() => handleEdit(connector)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => setDeletingConnector(connector)}
                  >
                    <Trash2 className="size-3.5 shrink-0" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
            <div
              style={{ width: "48px", height: "48px" }}
              className="flex shrink-0 size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs"
            >
              <Mail className="size-6 shrink-0" />
            </div>
            <h3 className="mt-4 text-lg font-black text-secondary">
              No Email Accounts Linked Yet
            </h3>
            <p className="mt-1 max-w-md text-xs font-semibold text-muted-foreground leading-5">
              Link your workspace SMTP account to send lead follow-ups and project brochures.
            </p>
            <Button
              type="button"
              onClick={openNewDialog}
              className="mt-6 h-10 rounded-xl px-6 text-xs font-extrabold shadow-sm"
            >
              <Plus className="mr-1.5 size-4 shrink-0" />
              Link Gmail / SMTP Connector
            </Button>
          </Card>
        )}
      </div>

      {/* Dispatch History Audit Section */}
      {logs.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-secondary">
              <History className="size-4 shrink-0 text-primary" />
              Recent Outgoing Email Logs
            </h2>
            <Badge className="border-0 bg-slate-100 text-xs font-bold text-slate-700">
              {logs.length} Sent Emails
            </Badge>
          </div>

          <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 text-xs font-semibold text-secondary hover:bg-slate-50/60"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex shrink-0 size-7 items-center justify-center rounded-full text-white font-bold",
                        log.status === "Sent" ? "bg-success" : "bg-red-500",
                      )}
                    >
                      {log.status === "Sent" ? (
                        <CheckCircle2 className="size-4 shrink-0" />
                      ) : (
                        <XCircle className="size-4 shrink-0" />
                      )}
                    </span>
                    <div>
                      <p className="font-extrabold text-secondary">
                        {log.subject}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        To:{" "}
                        <span className="font-bold text-slate-700">
                          {log.recipient}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      className={cn(
                        "border-0 text-[10px] font-extrabold",
                        log.status === "Sent"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700",
                      )}
                    >
                      {log.status}
                    </Badge>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      {new Date(log.sentAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {/* Link / Edit Email Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-xl font-extrabold text-secondary">
              {editingConnector
                ? "Edit Email Account"
                : "Link Email Account (SMTP)"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Configure your workspace SMTP account to enable email dispatch.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formState);
            }}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  Provider Preset
                </label>
                <Select
                  value={formState.provider}
                  onValueChange={(val) => handleProviderChange(val)}
                >
                  <SelectTrigger className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200">
                    <SelectValue placeholder="Select Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  Account Label Name
                </label>
                <Input
                  required
                  placeholder="e.g. Primary Gmail"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  Sender Name
                </label>
                <Input
                  required
                  placeholder="e.g. Your company"
                  value={formState.fromName}
                  onChange={(e) =>
                    setFormState({ ...formState, fromName: e.target.value })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  Email / Username *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={formState.username}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      username: e.target.value,
                      fromEmail: e.target.value,
                    })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  SMTP Host
                </label>
                <Input
                  required
                  placeholder="smtp.gmail.com"
                  value={formState.host}
                  onChange={(e) =>
                    setFormState({ ...formState, host: e.target.value })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  Port
                </label>
                <Input
                  required
                  type="number"
                  placeholder="465"
                  value={formState.port}
                  onChange={(e) =>
                    setFormState({ ...formState, port: Number(e.target.value) })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  Notification Email (To)
                </label>
                <Input
                  type="email"
                  placeholder="notifications@example.com"
                  value={formState.notificationEmail}
                  onChange={(e) =>
                    setFormState({ ...formState, notificationEmail: e.target.value })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
                <p className="text-[10px] font-semibold text-muted-foreground">
                  System notifications sent here. Leave blank for sender email.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-secondary">
                  SMTP Password / App Password *
                </label>
                <Input
                  required={!editingConnector}
                  type="password"
                  placeholder={
                    editingConnector
                      ? "•••••••• (Leave blank to keep current)"
                      : "Enter your SMTP password"
                  }
                  value={formState.password}
                  onChange={(e) =>
                    setFormState({ ...formState, password: e.target.value })
                  }
                  className="h-10 rounded-lg text-xs font-semibold shadow-none border-slate-200"
                />
                <p className="text-[10px] font-semibold text-muted-foreground">
                  For Gmail, enter 16-character Google App Password.
                </p>
              </div>
            </div>

            {formState.provider === "gmail" ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
                    <Key className="size-4 text-amber-600 shrink-0" />
                    How to get your Gmail App Password:
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGmailHelp(!showGmailHelp)}
                    className="text-[11px] font-extrabold text-amber-800 hover:underline cursor-pointer"
                  >
                    {showGmailHelp ? "Hide instructions" : "Show instructions"}
                  </button>
                </div>
                {showGmailHelp ? (
                  <ol className="list-decimal list-inside text-[11px] font-semibold leading-4 space-y-1 text-amber-900 border-t border-amber-200/60 pt-2">
                    <li>
                      Ensure 2-Step Verification is ON for{" "}
                      <code className="bg-amber-100 px-1 py-0.5 rounded font-bold text-amber-950">
                        {formState.username || "your Google account"}
                      </code>
                    </li>
                    <li>
                      Go to Google App Passwords:{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-extrabold text-amber-950 hover:text-amber-800"
                      >
                        myaccount.google.com/apppasswords
                      </a>
                    </li>
                    <li>
                      Select App: <strong>Mail</strong> & Device: <strong>Other (CRM)</strong>, click <strong>Generate</strong>.
                    </li>
                    <li>
                      Copy the 16-letter password (e.g. <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950">abcd efgh ijkl mnop</code>) and paste it in the SMTP Password field.
                    </li>
                  </ol>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={formState.isDefault}
                  onChange={(e) =>
                    setFormState({ ...formState, isDefault: e.target.checked })
                  }
                  className="size-4 rounded border-slate-300 text-primary accent-primary"
                />
                <label
                  htmlFor="isDefaultCheckbox"
                  className="text-xs font-extrabold text-secondary"
                >
                  Set as Default Outgoing Email Connector
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-lg shadow-none"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="h-10 rounded-lg px-6 font-extrabold shadow-sm"
                >
                  {saveMutation.isPending ? "Saving..." : "Verify & Save Account"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Remove Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingConnector)}
        onOpenChange={(open) => {
          if (!open) setDeletingConnector(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 className="size-5 shrink-0" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-secondary">
                  Remove Email Account?
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  Are you sure you want to remove{" "}
                  <strong className="text-secondary font-extrabold">
                    {deletingConnector?.name} ({deletingConnector?.fromEmail})
                  </strong>
                  ? You will no longer be able to send emails through this account.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl px-5 text-xs font-extrabold shadow-none border-slate-200"
              onClick={() => setDeletingConnector(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl px-5 text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              onClick={() => {
                if (deletingConnector) {
                  deleteMutation.mutate(deletingConnector.id);
                  setDeletingConnector(null);
                }
              }}
            >
              Remove Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
