import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  TestTube2,
  UsersRound,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  ConfirmDeleteDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
} from "ui";

import { api } from "../../../../common/api";
import { getApiErrorMessage } from "../../../../common/apiError";
import {
  PageHeader,
  WorkspacePage,
} from "../../../../components/layout/PageHeader";
import {
  useLeadListFilterOptions,
  type LeadFilterOption,
} from "../all/useAllLeads";
import {
  getRoutingAssigneeOptions,
  mapRoutingAssigneeSelection,
} from "./routingAssignee";

type Provider = "magicbricks" | "housing";
type MappingValue = Record<string, string>;

interface RoutingRule {
  projectId?: string | null;
  teamId?: string | null;
  telecallerId?: string | null;
  fieldExecutiveId?: string | null;
  assignmentMode?: string;
}

interface PortalAccount {
  id: string;
  name: string;
  provider: Provider;
  externalAccountId?: string | null;
  status: string;
  isActive: boolean;
  isPrimary: boolean;
  archivedAt?: string | null;
  webhookUrl?: string;
  endpointUrl?: string;
  completeWorkingEndpointUrl?: string;
  apiKey?: string;
  apiKeyPreview?: string;
  apiKeyValue?: string | null;
  fieldMapping: MappingValue;
  fieldOptions?: Array<{ value: string; label: string; required: boolean }>;
  sourceFields?: Array<{ key: string; label: string; sample: string }>;
  notes?: string | null;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  lastLeadReceivedAt?: string | null;
  totalLeadsReceived: number;
  leadCount: number;
  routing?: RoutingRule | null;
  samplePayload?: Record<string, unknown>;
}

interface PortalAccountsResponse {
  data: {
    accounts: PortalAccount[];
    summary: {
      activeCount: number;
      totalCount: number;
      archivedCount: number;
      totalLeadsReceived: number;
      lastLeadReceivedAt?: string | null;
      status: "Connected" | "Paused" | "Mixed";
    };
  };
}

interface ActivityItem {
  id: string;
  action: string;
  createdAt: string;
  actorUser?: { fullName?: string | null } | null;
}

const housingMappingOptions = [
  { value: "name", label: "Full name", required: true },
  { value: "phone", label: "Mobile number", required: true },
  { value: "email", label: "Email address", required: false },
  { value: "projectName", label: "Project name", required: false },
  { value: "locality", label: "Locality", required: false },
  { value: "city", label: "City", required: false },
  { value: "budget", label: "Budget", required: false },
  { value: "createdDate", label: "Created date", required: false },
  { value: "remarks", label: "Remarks", required: false },
  { value: "skip", label: "Do not import", required: false },
];

const accountStatusClass = (account: PortalAccount) =>
  account.archivedAt
    ? "bg-slate-100 text-slate-600"
    : account.isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "No activity yet";

const providerLabel = (provider: Provider) =>
  provider === "magicbricks" ? "MagicBricks" : "Housing.com";

const routingPersonId = (routing?: RoutingRule | null) =>
  routing?.telecallerId ?? routing?.fieldExecutiveId ?? "";

export function PortalAccountsWorkspace({ provider }: { provider: Provider }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [tab, setTab] = useState("setup");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmBulkStatus, setConfirmBulkStatus] = useState<boolean | null>(
    null,
  );
  const [archiveAccount, setArchiveAccount] = useState<PortalAccount | null>(
    null,
  );
  const [newName, setNewName] = useState("");
  const [newExternalAccountId, setNewExternalAccountId] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const { options: filterOptions } = useLeadListFilterOptions();

  const basePath =
    provider === "magicbricks"
      ? "/integrations/magicbricks"
      : "/housing-integrations";
  const queryKey = ["portal-accounts", provider] as const;
  const accountsQuery = useQuery<PortalAccountsResponse>({
    queryKey,
    queryFn: async () => (await api.get(`${basePath}/accounts`)).data,
  });
  const accounts = useMemo(
    () => accountsQuery.data?.data.accounts ?? [],
    [accountsQuery.data],
  );
  const visibleAccounts = useMemo(
    () =>
      accounts.filter((account: PortalAccount) =>
        account.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [accounts, search],
  );
  const selectedAccount =
    accounts.find(
      (account: PortalAccount) => account.id === selectedAccountId,
    ) ??
    accounts.find((account: PortalAccount) => account.isPrimary) ??
    accounts[0];

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["lead-imports"] }),
    ]);
  };
  const createAccount = useMutation({
    mutationFn: async () =>
      (
        await api.post(`${basePath}/accounts`, {
          name: newName,
          externalAccountId: newExternalAccountId || undefined,
          ...(provider === "housing" ? { apiKey: newApiKey || undefined } : {}),
        })
      ).data,
    onSuccess: async (response) => {
      await invalidate();
      setSelectedAccountId(response.data.id);
      setNewName("");
      setNewExternalAccountId("");
      setNewApiKey("");
      setAddOpen(false);
      toast.success("Account added");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not add account")),
  });
  const updateAccount = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => (await api.patch(`${basePath}/accounts/${id}`, body)).data,
    onSuccess: async () => {
      await invalidate();
      toast.success("Account saved");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save account")),
  });
  const updateMapping = useMutation({
    mutationFn: async ({
      id,
      fieldMapping,
    }: {
      id: string;
      fieldMapping: MappingValue;
    }) =>
      (
        await api.patch(`${basePath}/accounts/${id}/field-mapping`, {
          fieldMapping,
        })
      ).data,
    onSuccess: async () => {
      await invalidate();
      toast.success("Field mapping saved");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save field mapping")),
  });
  const updateRouting = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: RoutingRule }) =>
      (await api.patch(`${basePath}/accounts/${id}/routing`, body)).data,
    onSuccess: async () => {
      await invalidate();
      toast.success("Routing override saved");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save routing override")),
  });
  const rotateKey = useMutation({
    mutationFn: async (id: string) =>
      (
        await api.post(
          `${basePath}/accounts/${id}/${
            provider === "magicbricks" ? "generate-api-key" : "regenerate-key"
          }`,
        )
      ).data,
    onSuccess: async () => {
      await invalidate();
      toast.success("Credential regenerated");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not regenerate credential")),
  });
  const testAccount = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`${basePath}/accounts/${id}/test`)).data,
    onSuccess: async (result) => {
      await invalidate();
      toast.success(
        result?.data?.message ?? result?.message ?? "Test lead processed",
      );
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Connection test failed")),
  });
  const archiveMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`${basePath}/accounts/${id}`)).data,
    onSuccess: async () => {
      await invalidate();
      setArchiveAccount(null);
      toast.success("Account archived");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not archive account")),
  });
  const restoreMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`${basePath}/accounts/${id}/restore`)).data,
    onSuccess: async () => {
      await invalidate();
      toast.success("Account restored in paused state");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not restore account")),
  });
  const bulkStatus = useMutation({
    mutationFn: async (isActive: boolean) =>
      (await api.patch(`${basePath}/accounts/bulk-status`, { isActive })).data,
    onSuccess: async () => {
      await invalidate();
      setConfirmBulkStatus(null);
      toast.success("Provider account status updated");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update account status")),
  });
  const activityQuery = useQuery<{ data: ActivityItem[] }>({
    queryKey: ["portal-account-activity", provider, selectedAccount?.id],
    enabled: tab === "activity" && Boolean(selectedAccount?.id),
    queryFn: async () =>
      (await api.get(`${basePath}/accounts/${selectedAccount?.id}/activity`))
        .data,
  });

  const providerStatus = accountsQuery.data?.data.summary.status ?? "Paused";
  const accountOptions = useMemo(
    () => getRoutingAssigneeOptions(filterOptions.ownerOptions),
    [filterOptions.ownerOptions],
  );

  return (
    <>
      <PageHeader
        title={`${providerLabel(provider)} accounts`}
        subtitle="Manage independent credentials, routing, mapping, and account activity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "border-0 px-3 py-1 text-xs font-extrabold",
                providerStatus === "Connected"
                  ? "bg-emerald-50 text-emerald-700"
                  : providerStatus === "Mixed"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              {providerStatus}
            </Badge>
            <Button variant="outline" onClick={() => navigate("/leads/import")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to import sources
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add account
            </Button>
          </div>
        }
      />
      <WorkspacePage>
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Active accounts"
            value={`${accountsQuery.data?.data.summary.activeCount ?? 0} / ${
              accountsQuery.data?.data.summary.totalCount ?? 0
            }`}
          />
          <Metric
            label="Captured leads"
            value={String(
              accountsQuery.data?.data.summary.totalLeadsReceived ?? 0,
            )}
          />
          <Metric
            label="Latest lead"
            value={formatDateTime(
              accountsQuery.data?.data.summary.lastLeadReceivedAt,
            )}
            compact
          />
        </section>

        <section className="grid min-h-[620px] gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
          <Card className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-secondary">
                  Accounts
                </h2>
                <span className="text-xs font-bold text-muted-foreground">
                  {accounts.length}
                </span>
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search accounts"
                  placeholder="Search accounts"
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {accountsQuery.isLoading ? <LoadingRows /> : null}
              {!accountsQuery.isLoading && visibleAccounts.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm font-semibold text-muted-foreground">
                  No accounts match this search.
                </p>
              ) : null}
              {visibleAccounts.map((account: PortalAccount) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setTab("setup");
                  }}
                  className={cn(
                    "mb-1 w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedAccount?.id === account.id
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-extrabold text-secondary">
                      {account.name}
                    </span>
                    {account.isPrimary ? (
                      <span className="text-[10px] font-extrabold text-primary">
                        PRIMARY
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-muted-foreground">
                      {account.totalLeadsReceived} leads
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                        accountStatusClass(account),
                      )}
                    >
                      {account.archivedAt
                        ? "Archived"
                        : account.isActive
                        ? "Active"
                        : "Paused"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setConfirmBulkStatus(providerStatus !== "Connected")
                }
                disabled={accounts.length === 0}
              >
                {providerStatus === "Connected" ? (
                  <Pause className="mr-2 h-4 w-4" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {providerStatus === "Connected"
                  ? "Pause all accounts"
                  : "Activate all accounts"}
              </Button>
            </div>
          </Card>

          {selectedAccount ? (
            <AccountDetails
              account={selectedAccount}
              provider={provider}
              tab={tab}
              onTabChange={setTab}
              projectOptions={filterOptions.projectOptions}
              teamOptions={filterOptions.teamOptions}
              assigneeOptions={accountOptions}
              onSaveSetup={(body) =>
                updateAccount.mutate({ id: selectedAccount.id, body })
              }
              setupSaving={updateAccount.isPending}
              onSaveMapping={(fieldMapping) =>
                updateMapping.mutate({ id: selectedAccount.id, fieldMapping })
              }
              mappingSaving={updateMapping.isPending}
              onSaveRouting={(body) =>
                updateRouting.mutate({ id: selectedAccount.id, body })
              }
              routingSaving={updateRouting.isPending}
              onRotate={() => rotateKey.mutate(selectedAccount.id)}
              rotating={rotateKey.isPending}
              onTest={() => testAccount.mutate(selectedAccount.id)}
              testing={testAccount.isPending}
              onArchive={() => setArchiveAccount(selectedAccount)}
              onRestore={() => restoreMutation.mutate(selectedAccount.id)}
              restoring={restoreMutation.isPending}
              activity={activityQuery.data?.data ?? []}
              activityLoading={activityQuery.isLoading}
              activityError={
                activityQuery.isError
                  ? getApiErrorMessage(
                      activityQuery.error,
                      "Could not load account activity",
                    )
                  : undefined
              }
            />
          ) : (
            <Card className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div>
                <Settings2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 text-lg font-extrabold text-secondary">
                  Add your first account
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Each account keeps its own credential, routing, and lead
                  history.
                </p>
                <Button className="mt-4" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add account
                </Button>
              </div>
            </Card>
          )}
        </section>
      </WorkspacePage>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle>Add {providerLabel(provider)} account</DialogTitle>
            <DialogDescription>
              Credentials and routing remain independent for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <Field label="Account name" required>
              <Input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. South Mumbai campaign"
              />
            </Field>
            <Field label="External account ID">
              <Input
                value={newExternalAccountId}
                onChange={(event) =>
                  setNewExternalAccountId(event.target.value)
                }
                placeholder="Optional partner account ID"
              />
            </Field>
            {provider === "housing" ? (
              <Field label="Partner API key">
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(event) => setNewApiKey(event.target.value)}
                  placeholder="Optional for pull API"
                />
              </Field>
            ) : null}
          </div>
          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={createAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createAccount.mutate()}
              disabled={!newName.trim() || createAccount.isPending}
            >
              {createAccount.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}{" "}
              Add account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(archiveAccount)}
        title="Archive integration account?"
        description="The account will stop receiving leads. Existing leads, attribution, and activity are retained and the account can be restored later."
        entityName={archiveAccount?.name}
        confirmLabel="Archive account"
        isLoading={archiveMutation.isPending}
        onConfirm={() =>
          archiveAccount && archiveMutation.mutate(archiveAccount.id)
        }
        onCancel={() => setArchiveAccount(null)}
        onClose={() => setArchiveAccount(null)}
      />
      <ConfirmDeleteDialog
        open={confirmBulkStatus !== null}
        title={
          confirmBulkStatus ? "Activate all accounts?" : "Pause all accounts?"
        }
        description={
          confirmBulkStatus
            ? "Every non-archived account will begin receiving portal leads."
            : "Every non-archived account will stop receiving portal leads until reactivated."
        }
        confirmLabel={confirmBulkStatus ? "Activate all" : "Pause all"}
        destructive={!confirmBulkStatus}
        isLoading={bulkStatus.isPending}
        onConfirm={() =>
          confirmBulkStatus !== null && bulkStatus.mutate(confirmBulkStatus)
        }
        onCancel={() => setConfirmBulkStatus(null)}
        onClose={() => setConfirmBulkStatus(null)}
      />
    </>
  );
}

function AccountDetails({
  account,
  provider,
  tab,
  onTabChange,
  projectOptions,
  teamOptions,
  assigneeOptions,
  onSaveSetup,
  setupSaving,
  onSaveMapping,
  mappingSaving,
  onSaveRouting,
  routingSaving,
  onRotate,
  rotating,
  onTest,
  testing,
  onArchive,
  onRestore,
  restoring,
  activity,
  activityLoading,
  activityError,
}: {
  account: PortalAccount;
  provider: Provider;
  tab: string;
  onTabChange: (tab: string) => void;
  projectOptions: LeadFilterOption[];
  teamOptions: LeadFilterOption[];
  assigneeOptions: LeadFilterOption[];
  onSaveSetup: (body: Record<string, unknown>) => void;
  setupSaving: boolean;
  onSaveMapping: (fieldMapping: MappingValue) => void;
  mappingSaving: boolean;
  onSaveRouting: (body: RoutingRule) => void;
  routingSaving: boolean;
  onRotate: () => void;
  rotating: boolean;
  onTest: () => void;
  testing: boolean;
  onArchive: () => void;
  onRestore: () => void;
  restoring: boolean;
  activity: ActivityItem[];
  activityLoading: boolean;
  activityError?: string;
}) {
  const [name, setName] = useState(account.name);
  const [externalAccountId, setExternalAccountId] = useState(
    account.externalAccountId ?? "",
  );
  const [notes, setNotes] = useState(account.notes ?? "");
  const [apiKey, setApiKey] = useState(
    account.apiKeyValue ?? (provider === "housing" ? account.apiKey ?? "" : ""),
  );
  const [showKey, setShowKey] = useState(false);
  const [mapping, setMapping] = useState<MappingValue>(account.fieldMapping);
  const [projectId, setProjectId] = useState(account.routing?.projectId ?? "");
  const [teamId, setTeamId] = useState(account.routing?.teamId ?? "");
  const [personId, setPersonId] = useState(routingPersonId(account.routing));

  const selectedAssignee = mapRoutingAssigneeSelection(
    personId,
    assigneeOptions,
  );
  const mappingOptions = account.fieldOptions ?? housingMappingOptions;
  const endpoint =
    account.completeWorkingEndpointUrl ??
    account.endpointUrl ??
    account.webhookUrl ??
    "";
  const accountKey =
    provider === "magicbricks" ? account.apiKey : account.webhookUrl;

  return (
    <Card className="min-w-0 rounded-xl border border-slate-200 bg-white p-0 shadow-card">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-extrabold text-secondary">
              {account.name}
            </h2>
            {account.isPrimary ? (
              <Badge className="border-primary/15 bg-primary/5 text-primary">
                Primary
              </Badge>
            ) : null}
            <Badge className={cn("border-0", accountStatusClass(account))}>
              {account.archivedAt
                ? "Archived"
                : account.isActive
                ? "Active"
                : "Paused"}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {account.totalLeadsReceived} received · Last lead:{" "}
            {formatDateTime(account.lastLeadReceivedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {account.archivedAt ? (
            <Button variant="outline" onClick={onRestore} disabled={restoring}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onTest}
                disabled={testing || !account.isActive}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="mr-2 h-4 w-4" />
                )}
                Test connection
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={onArchive}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={onTabChange} className="p-5">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0">
          <TabsTrigger
            value="setup"
            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger
            value="routing"
            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <UsersRound className="mr-2 h-4 w-4" />
            Routing
          </TabsTrigger>
          <TabsTrigger
            value="mapping"
            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Field mapping
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Account name" required>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={Boolean(account.archivedAt)}
              />
            </Field>
            <Field label="External account ID">
              <Input
                value={externalAccountId}
                onChange={(event) => setExternalAccountId(event.target.value)}
                disabled={Boolean(account.archivedAt)}
              />
            </Field>
            {provider === "housing" ? (
              <Field label="Partner API key">
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    disabled={Boolean(account.archivedAt)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowKey((value) => !value)}
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Field>
            ) : null}
            <Field label="Notes" className="lg:col-span-2">
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={Boolean(account.archivedAt)}
                placeholder="Optional account context for your team"
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                onSaveSetup({
                  name,
                  externalAccountId,
                  notes,
                  ...(provider === "housing" ? { apiKey } : {}),
                })
              }
              disabled={
                setupSaving || Boolean(account.archivedAt) || !name.trim()
              }
            >
              {setupSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save setup
            </Button>
          </div>
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Field
              label={
                provider === "magicbricks" ? "Push endpoint" : "Webhook URL"
              }
            >
              <Input readOnly value={endpoint} className="font-mono text-xs" />
            </Field>
            <Button
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(endpoint)
                  .then(() => toast.success("Endpoint copied"))
              }
            >
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copy endpoint
            </Button>
            <Field
              label={provider === "magicbricks" ? "API key" : "Webhook key"}
            >
              <Input
                readOnly
                value={accountKey ?? ""}
                className="font-mono text-xs"
              />
            </Field>
            <Button
              variant="outline"
              onClick={onRotate}
              disabled={rotating || Boolean(account.archivedAt)}
            >
              {rotating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="routing" className="space-y-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm font-semibold leading-6 text-slate-700">
            Account selections take priority over incoming portal values. A
            person override bypasses automatic assignment; otherwise the
            selected team uses its matching auto-assignment rule. Portal source
            remains {providerLabel(provider)}.
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Field label="Project override">
              <SearchableSelect
                value={projectId}
                onValueChange={setProjectId}
                options={[
                  { label: "No project override", value: "" },
                  ...projectOptions,
                ]}
                placeholder="Use incoming project"
                disabled={Boolean(account.archivedAt)}
              />
            </Field>
            <Field label="Team auto-assignment">
              <SearchableSelect
                value={teamId}
                onValueChange={setTeamId}
                options={[
                  { label: "No team override", value: "" },
                  ...teamOptions,
                ]}
                placeholder="Use normal automatic assignment"
                disabled={Boolean(account.archivedAt)}
              />
            </Field>
            <Field label="Person override">
              <SearchableSelect
                value={personId}
                onValueChange={setPersonId}
                options={[
                  { label: "No person override", value: "" },
                  ...assigneeOptions,
                ]}
                placeholder="Use team or automatic assignment"
                disabled={Boolean(account.archivedAt)}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                onSaveRouting({
                  projectId: projectId || null,
                  teamId: teamId || null,
                  ...selectedAssignee,
                })
              }
              disabled={routingSaving || Boolean(account.archivedAt)}
            >
              {routingSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save routing
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-5">
          <p className="text-sm font-semibold text-muted-foreground">
            Map this account&apos;s incoming fields independently. Name and
            mobile mapping must remain available for MagicBricks.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-secondary">
                <tr>
                  <th className="px-4 py-3">Incoming field</th>
                  <th className="px-4 py-3">CRM field</th>
                  <th className="px-4 py-3">Sample</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(mapping).map(([key, value]) => {
                  const source = account.sourceFields?.find(
                    (field) => field.key === key,
                  );
                  return (
                    <tr key={key}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-secondary">
                        {source?.label ?? key}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={value}
                          onValueChange={(next) =>
                            setMapping((current) => ({
                              ...current,
                              [key]: next,
                            }))
                          }
                          disabled={Boolean(account.archivedAt)}
                        >
                          <SelectTrigger
                            className="h-9"
                            aria-label={`CRM field for ${source?.label ?? key}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {mappingOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                                {option.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        {source?.sample ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => onSaveMapping(mapping)}
              disabled={mappingSaving || Boolean(account.archivedAt)}
            >
              {mappingSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save mapping
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-3">
            {activityLoading ? <LoadingRows /> : null}
            {activityError ? (
              <p role="alert" className="text-sm text-destructive">
                {activityError}
              </p>
            ) : null}
            {!activityLoading && !activityError && activity.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-muted-foreground">
                No account activity yet.
              </p>
            ) : null}
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 rounded-lg border border-slate-100 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-secondary">
                    {item.action.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {item.actorUser?.fullName ?? "System"} ·{" "}
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-xs font-extrabold text-secondary">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-black text-secondary",
          compact ? "text-sm" : "text-2xl",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-3" aria-label="Loading accounts">
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
    </div>
  );
}
