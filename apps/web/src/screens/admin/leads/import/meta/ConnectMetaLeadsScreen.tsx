import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  KeyRound,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
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
  SearchableSelect,
  Switch,
} from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { useProjects } from "../../../projects/useProjectsApi";
import { useLeadListFilterOptions } from "../../all/useAllLeads";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import { Header } from "../magicbricks/components/SharedMagicBricksComponents";
import type {
  MetaDeliveryLog,
  MetaFieldOption,
  MetaIntegrationConfig,
  MetaLeadForm,
  MetaSourceField,
} from "./useMetaIntegration";
import {
  useMetaDeliveryLogs,
  useMetaIntegration,
  useMetaIntegrationMutations,
  useMetaLeadForms,
} from "./useMetaIntegration";
import { getApiErrorMessage } from "../../../../../common/apiError";
import {
  getRoutingAssigneeOptions,
  mapRoutingAssigneeSelection,
} from "../routingAssignee";
import { MetaFormRoutingDialog } from "./MetaFormRoutingDialog";
import { hasUnsavedMetaPageConfiguration } from "./metaRouting";

type ConnectedMetaAccount = MetaIntegrationConfig["connectedAccounts"][number];
type ConnectedMetaPage = MetaIntegrationConfig["connectedPages"][number];

const FORMS_PER_PAGE = 8;

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not received yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function CopyButton({ label, value }: { label: string; value: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-md border-slate-200 px-3 text-xs font-bold shadow-none"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
    >
      <Copy className="mr-2 h-3.5 w-3.5" />
      Copy
    </Button>
  );
}

function StatusBadge({
  good,
  goodLabel,
  issueLabel,
}: {
  good: boolean;
  goodLabel: string;
  issueLabel: string;
}) {
  return (
    <Badge
      className={
        good
          ? "border-0 bg-emerald-50 text-emerald-700"
          : "border-0 bg-amber-50 text-amber-800"
      }
    >
      {good ? goodLabel : issueLabel}
    </Badge>
  );
}

function getLeadgenSubscriptionGuidance(error?: string | null) {
  const providerMessage = error?.trim() ?? "";

  if (providerMessage.includes("leads_retrieval")) {
    return {
      title: "Meta approval is required before this Page can receive leads",
      detail:
        "The Page token is valid, but Meta has not granted this app Lead Ads retrieval access yet.",
      recovery:
        "Complete Meta Business and app access verification, request leads_retrieval in App Review, then reconnect this Facebook account to retry the subscription.",
    };
  }

  return {
    title: "Leadgen subscription needs attention",
    detail:
      providerMessage ||
      "Meta could not subscribe this Page to leadgen events.",
    recovery:
      "Confirm that the connected Facebook user has full Page access, then reconnect the Facebook account to retry.",
  };
}

export function ConnectMetaLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pageId, setPageId] = useState("");
  const [formsPage, setFormsPage] = useState(1);
  const [deliveryLogPage, setDeliveryLogPage] = useState(1);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedTelecallerId, setSelectedTelecallerId] = useState("");
  const [selectedFieldExecutiveId, setSelectedFieldExecutiveId] = useState("");
  const [routingForm, setRoutingForm] = useState<MetaLeadForm | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualPageId, setManualPageId] = useState("");
  const [manualPageToken, setManualPageToken] = useState("");
  const [manualAccountName, setManualAccountName] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ConnectedMetaAccount | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const integrationQuery = useMetaIntegration();
  const mutations = useMetaIntegrationMutations();
  const integration = integrationQuery.data;
  const projectsQuery = useProjects("");
  const leadFilterOptionsQuery = useLeadListFilterOptions();
  const formsQuery = useMetaLeadForms(pageId);
  const deliveryLogsQuery = useMetaDeliveryLogs(deliveryLogPage);

  useEffect(() => {
    if (!integration) return;
    const pages = integration.connectedPages ?? [];
    const knownPage = pages.some(
      (page) => page.id === integration.selectedPageId,
    );
    const nextPageId = pages.some((page) => page.id === pageId) ? pageId : knownPage
      ? integration.selectedPageId
      : pages[0]?.id ?? integration.selectedPageId ?? "";
    setPageId(nextPageId);
    setSelectedFormIds(
      nextPageId ? integration.pageFormSelections?.[nextPageId] ?? [] : [],
    );
    setSelectedProjectId(
      nextPageId ? integration.pageProjectMappings?.[nextPageId] ?? "" : "",
    );
    setSelectedSourceId(
      nextPageId ? integration.pageSourceMappings?.[nextPageId] ?? "" : "",
    );
    setSelectedTeamId(
      nextPageId ? integration.pageTeamMappings?.[nextPageId] ?? "" : "",
    );
    setSelectedOwnerId(
      nextPageId
        ? integration.pageAssignmentOverrides?.[nextPageId]?.ownerId ?? ""
        : "",
    );
    setSelectedTelecallerId(
      nextPageId
        ? integration.pageAssignmentOverrides?.[nextPageId]?.telecallerId ?? ""
        : "",
    );
    setSelectedFieldExecutiveId(
      nextPageId
        ? integration.pageAssignmentOverrides?.[nextPageId]?.fieldExecutiveId ??
            ""
        : "",
    );
    setFieldMapping(integration.fieldMapping ?? {});
  }, [integration, pageId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const result = params.get("metaConnected");
    if (!result) return;
    if (result === "1") {
      toast.success(
        "Facebook account connected. Review the discovered Pages and forms.",
      );
      void integrationQuery.refetch();
    } else {
      toast.error(params.get("metaError") || "Facebook connection failed.");
    }
    params.delete("metaConnected");
    params.delete("metaError");
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true },
    );
  }, [integrationQuery, location.pathname, location.search, navigate]);

  const selectedPage = useMemo(
    () =>
      integration?.connectedPages.find((page) => page.id === pageId) ?? null,
    [integration?.connectedPages, pageId],
  );
  const selectedAccount = useMemo(
    () =>
      selectedPage
        ? integration?.connectedAccounts.find(
            (account) => account.id === selectedPage.accountId,
          ) ?? null
        : null,
    [integration?.connectedAccounts, selectedPage],
  );
  const subscriptionGuidance = useMemo(
    () => getLeadgenSubscriptionGuidance(selectedPage?.subscriptionError),
    [selectedPage?.subscriptionError],
  );
  const forms = formsQuery.data ?? [];
  const formsPageCount = Math.max(1, Math.ceil(forms.length / FORMS_PER_PAGE));
  const visibleForms = useMemo(
    () =>
      forms.slice((formsPage - 1) * FORMS_PER_PAGE, formsPage * FORMS_PER_PAGE),
    [forms, formsPage],
  );
  const accountPageGroups = useMemo(() => {
    const pagesByAccount = new Map<string, ConnectedMetaPage[]>();
    (integration?.connectedPages ?? []).forEach((page) => {
      const accountId = page.accountId || "unlinked";
      const pages = pagesByAccount.get(accountId) ?? [];
      pages.push(page);
      pagesByAccount.set(accountId, pages);
    });

    const connectedGroups = (integration?.connectedAccounts ?? []).map(
      (account) => {
        const accountPages = pagesByAccount.get(account.id) ?? [];
        const portfolioMap = new Map<
          string,
          { id: string; name: string; pages: ConnectedMetaPage[] }
        >();

        accountPages.forEach((page) => {
          const portId = page.portfolioId || "personal";
          const portName = page.portfolioName || "Direct Personal Pages";
          const existing = portfolioMap.get(portId) ?? {
            id: portId,
            name: portName,
            pages: [],
          };
          existing.pages.push(page);
          portfolioMap.set(portId, existing);
        });

        return {
          account,
          portfolios: Array.from(portfolioMap.values()),
          totalPages: accountPages.length,
        };
      },
    );

    const linkedIds = new Set(
      (integration?.connectedAccounts ?? []).map((account) => account.id),
    );
    const unlinkedPages = (integration?.connectedPages ?? []).filter(
      (page) => !linkedIds.has(page.accountId),
    );

    if (unlinkedPages.length) {
      const unlinkedPortfolioMap = new Map<
        string,
        { id: string; name: string; pages: ConnectedMetaPage[] }
      >();
      unlinkedPages.forEach((page) => {
        const portId = page.portfolioId || "personal";
        const portName = page.portfolioName || "Direct Personal Pages";
        const existing = unlinkedPortfolioMap.get(portId) ?? {
          id: portId,
          name: portName,
          pages: [],
        };
        existing.pages.push(page);
        unlinkedPortfolioMap.set(portId, existing);
      });
      connectedGroups.push({
        account: null,
        portfolios: Array.from(unlinkedPortfolioMap.values()),
        totalPages: unlinkedPages.length,
      });
    }

    return connectedGroups;
  }, [integration?.connectedAccounts, integration?.connectedPages]);
  const fieldOptions = useMemo(
    () =>
      (integration?.fieldOptions ?? []).map((option: MetaFieldOption) => ({
        value: option.value,
        label: option.required ? `${option.label} (required)` : option.label,
        description:
          option.value === "skip"
            ? "Do not store this form field"
            : "Store this value on the CRM lead",
      })),
    [integration?.fieldOptions],
  );
  const projectOptions = useMemo(
    () => [
      {
        value: "",
        label: "No project assigned",
        description:
          "Use the project value submitted by the form when available",
      },
      ...(projectsQuery.data?.projects ?? [])
        .filter((project) => project.status !== "Archived")
        .map((project) => ({
          value: project.id,
          label: project.name,
          description: project.location || "CRM project",
        }))
        .sort((a: { label: string }, b: { label: string }) =>
          a.label.localeCompare(b.label, undefined, {
            sensitivity: "base",
            numeric: true,
          }),
        ),
    ],
    [projectsQuery.data?.projects],
  );
  const sourceOptions = useMemo(
    () => [
      {
        value: "",
        label: "Use Meta Ads source",
        description: "Keep the standard Meta Ads source for incoming leads",
      },
      ...leadFilterOptionsQuery.options.sourceOptions,
    ],
    [leadFilterOptionsQuery.options.sourceOptions],
  );
  const teamOptions = useMemo(
    () => [
      {
        value: "",
        label: "No team route",
        description: "Keep leads unassigned unless a person override is selected",
      },
      ...leadFilterOptionsQuery.options.teamOptions,
    ],
    [leadFilterOptionsQuery.options.teamOptions],
  );
  const assigneeOptions = useMemo(
    () => [
      {
        value: "",
        label: "No user override",
        description: "Use the selected team route; otherwise keep leads unassigned",
      },
      ...getRoutingAssigneeOptions(leadFilterOptionsQuery.options.ownerOptions),
    ],
    [leadFilterOptionsQuery.options.ownerOptions],
  );

  const isSaving =
    mutations.savePageForms.isPending ||
    mutations.saveFieldMapping.isPending ||
    mutations.disconnectAccount.isPending ||
    mutations.addManualPage.isPending;
  const isOAuthPending = mutations.startOAuth.isPending;
  const hasUnsavedPageConfiguration = integration ? hasUnsavedMetaPageConfiguration(integration, pageId, {
    selectedFormIds, projectId: selectedProjectId, sourceId: selectedSourceId,
    teamId: selectedTeamId, ownerId: selectedOwnerId, telecallerId: selectedTelecallerId,
    fieldExecutiveId: selectedFieldExecutiveId,
  }) : false;

  const handleConnectFacebook = async () => {
    const result = await mutations.startOAuth.mutateAsync(undefined as any);
    window.location.assign(result.authUrl);
  };

  const handleReconnectFacebook = async (account: ConnectedMetaAccount) => {
    const result = await mutations.startOAuth.mutateAsync(account.id);
    window.location.assign(result.authUrl);
  };

  const handleSelectPage = (nextPageId: string) => {
    setPageId(nextPageId);
    setFormsPage(1);
    setSelectedFormIds(integration?.pageFormSelections?.[nextPageId] ?? []);
    setSelectedProjectId(integration?.pageProjectMappings?.[nextPageId] ?? "");
    setSelectedSourceId(integration?.pageSourceMappings?.[nextPageId] ?? "");
    setSelectedTeamId(integration?.pageTeamMappings?.[nextPageId] ?? "");
    setSelectedOwnerId(
      integration?.pageAssignmentOverrides?.[nextPageId]?.ownerId ?? "",
    );
    setSelectedTelecallerId(
      integration?.pageAssignmentOverrides?.[nextPageId]?.telecallerId ?? "",
    );
    setSelectedFieldExecutiveId(
      integration?.pageAssignmentOverrides?.[nextPageId]?.fieldExecutiveId ??
        "",
    );
  };

  const handleManualConnect = async () => {
    if (!manualPageId.trim() || !manualPageToken.trim()) {
      toast.error("Enter both the Meta Page ID and Page access token.");
      return;
    }
    const result = await mutations.addManualPage.mutateAsync({
      pageId: manualPageId.trim(),
      pageAccessToken: manualPageToken.trim(),
      accountName: manualAccountName.trim() || undefined,
    });
    const connectedPageId = result.selectedPageId || manualPageId.trim();
    setPageId(connectedPageId);
    setSelectedFormIds(result.pageFormSelections?.[connectedPageId] ?? []);
    setManualPageToken("");
    setManualPageId("");
    setManualAccountName("");
    setManualDialogOpen(false);
    toast.success(
      "Page verified, forms discovered, and leadgen subscription checked.",
    );
  };

  const handleSavePageConfiguration = async () => {
    if (!pageId) return;
    try {
      await mutations.savePageForms.mutateAsync({
        pageId,
        selectedFormIds,
        projectId: selectedProjectId,
        sourceId: selectedSourceId,
        teamId: selectedTeamId,
        ownerId: selectedOwnerId,
        telecallerId: selectedTelecallerId,
        fieldExecutiveId: selectedFieldExecutiveId,
      });
      toast.success("Page configuration saved");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not save Meta Page configuration"),
      );
    }
  };

  const handleSaveMapping = async () => {
    await mutations.saveFieldMapping.mutateAsync(fieldMapping);
    toast.success("Lead field mapping saved");
  };

  const toggleForm = (formId: string) => {
    setSelectedFormIds((current) =>
      current.includes(formId)
        ? current.filter((id) => id !== formId)
        : [...current, formId],
    );
  };

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Import Leads"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={["Import leads", "Meta Lead Ads"]}
      />
      <WorkspacePage className="space-y-6">
          <section className="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Megaphone className="h-4 w-4" />
                Meta Lead Ads
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
                Facebook Pages and Instant Forms
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                Connect the Pages that should create CRM leads, control each
                Page&apos;s forms, and keep token health visible without
                exposing credentials.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[360px]">
              <Button
                type="button"
                variant="outline"
                className="h-10 min-w-0 rounded-md px-3 text-xs sm:px-4 sm:text-sm"
                onClick={() => navigate("/leads/import")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Import sources
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 min-w-0 rounded-md px-3 text-xs sm:px-4 sm:text-sm"
                onClick={() => setManualDialogOpen(true)}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Add Page manually
              </Button>
              <Button
                type="button"
                className="col-span-2 h-10 rounded-md px-4"
                disabled={mutations.startOAuth.isPending}
                onClick={handleConnectFacebook}
              >
                <Plus className="mr-2 h-4 w-4" />
                {mutations.startOAuth.isPending
                  ? "Preparing..."
                  : "Connect Facebook account"}
              </Button>
            </div>
          </section>

          {integrationQuery.isLoading ? (
            <Card className="border-slate-200 p-8 shadow-card">
              <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading Meta
                connection workspace...
              </div>
            </Card>
          ) : !integration ? (
            <Card className="border-slate-200 p-8 shadow-card">
              <p className="text-sm font-semibold text-muted-foreground">
                Meta setup could not be loaded. Refresh and try again.
              </p>
            </Card>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-bold text-muted-foreground">
                    Connection
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={
                        integration.isActive
                          ? "h-2 w-2 rounded-full bg-emerald-500"
                          : "h-2 w-2 rounded-full bg-amber-500"
                      }
                    />
                    <span className="text-lg font-extrabold text-secondary">
                      {integration.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <div className="border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-bold text-muted-foreground">
                    Facebook accounts
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-secondary">
                    {integration.connectedAccounts.length}
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-bold text-muted-foreground">
                    Connected Pages
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-secondary">
                    {integration.connectedPages.length}
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-bold text-muted-foreground">
                    Leads this month
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-secondary">
                    {integration.stats.totalImportedThisMonth.toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-bold text-muted-foreground">
                    Last lead received
                  </p>
                  <p className="mt-2 text-sm font-extrabold leading-5 text-secondary">
                    {formatDateTime(
                      integration.lastLeadReceivedAt ||
                        integration.stats?.lastImportedAt,
                    )}
                  </p>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.6fr)] items-stretch">
                <Card className="flex flex-col h-[760px] overflow-hidden border-slate-200 bg-white shadow-card">
                  <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
                    <div>
                      <h2 className="text-base font-extrabold text-secondary">
                        Facebook accounts and Pages
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">
                        Open an account to see its Pages, then choose a Page to
                        manage its Instant Forms.
                      </p>
                    </div>
                    <Badge className="border-0 bg-slate-100 text-slate-700">
                      {integration.connectedPages.length}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto p-3">
                    {accountPageGroups.length ? (
                      accountPageGroups.map(
                        ({ account, portfolios, totalPages }) => (
                          <section
                            key={account?.id ?? "unlinked"}
                            className="overflow-hidden border border-slate-200 bg-slate-50/50"
                          >
                            <div className="border-b border-slate-200 bg-white px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-secondary">
                                    {account?.name ?? "Unlinked Pages"}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                                    {account
                                      ? `${totalPages} ${
                                          totalPages === 1 ? "Page" : "Pages"
                                        } · Connected ${formatDateTime(
                                          account.connectedAt,
                                        )}`
                                      : "Pages saved before account grouping was available"}
                                  </p>
                                </div>
                                {account ? (
                                  <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                                      <Switch
                                        id={`account-pause-${account.id}`}
                                        checked={!account.isPaused}
                                        disabled={mutations.toggleAccountPause.isPending}
                                        onCheckedChange={(checked) => {
                                          void mutations.toggleAccountPause.mutateAsync({
                                            accountId: account.id,
                                            isPaused: !checked,
                                          });
                                          toast.success(
                                            checked
                                              ? `Resumed lead sync for ${account.name}`
                                              : `Paused lead sync for ${account.name}`,
                                          );
                                        }}
                                      />
                                      <span className="text-[11px] font-bold text-slate-700">
                                        {account.isPaused ? "Paused" : "Active"}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-8 px-2 text-xs font-bold text-primary hover:bg-blue-50"
                                      disabled={isOAuthPending}
                                      onClick={() =>
                                        handleReconnectFacebook(account)
                                      }
                                    >
                                      <RefreshCw
                                        className={
                                          isOAuthPending
                                            ? "mr-1.5 h-3.5 w-3.5 animate-spin"
                                            : "mr-1.5 h-3.5 w-3.5"
                                        }
                                      />
                                      Reconnect
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                      aria-label={`Disconnect ${account.name}`}
                                      disabled={
                                        mutations.disconnectAccount.isPending
                                      }
                                      onClick={() =>
                                        setAccountToDelete(account)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 shrink-0 px-2.5 text-xs font-bold"
                                    disabled={isOAuthPending}
                                    onClick={handleConnectFacebook}
                                  >
                                    <RefreshCw
                                      className={
                                        isOAuthPending
                                          ? "mr-1.5 h-3.5 w-3.5 animate-spin"
                                          : "mr-1.5 h-3.5 w-3.5"
                                      }
                                    />
                                    Reconnect Pages
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3 p-2">
                              {totalPages === 0 && account ? (
                                <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs">
                                  <div className="flex items-start gap-2 text-amber-900">
                                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                    <div>
                                      <p className="font-extrabold">
                                        0 Pages discovered for this account
                                      </p>
                                      <p className="mt-1 font-medium leading-4 text-amber-800">
                                        If this account manages Pages inside Meta Business Manager, click Reconnect to grant business_management portfolio permissions.
                                      </p>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-2.5 h-7 border-amber-300 bg-white px-2.5 text-xs font-bold text-amber-900 shadow-none hover:bg-amber-100"
                                        disabled={isOAuthPending}
                                        onClick={() =>
                                          handleReconnectFacebook(account)
                                        }
                                      >
                                        <RefreshCw className="mr-1.5 h-3 w-3" />{" "}
                                        Reconnect &amp; Grant Portfolios
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {portfolios.map((portfolio) => (
                                <div
                                  key={portfolio.id}
                                  className="space-y-1.5 overflow-hidden rounded-md border border-slate-200 bg-white"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-100/70 px-3 py-1.5 text-xs font-bold text-slate-700">
                                    <span className="flex items-center gap-1.5 truncate">
                                      <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                                      <span className="truncate">
                                        {portfolio.name}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                                      {portfolio.pages.length}{" "}
                                      {portfolio.pages.length === 1
                                        ? "Page"
                                        : "Pages"}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 p-1.5">
                                    {portfolio.pages.map((page) => {
                                      const active = page.id === pageId;
                                      const routingSummary = [
                                        page.projectName &&
                                          `Project: ${page.projectName}`,
                                        page.sourceName &&
                                          `Source: ${page.sourceName}`,
                                        page.teamName &&
                                          `Team: ${page.teamName}`,
                                        (page.telecallerName || page.fieldExecutiveName) &&
                                          `Assignee: ${page.telecallerName || page.fieldExecutiveName}`,
                                      ].filter(Boolean);
                                      return (
                                        <button
                                          key={page.id}
                                          type="button"
                                          className={[
                                            "w-full rounded-md border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                            active
                                              ? "border-primary bg-primary/[0.04]"
                                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                          ].join(" ")}
                                          onClick={() =>
                                            handleSelectPage(page.id)
                                          }
                                        >
                                          <span className="flex items-start gap-2.5">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                                              <Building2 className="h-3.5 w-3.5" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                              <span className="flex items-start justify-between gap-2">
                                                <span className="truncate text-xs font-extrabold text-secondary">
                                                  {page.name}
                                                </span>
                                                <ChevronRight
                                                  className={
                                                    active
                                                      ? "h-4 w-4 shrink-0 text-primary"
                                                      : "h-4 w-4 shrink-0 text-slate-400"
                                                  }
                                                />
                                              </span>
                                              <span className="mt-1.5 flex flex-wrap gap-1">
                                                {page.discoveryPath ? (
                                                  <Badge className="border-0 bg-blue-50 px-1.5 py-0 text-[10px] text-blue-700">
                                                    {page.discoveryPath}
                                                  </Badge>
                                                ) : null}
                                                <StatusBadge
                                                  good={!page.isPaused}
                                                  goodLabel="Active"
                                                  issueLabel="Paused"
                                                />
                                                <StatusBadge
                                                  good={page.hasAccessToken}
                                                  goodLabel="Token ready"
                                                  issueLabel="Token missing"
                                                />
                                                <StatusBadge
                                                  good={Boolean(
                                                    page.leadgenSubscribed,
                                                  )}
                                                  goodLabel="Webhook live"
                                                  issueLabel="Needs review"
                                                />
                                              </span>
                                              {routingSummary.length ? (
                                                <span className="mt-1.5 block truncate text-[11px] font-bold text-primary">
                                                  {routingSummary.join(" | ")}
                                                </span>
                                              ) : null}
                                              <span className="mt-1 block text-[11px] font-bold text-slate-500">
                                                {page.formsEnabledCount} of{" "}
                                                {page.formsTotalCount} forms
                                                enabled
                                              </span>
                                            </span>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ),
                      )
                    ) : (
                      <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                        <Building2 className="mx-auto h-7 w-7 text-slate-400" />
                        <p className="mt-3 text-sm font-extrabold text-secondary">
                          No Pages connected
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                          Connect a Facebook account or securely add one Page
                          manually.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="flex flex-col h-[760px] min-w-0 overflow-hidden border-slate-200 bg-white shadow-card">
                  {selectedPage ? (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="shrink-0 border-b border-slate-200 px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                              <Link2 className="h-3.5 w-3.5" /> PAGE
                              CONFIGURATION
                            </div>
                            <h2 className="mt-2 truncate text-xl font-extrabold text-secondary">
                              {selectedPage.name}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-muted-foreground">
                              {selectedAccount?.name ||
                                selectedPage.accountName ||
                                "Facebook account"}{" "}
                              · {selectedPage.category || "Facebook Page"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                              <span className="text-xs font-bold text-slate-700">
                                Sync:{" "}
                                <span
                                  className={
                                    selectedPage.isPaused
                                      ? "font-extrabold text-amber-600"
                                      : "font-extrabold text-emerald-600"
                                  }
                                >
                                  {selectedPage.isPaused ? "Paused" : "Active"}
                                </span>
                              </span>
                              <Switch
                                checked={!selectedPage.isPaused}
                                onCheckedChange={async (checked) => {
                                  await mutations.togglePagePause.mutateAsync({
                                    pageId: selectedPage.id,
                                    isPaused: !checked,
                                  });
                                  toast.success(
                                    !checked
                                      ? `Paused lead syncing for ${selectedPage.name}`
                                      : `Resumed lead syncing for ${selectedPage.name}`,
                                  );
                                }}
                              />
                            </div>
                            <StatusBadge
                              good={selectedPage.hasAccessToken}
                              goodLabel="Page token secure"
                              issueLabel="Token needed"
                            />
                            <StatusBadge
                              good={Boolean(selectedPage.leadgenSubscribed)}
                              goodLabel="Leadgen live"
                              issueLabel="Webhook needs review"
                            />
                          </div>
                        </div>
                        {selectedPage.isPaused ? (
                          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <div className="flex items-center gap-2 font-bold">
                              <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                              <span>
                                Lead syncing for this Page is currently PAUSED. New leads from this page will be logged but skipped.
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 shrink-0 border-amber-300 bg-white text-xs font-bold text-amber-900 shadow-none hover:bg-amber-100"
                              disabled={mutations.togglePagePause.isPending}
                              onClick={async () => {
                                await mutations.togglePagePause.mutateAsync({
                                  pageId: selectedPage.id,
                                  isPaused: false,
                                });
                                toast.success(`Resumed lead syncing for ${selectedPage.name}`);
                              }}
                            >
                              Resume Page
                            </Button>
                          </div>
                        ) : null}
                        {selectedPage.subscriptionError ? (
                          <div className="mt-4 flex gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-extrabold">
                                {subscriptionGuidance.title}
                              </p>
                              <p className="mt-1 font-medium leading-5">
                                {subscriptionGuidance.detail}
                              </p>
                              <p className="mt-2 leading-5 text-amber-800">
                                {subscriptionGuidance.recovery}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                        <section className="border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
                          <div className="flex flex-col gap-3 border-b border-blue-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-base font-extrabold text-secondary">
                                Lead routing overrides
                              </h3>
                              <p className="mt-1 max-w-3xl text-sm font-medium leading-5 text-muted-foreground">
                                Form routing overrides take priority over page settings.
                                Page settings take priority over incoming form answers.
                                Person overrides bypass automatic assignment;
                                otherwise the selected team uses its matching
                                auto-assignment rule.
                                Without a person or team route, leads remain unassigned
                                unless a form explicitly enables automatic assignment.
                              </p>
                            </div>
                            {selectedProjectId ||
                            selectedSourceId ||
                            selectedTeamId ||
                            selectedOwnerId ||
                            selectedTelecallerId ||
                            selectedFieldExecutiveId ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-9 shrink-0 px-3 text-xs font-bold text-slate-700 hover:bg-white"
                                onClick={() => {
                                  setSelectedProjectId("");
                                  setSelectedSourceId("");
                                  setSelectedTeamId("");
                                  setSelectedOwnerId("");
                                  setSelectedTelecallerId("");
                                  setSelectedFieldExecutiveId("");
                                }}
                              >
                                Clear overrides
                              </Button>
                            ) : null}
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="min-w-0">
                              <p className="mb-2 text-xs font-extrabold text-secondary">
                                CRM project
                              </p>
                              <SearchableSelect
                                value={selectedProjectId}
                                onValueChange={setSelectedProjectId}
                                options={projectOptions}
                                placeholder="No project assigned"
                                searchPlaceholder="Search CRM projects..."
                                noOptionsText="No matching projects"
                                ariaLabel="Map Meta Page to CRM project"
                                className="h-11 border-slate-200 bg-white shadow-none"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="mb-2 text-xs font-extrabold text-secondary">
                                Lead source
                              </p>
                              <SearchableSelect
                                value={selectedSourceId}
                                onValueChange={setSelectedSourceId}
                                options={sourceOptions}
                                placeholder="Use Meta Ads source"
                                searchPlaceholder="Search lead sources..."
                                noOptionsText="No matching sources"
                                ariaLabel="Override Meta Page lead source"
                                className="h-11 border-slate-200 bg-white shadow-none"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="mb-2 text-xs font-extrabold text-secondary">
                                Route to team
                              </p>
                              <SearchableSelect
                                value={selectedTeamId}
                                onValueChange={setSelectedTeamId}
                                options={teamOptions}
                                placeholder="Use standard auto-assignment"
                                searchPlaceholder="Search CRM teams..."
                                noOptionsText="No matching teams"
                                ariaLabel="Route Meta Page leads to a team"
                                className="h-11 border-slate-200 bg-white shadow-none"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="mb-2 text-xs font-extrabold text-secondary">
                                Assign to
                              </p>
                              <SearchableSelect
                                value={selectedTelecallerId || selectedFieldExecutiveId || selectedOwnerId}
                                onValueChange={(val) => {
                                  const selection = mapRoutingAssigneeSelection(
                                    val,
                                    assigneeOptions,
                                  );
                                  setSelectedOwnerId(selection.ownerId);
                                  setSelectedTelecallerId(selection.telecallerId);
                                  setSelectedFieldExecutiveId(
                                    selection.fieldExecutiveId,
                                  );
                                }}
                                options={assigneeOptions}
                                placeholder="No user override"
                                searchPlaceholder="Search CRM users..."
                                noOptionsText="No matching users"
                                ariaLabel="Override assignee for Meta Page"
                                className="h-11 border-slate-200 bg-white shadow-none"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <StatusBadge
                              good={Boolean(selectedProjectId)}
                              goodLabel="Project mapped"
                              issueLabel="No project mapping"
                            />
                            <StatusBadge
                              good={Boolean(selectedSourceId)}
                              goodLabel="Source override"
                              issueLabel="Meta Ads source"
                            />
                            <StatusBadge
                              good={Boolean(selectedTeamId)}
                              goodLabel="Team route"
                              issueLabel="Default routing"
                            />
                            {selectedTelecallerId || selectedFieldExecutiveId || selectedOwnerId ? (
                              <Badge className="border-0 bg-violet-50 text-violet-700">
                                Assigned to: {
                                  leadFilterOptionsQuery.options.ownerOptions.find(
                                    (u) => u.value === (selectedTelecallerId || selectedFieldExecutiveId || selectedOwnerId),
                                  )?.label || "Selected user"
                                }
                              </Badge>
                            ) : null}
                            {selectedPage?.projectLocation &&
                            selectedProjectId === selectedPage.projectId ? (
                              <span className="text-muted-foreground">
                                {selectedPage.projectLocation}
                              </span>
                            ) : null}
                          </div>
                        </section>

                        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h3 className="text-base font-extrabold text-secondary">
                              Lead forms
                            </h3>
                            <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">
                              Only enabled forms create leads. New forms are
                              enabled when a Page is connected.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-md px-3 text-xs"
                              disabled={!forms.length}
                              onClick={() =>
                                setSelectedFormIds(forms.map((form) => form.id))
                              }
                            >
                              Enable all
                            </Button>
                            <Button
                              type="button"
                              className="h-9 rounded-md px-3 text-xs"
                              disabled={isSaving || !pageId}
                              onClick={handleSavePageConfiguration}
                            >
                              {mutations.savePageForms.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              {mutations.savePageForms.isPending
                                ? "Saving..."
                                : "Save page configuration"}
                            </Button>
                          </div>
                        </div>
                        {formsQuery.isFetching ? (
                          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading Page forms...
                          </div>
                        ) : formsQuery.isError ? (
                          <div className="mt-5 border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                            <p className="font-extrabold">
                              Forms could not be loaded
                            </p>
                            <p className="mt-1 font-medium">
                              Check Page token access and the Meta lead
                              retrieval permission, then reconnect this Page.
                            </p>
                          </div>
                        ) : forms.length ? (
                          <div className="overflow-hidden border border-slate-100 bg-white">
                            <div className="divide-y divide-slate-100 px-4">
                              {visibleForms.map((form: MetaLeadForm) => {
                                const enabled = selectedFormIds.includes(
                                  form.id,
                                );
                                return (
                                  <div
                                    key={form.id}
                                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                                        <p className="truncate text-sm font-extrabold text-secondary">
                                          {form.name}
                                        </p>
                                      </div>
                                      <p className="mt-1 pl-6 text-xs font-medium text-muted-foreground">
                                        {form.status || "Unknown status"} ·{" "}
                                        {form.leadsCount.toLocaleString(
                                          "en-IN",
                                        )}{" "}
                                        responses · Created{" "}
                                        {formatDateTime(form.createdTime)}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                                      <Badge variant="neutral">
                                        {Object.keys(integration?.formRoutingOverrides?.[pageId]?.[form.id] ?? {}).length
                                          ? "Custom routing" : "Uses page routing"}
                                      </Badge>
                                      <Button type="button" variant="outline" size="sm"
                                        aria-label={`Configure routing for ${form.name}`}
                                        disabled={mutations.savePageForms.isPending}
                                        onClick={() => {
                                          if (hasUnsavedPageConfiguration) {
                                            toast.error("Save your page configuration before configuring form routing.");
                                            return;
                                          }
                                          setRoutingForm(form);
                                        }}>
                                        Configure routing
                                      </Button>
                                      {enabled ? (
                                        <Badge className="border-0 bg-emerald-50 text-emerald-800">
                                          Enabled
                                        </Badge>
                                      ) : (
                                        <Badge className="border border-slate-200 bg-white text-slate-700">
                                          Off
                                        </Badge>
                                      )}
                                      <Switch
                                        checked={enabled}
                                        onCheckedChange={() => {
                                          toggleForm(form.id);
                                          if (!enabled && form.isPaused) {
                                            void mutations.toggleFormPause.mutateAsync({
                                              formId: form.id,
                                              isPaused: false,
                                              pageId,
                                            });
                                          }
                                        }}
                                        aria-label={`Enable ${form.name}`}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {forms.length > FORMS_PER_PAGE ? (
                              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Showing {(formsPage - 1) * FORMS_PER_PAGE + 1}
                                  -
                                  {Math.min(
                                    formsPage * FORMS_PER_PAGE,
                                    forms.length,
                                  )}{" "}
                                  of {forms.length} forms
                                </p>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs"
                                    disabled={formsPage === 1}
                                    onClick={() =>
                                      setFormsPage((current) => current - 1)
                                    }
                                  >
                                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />{" "}
                                    Previous
                                  </Button>
                                  <span className="text-xs font-bold text-secondary">
                                    {formsPage} / {formsPageCount}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs"
                                    disabled={formsPage === formsPageCount}
                                    onClick={() =>
                                      setFormsPage((current) => current + 1)
                                    }
                                  >
                                    Next{" "}
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="py-12 text-center">
                            <FileText className="mx-auto h-7 w-7 text-slate-400" />
                            <p className="mt-3 text-sm font-extrabold text-secondary">
                              No Instant Forms found
                            </p>
                            <p className="mt-1 text-xs font-medium text-muted-foreground">
                              Meta returned no forms for this Page.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8 text-center">
                      <div className="max-w-sm">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                          <Building2 className="h-6 w-6" />
                        </span>
                        <h2 className="mt-4 text-lg font-extrabold text-secondary">
                          Select a Page to configure forms
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                          Use OAuth to discover all managed Pages, or add one
                          Page manually while Facebook Login is unavailable.
                        </p>
                        <Button
                          type="button"
                          className="mt-5 h-10 rounded-md px-4"
                          onClick={() => setManualDialogOpen(true)}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Add Page manually
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Card className="border-slate-200 bg-white p-5 shadow-card sm:p-6">
                  <div className="flex flex-col gap-1 border-b border-slate-200 pb-5">
                    <h2 className="text-lg font-extrabold text-secondary">
                      Map form fields to CRM
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground">
                      Define how responses from enabled Meta forms are stored.
                      Lead name and mobile remain required.
                    </p>
                  </div>
                  <div className="mt-4 overflow-hidden border border-slate-200">
                    <div className="grid grid-cols-[minmax(140px,0.8fr)_minmax(220px,1.2fr)] bg-slate-50 text-xs font-extrabold text-secondary">
                      <div className="border-r border-slate-200 px-4 py-3">
                        Meta field
                      </div>
                      <div className="px-4 py-3">CRM destination</div>
                    </div>
                    {integration.sourceFields.map((field: MetaSourceField) => (
                      <div
                        key={field.key}
                        className="grid grid-cols-[minmax(140px,0.8fr)_minmax(220px,1.2fr)] border-t border-slate-200"
                      >
                        <div className="border-r border-slate-200 px-4 py-3">
                          <p className="text-sm font-bold text-secondary">
                            {field.label}
                          </p>
                          <p className="mt-1 text-xs font-medium text-muted-foreground">
                            Example: {field.sample}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <SearchableSelect
                            value={fieldMapping[field.key] ?? "skip"}
                            onValueChange={(value) =>
                              setFieldMapping((current) => ({
                                ...current,
                                [field.key]: value,
                              }))
                            }
                            options={fieldOptions}
                            placeholder="Do not import"
                            searchPlaceholder="Search CRM fields..."
                            className="h-10 border-slate-200 shadow-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button
                      type="button"
                      className="h-10 rounded-md px-4"
                      disabled={isSaving}
                      onClick={handleSaveMapping}
                    >
                      Save field mapping
                    </Button>
                  </div>
                </Card>
                <aside className="space-y-4">
                  <Card className="border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <h2 className="text-base font-extrabold text-secondary">
                          Integration health
                        </h2>
                        <dl className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Page token
                            </dt>
                            <dd>
                              <StatusBadge
                                good={integration.pageAccessTokenConfigured}
                                goodLabel="Stored"
                                issueLabel="Missing"
                              />
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Webhook endpoint
                            </dt>
                            <dd className="text-right font-bold text-secondary">
                              {integration.isActive ? "Active" : "Paused"}
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Last imported
                            </dt>
                            <dd className="max-w-[150px] text-right font-bold text-secondary">
                              {formatDateTime(integration.stats.lastImportedAt)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-blue-100 bg-blue-50 p-5 shadow-card">
                    <div className="flex gap-3">
                      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                      <p className="text-xs font-semibold leading-6 text-blue-950">
                        Page tokens are sent only to the API for validation and
                        storage. They are never returned to this screen after
                        saving.
                      </p>
                    </div>
                  </Card>
                  <div className="border border-slate-200 bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                      onClick={() => setAdvancedOpen((value) => !value)}
                    >
                      <span>
                        <span className="block text-sm font-extrabold text-secondary">
                          Webhook setup details
                        </span>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          Callback URL and verification token for Meta.
                        </span>
                      </span>
                      <ChevronRight
                        className={
                          advancedOpen
                            ? "h-4 w-4 rotate-90 text-slate-600 transition-transform"
                            : "h-4 w-4 text-slate-600 transition-transform"
                        }
                      />
                    </button>
                    {advancedOpen ? (
                      <div className="space-y-3 border-t border-slate-200 p-4">
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">
                            Callback URL
                          </p>
                          <p className="mt-1 break-all text-xs font-bold text-secondary">
                            {integration.endpointUrl}
                          </p>
                          <div className="mt-2">
                            <CopyButton
                              label="Callback URL"
                              value={integration.endpointUrl}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">
                            Verify token
                          </p>
                          <p className="mt-1 break-all font-mono text-xs font-bold text-secondary">
                            {integration.verifyToken}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <CopyButton
                              label="Verify token"
                              value={integration.verifyToken}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-md px-3 text-xs"
                              disabled={
                                mutations.regenerateVerifyToken.isPending
                              }
                              onClick={() =>
                                mutations.regenerateVerifyToken
                                  .mutateAsync()
                                  .then(() =>
                                    toast.success("Verify token regenerated"),
                                  )
                              }
                            >
                              <RefreshCw className="mr-2 h-3.5 w-3.5" />
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </aside>
              </section>

              <Card className="overflow-hidden border-slate-200 bg-white shadow-card">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-secondary">
                      Webhook delivery log
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Every Meta webhook received by CRM, including skipped and
                      failed lead imports.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-md px-3 text-xs"
                    disabled={deliveryLogsQuery.isFetching}
                    onClick={() => void deliveryLogsQuery.refetch()}
                  >
                    <RefreshCw
                      className={
                        deliveryLogsQuery.isFetching
                          ? "mr-2 h-3.5 w-3.5 animate-spin"
                          : "mr-2 h-3.5 w-3.5"
                      }
                    />
                    Refresh logs
                  </Button>
                </div>
                {deliveryLogsQuery.isLoading ? (
                  <div className="flex min-h-44 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading webhook activity...
                  </div>
                ) : deliveryLogsQuery.isError ? (
                  <div className="m-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Webhook logs could not be loaded. Refresh and try again.
                  </div>
                ) : deliveryLogsQuery.data?.data.length ? (
                  <>
                    <div className="divide-y divide-slate-100">
                      {deliveryLogsQuery.data.data.map(
                        (log: MetaDeliveryLog) => {
                          const created = log.action === "META_LEAD_RECEIVED";
                          const failed = log.action === "META_LEAD_FAILED";
                          const skipped =
                            log.action === "META_LEAD_SKIPPED" ||
                            log.action === "META_DUPLICATE_LEAD_RECEIVED";
                          const label = created
                            ? "Lead created"
                            : failed
                            ? "Import failed"
                            : skipped
                            ? "Skipped"
                            : "Webhook received";
                          return (
                            <div
                              key={log.id}
                              className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={
                                      created
                                        ? "border-0 bg-emerald-50 text-emerald-700"
                                        : failed
                                        ? "border-0 bg-red-50 text-red-700"
                                        : skipped
                                        ? "border-0 bg-amber-50 text-amber-800"
                                        : "border-0 bg-blue-50 text-blue-700"
                                    }
                                  >
                                    {label}
                                  </Badge>
                                  {log.routingScope ? (
                                    <Badge variant="neutral">{log.routingScope === "form" ? "Form routing" : "Page routing"}</Badge>
                                  ) : null}
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    {formatDateTime(log.occurredAt)}
                                  </span>
                                </div>
                                <p className="mt-2 truncate text-sm font-bold text-secondary">
                                  {log.outcome ||
                                    log.reason ||
                                    (log.eventCount
                                      ? `${log.eventCount} lead event${
                                          log.eventCount === 1 ? "" : "s"
                                        } received from Meta`
                                      : "Meta webhook accepted by CRM")}
                                </p>
                                <p className="mt-1 truncate font-mono text-xs font-medium text-muted-foreground">
                                  {log.leadgenId
                                    ? `Leadgen ID: ${log.leadgenId}`
                                    : log.displayId
                                    ? `CRM lead: ${log.displayId}`
                                    : log.pageId
                                    ? `Page ID: ${log.pageId}`
                                    : "No lead ID supplied"}
                                </p>
                                {log.routingFallbacks?.length ? (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Used default routing because configured {log.routingFallbacks.join(", ")} selections were unavailable.
                                  </p>
                                ) : null}
                              </div>
                              {log.displayId ? (
                                <span className="text-xs font-extrabold text-primary">
                                  {log.displayId}
                                </span>
                              ) : null}
                            </div>
                          );
                        },
                      )}
                    </div>
                    {deliveryLogsQuery.data.meta.totalPages > 1 ? (
                      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Showing page {deliveryLogsQuery.data.meta.page} of{" "}
                          {deliveryLogsQuery.data.meta.totalPages} ·{" "}
                          {deliveryLogsQuery.data.meta.total} events
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2.5 text-xs"
                            disabled={deliveryLogPage === 1}
                            onClick={() =>
                              setDeliveryLogPage((current) => current - 1)
                            }
                          >
                            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2.5 text-xs"
                            disabled={
                              deliveryLogPage ===
                              deliveryLogsQuery.data.meta.totalPages
                            }
                            onClick={() =>
                              setDeliveryLogPage((current) => current + 1)
                            }
                          >
                            Next
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="px-5 py-12 text-center sm:px-6">
                    <ShieldCheck className="mx-auto h-7 w-7 text-slate-400" />
                    <p className="mt-3 text-sm font-extrabold text-secondary">
                      No webhook events received yet
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      Submit a real Meta Instant Form lead, then refresh this
                      log to confirm CRM receipt.
                    </p>
                  </div>
                )}
              </Card>
            </>
          )}
      </WorkspacePage>

      {routingForm && integration ? (
        <MetaFormRoutingDialog key={`${pageId}:${routingForm.id}`} pageId={pageId}
          formId={routingForm.id} formName={routingForm.name} settings={integration}
          projectOptions={projectOptions} sourceOptions={sourceOptions}
          teamOptions={teamOptions} assigneeOptions={assigneeOptions}
          onClose={() => setRoutingForm(null)}
          onSave={async (routing) => {
            await mutations.saveFormRouting.mutateAsync({ pageId, formId: routingForm.id, routing });
            toast.success("Form routing saved");
          }} />
      ) : null}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start gap-3 pr-8">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl text-secondary">
                  Add a Meta Page manually
                </DialogTitle>
                <DialogDescription className="mt-1 max-w-xl font-medium leading-6">
                  Use this recovery path when Facebook Login is unavailable. CRM
                  verifies the Page token, discovers forms, and checks the
                  leadgen webhook before saving.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-bold text-blue-900">
                  1. Enter credentials
                </p>
                <p className="mt-1 text-xs font-medium text-blue-800">
                  Page ID and Page token
                </p>
              </div>
              <div className="border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold text-slate-800">
                  2. CRM validates
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  Page identity and access
                </p>
              </div>
              <div className="border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold text-slate-800">
                  3. Forms enabled
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  Review and adjust later
                </p>
              </div>
            </div>
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex gap-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-extrabold">
                    Use a Page access token, not an app secret
                  </p>
                  <p className="mt-1 font-medium leading-5">
                    The token is submitted to the CRM API over HTTPS and will
                    not be shown again after this connection is saved.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-secondary">
                  Meta Page ID <span className="text-red-600">*</span>
                </span>
                <Input
                  autoFocus
                  value={manualPageId}
                  onChange={(event) => setManualPageId(event.target.value)}
                  placeholder="Example: 123456789012345"
                  className="h-11 border-slate-200 shadow-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-secondary">
                  Account label
                </span>
                <Input
                  value={manualAccountName}
                  onChange={(event) => setManualAccountName(event.target.value)}
                  placeholder="Example: Mumbai campaigns"
                  className="h-11 border-slate-200 shadow-none"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-secondary">
                Page access token <span className="text-red-600">*</span>
              </span>
              <Input
                type="password"
                autoComplete="off"
                value={manualPageToken}
                onChange={(event) => setManualPageToken(event.target.value)}
                placeholder="Paste the Page access token"
                className="h-11 border-slate-200 shadow-none"
              />
              <span className="block text-xs font-medium leading-5 text-muted-foreground">
                CRM matches this token to the supplied Page ID, retrieves forms,
                and subscribes the Page to leadgen where Meta permits it.
              </span>
            </label>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Stored Page tokens are never returned in API responses.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4"
                onClick={() => setManualDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-md px-4"
                disabled={mutations.addManualPage.isPending}
                onClick={handleManualConnect}
              >
                {mutations.addManualPage.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {mutations.addManualPage.isPending
                  ? "Verifying Page..."
                  : "Verify and add Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(accountToDelete)}
        onOpenChange={(open) => {
          if (!open && !mutations.disconnectAccount.isPending) {
            setAccountToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-extrabold text-secondary">
                  Disconnect Facebook Account
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  {accountToDelete?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 rounded-md border border-red-100 bg-red-50/60 p-4 text-xs leading-5 text-red-900">
            <p className="font-extrabold text-red-700">
              Warning: Disconnecting this account will remove:
            </p>
            <ul className="mt-2 space-y-1 font-semibold list-disc pl-4 text-red-800">
              <li>All connected Facebook Pages linked to this account</li>
              <li>Lead form webhook subscriptions and auto-routing configurations</li>
            </ul>
            <p className="mt-2 font-semibold">
              Leads already imported into Truroot CRM will remain safe in your database.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              disabled={mutations.disconnectAccount.isPending}
              onClick={() => setAccountToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md bg-red-600 px-4 text-xs font-extrabold text-white hover:bg-red-700 shadow-none"
              disabled={mutations.disconnectAccount.isPending}
              onClick={async () => {
                if (!accountToDelete) return;
                try {
                  await mutations.disconnectAccount.mutateAsync(accountToDelete.id);
                  toast.success(`Disconnected ${accountToDelete.name}`);
                  setAccountToDelete(null);
                } catch {
                  toast.error("Could not disconnect Facebook account");
                }
              }}
            >
              {mutations.disconnectAccount.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Disconnecting...
                </span>
              ) : (
                "Disconnect Account"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
