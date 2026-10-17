import { displayReference } from "../../../../../common/displayReference";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe2,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  SearchableSelect,
  Textarea,
  cn,
} from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { useProjects } from "../../../projects/useProjectsApi";
import { useLeadListFilterOptions } from "../../all/useAllLeads";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import { Header } from "../magicbricks/components/SharedMagicBricksComponents";
import type {
  ConnectedWebsiteItem,
  WebsiteDeliveryLog,
  WebsiteFieldOption,
  WebsiteSourceField,
} from "./useWebsiteIntegration";
import {
  useWebsiteDeliveryLogs,
  useWebsiteIntegration,
  useWebsiteIntegrationMutations,
} from "./useWebsiteIntegration";
import { getApiErrorMessage } from "../../../../../common/apiError";
import {
  getRoutingAssigneeOptions,
  mapRoutingAssigneeSelection,
} from "../routingAssignee";

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

export function ConnectWebsiteScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedTelecallerId, setSelectedTelecallerId] = useState("");
  const [selectedFieldExecutiveId, setSelectedFieldExecutiveId] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Test simulator form state
  const [testLeadName, setTestLeadName] = useState("Rahul Verma");
  const [testLeadMobile, setTestLeadMobile] = useState("9876543210");
  const [testLeadEmail, setTestLeadEmail] = useState("rahul@example.com");
  const [testLeadConfig, setTestLeadConfig] = useState("2 BHK");

  const [deliveryLogPage, setDeliveryLogPage] = useState(1);

  const navigate = useNavigate();
  const integrationQuery = useWebsiteIntegration();
  const mutations = useWebsiteIntegrationMutations();
  const deliveryLogsQuery = useWebsiteDeliveryLogs(deliveryLogPage);
  const integration = integrationQuery.data;
  const projectsQuery = useProjects("");
  const leadFilterOptionsQuery = useLeadListFilterOptions();

  useEffect(() => {
    if (!integration) return;
    setNotes(integration.notes ?? "");
    setFieldMapping(integration.fieldMapping ?? {});
    if (integration.connectedWebsites.length > 0 && !selectedWebsiteId) {
      setSelectedWebsiteId(integration.connectedWebsites[0].id);
    }
  }, [integration, selectedWebsiteId]);

  const selectedWebsite = useMemo(
    () =>
      (integration?.connectedWebsites ?? []).find(
        (site: any) => site.id === selectedWebsiteId,
      ) ?? null,
    [integration?.connectedWebsites, selectedWebsiteId],
  );

  useEffect(() => {
    if (selectedWebsite) {
      setSelectedProjectId(selectedWebsite.projectId ?? "");
      setSelectedSourceId(selectedWebsite.sourceId ?? "");
      setSelectedTeamId(selectedWebsite.teamId ?? "");
      setSelectedOwnerId(selectedWebsite.ownerId ?? "");
      setSelectedTelecallerId(selectedWebsite.telecallerId ?? "");
      setSelectedFieldExecutiveId(selectedWebsite.fieldExecutiveId ?? "");
    }
  }, [selectedWebsite]);

  const fieldOptions = useMemo(
    () =>
      (integration?.fieldOptions ?? []).map((option: WebsiteFieldOption) => ({
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
        .filter((project: any) => project.status !== "Archived")
        .map((project: any) => ({
          value: project.id,
          label: project.name,
          description: project.location || "CRM project",
        }))
        .sort((a: any, b: any) =>
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
        label: "Use Website source",
        description: "Keep standard Website source for incoming leads",
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
    mutations.saveConfig.isPending ||
    mutations.addWebsiteUrl.isPending ||
    mutations.deleteWebsiteUrl.isPending ||
    mutations.saveWebsiteRouting.isPending ||
    mutations.saveFieldMapping.isPending;

  const handleAddWebsiteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = newWebsiteUrl.trim();
    if (!url) {
      toast.error("Please enter a valid website URL");
      return;
    }
    await mutations.addWebsiteUrl.mutateAsync({ url });
    setNewWebsiteUrl("");
    setAddModalOpen(false);
    toast.success("Website connected successfully!");
  };

  const handleSaveRouting = async () => {
    if (!selectedWebsiteId) return;
    try {
      await mutations.saveWebsiteRouting.mutateAsync({
        websiteId: selectedWebsiteId,
        projectId: selectedProjectId,
        sourceId: selectedSourceId,
        teamId: selectedTeamId,
        ownerId: selectedOwnerId,
        telecallerId: selectedTelecallerId,
        fieldExecutiveId: selectedFieldExecutiveId,
      });
      toast.success("Website lead routing overrides saved!");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not save website routing overrides"),
      );
    }
  };

  const handleSaveMapping = async () => {
    await mutations.saveFieldMapping.mutateAsync(fieldMapping);
    toast.success("Website lead field mapping saved!");
  };

  const handleTestSubmission = async () => {
    if (!testLeadName.trim() || !testLeadMobile.trim()) {
      toast.error("Enter lead name and mobile number for test.");
      return;
    }
    const result = await mutations.testConnection.mutateAsync({
      name: testLeadName,
      mobile: testLeadMobile,
      email: testLeadEmail,
      configuration: testLeadConfig,
      websiteUrl:
        selectedWebsite?.url || "https://jpnorthgarden.projectmiraroad.com/",
    });
    if (result.wouldCreateLead) {
      toast.success(
        `Test webhook verified! Lead created for ${result.normalizedLead.leadName}`,
      );
    } else {
      toast.error(
        result.errors.join(". ") || "Test submission encountered an issue",
      );
    }
  };

  const simpleScriptSnippet = useMemo(() => {
    const endpoint =
      integration?.endpointUrl ||
      "https://crmtrueroot.com/api/integrations/website/leads";
    const trackerUrl = endpoint.replace("/leads", "/tracker.js");
    return `<script src="${trackerUrl}" defer></script>`;
  }, [integration?.endpointUrl]);

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
          breadcrumbs={["Import leads", "Website Source"]}
      />
      <WorkspacePage className="space-y-6">
          <section className="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Globe2 className="h-4 w-4" />
                Website Lead Capture
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
                Connect your Website to Truroot Realty CRM
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                Get instant alerts when a new lead is submitted on your website,
                with the contact auto-created in your account for immediate
                follow up.
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
                className="h-10 min-w-0 rounded-md px-4 text-xs sm:text-sm"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add website URL
              </Button>
            </div>
          </section>

          {integrationQuery.isLoading ? (
            <Card className="border-slate-200 p-8 shadow-card">
              <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading website
                connection workspace...
              </div>
            </Card>
          ) : !integration ? (
            <Card className="border-slate-200 p-8 shadow-card">
              <p className="text-sm font-semibold text-muted-foreground">
                Website setup could not be loaded. Refresh and try again.
              </p>
            </Card>
          ) : (
            <>
              {/* Privyr Connection Banner */}
              <Card className="rounded-md border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-3 flex items-center justify-center gap-4 text-primary">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Globe2 className="h-6 w-6" />
                    </span>
                    <span className="text-xl font-bold text-slate-400">↔</span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-secondary">
                    Connect your Website to Truroot Realty CRM
                  </h2>
                  <p className="mt-1 max-w-xl text-xs font-semibold text-muted-foreground">
                    Get instant alerts when a new lead is submitted on your
                    website, with the contact auto-created in your account for
                    immediate follow up.
                  </p>

                  <form
                    onSubmit={handleAddWebsiteSubmit}
                    className="mt-5 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      value={newWebsiteUrl}
                      placeholder="https://jpnorthgarden.projectmiraroad.com/"
                      className="h-11 rounded-md border-slate-300 text-sm font-semibold shadow-none"
                      onChange={(e) => setNewWebsiteUrl(e.target.value)}
                    />
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="h-11 shrink-0 rounded-md px-6 font-bold"
                    >
                      {mutations.addWebsiteUrl.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Submit
                    </Button>
                  </form>

                  {/* Connected website URL chips */}
                  {integration.connectedWebsites.length > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {integration.connectedWebsites.map((site: any) => (
                        <div
                          key={site.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition-all",
                            site.id === selectedWebsiteId
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-slate-200 bg-slate-50 text-secondary hover:bg-slate-100",
                          )}
                        >
                          <button
                            type="button"
                            className="max-w-[220px] truncate hover:underline"
                            onClick={() => setSelectedWebsiteId(site.id)}
                          >
                            {site.url}
                          </button>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-red-600"
                            onClick={async () => {
                              await mutations.deleteWebsiteUrl.mutateAsync(
                                site.id,
                              );
                              toast.success("Website removed");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>

              {/* Stats Bar */}
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
                    Connected Websites
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-secondary">
                    {integration.connectedWebsites.length}
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-bold text-muted-foreground">
                    Total Leads Received
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-secondary">
                    {integration.totalLeadsReceived.toLocaleString("en-IN")}
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
                    {formatDateTime(integration.lastLeadReceivedAt)}
                  </p>
                </div>
              </section>

              {/* Connected Websites List & Override Details */}
              <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.6fr)]">
                {/* Left Card: Connected Websites */}
                <Card className="overflow-hidden border-slate-200 bg-white shadow-card">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
                    <div>
                      <h2 className="text-base font-extrabold text-secondary">
                        Connected Websites
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">
                        Select a website to configure its project mapping,
                        routing rules, and embed script.
                      </p>
                    </div>
                    <Badge className="border-0 bg-slate-100 text-slate-700">
                      {integration.connectedWebsites.length}
                    </Badge>
                  </div>
                  <div className="max-h-[620px] space-y-3 overflow-y-auto p-3">
                    {integration.connectedWebsites.length ? (
                      integration.connectedWebsites.map(
                        (site: ConnectedWebsiteItem) => {
                          const active = site.id === selectedWebsiteId;
                          const routingSummary = [
                            site.projectName && `Project: ${site.projectName}`,
                            site.sourceName && `Source: ${site.sourceName}`,
                            site.teamName && `Team: ${site.teamName}`,
                            (site.telecallerName || site.fieldExecutiveName) &&
                              `Assignee: ${site.telecallerName || site.fieldExecutiveName}`,
                          ].filter(Boolean);
                          return (
                            <button
                              key={site.id}
                              type="button"
                              className={cn(
                                "w-full border p-4 text-left transition-colors focus-visible:outline-none",
                                active
                                  ? "border-primary bg-primary/[0.04]"
                                  : "border-slate-200 bg-white hover:bg-slate-50",
                              )}
                              onClick={() => setSelectedWebsiteId(site.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-secondary">
                                    {site.name || site.url}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                                    {site.url}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-400 hover:text-red-600"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await mutations.deleteWebsiteUrl.mutateAsync(
                                      site.id,
                                    );
                                    toast.success("Website deleted");
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <Badge className="border-0 bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                                  {site.leadsCount} leads captured
                                </Badge>
                                {routingSummary.length ? (
                                  <span className="block w-full truncate text-xs font-bold text-primary">
                                    {routingSummary.join(" | ")}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        },
                      )
                    ) : (
                      <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                        <Globe2 className="mx-auto h-7 w-7 text-slate-400" />
                        <p className="mt-3 text-sm font-extrabold text-secondary">
                          No websites connected yet
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                          Add your website URL above to generate integration
                          scripts and route leads.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Right Card: Website Lead Routing Overrides & Embed Code */}
                <Card className="min-w-0 border-slate-200 bg-white shadow-card">
                  {selectedWebsite ? (
                    <div>
                      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                              <Link2 className="h-3.5 w-3.5" /> WEBSITE
                              CONFIGURATION
                            </div>
                            <h2 className="mt-2 truncate text-xl font-extrabold text-secondary">
                              {selectedWebsite.name || selectedWebsite.url}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-muted-foreground">
                              {selectedWebsite.url}
                            </p>
                          </div>
                          <StatusBadge
                            good={true}
                            goodLabel="Website Ready"
                            issueLabel="Setup Pending"
                          />
                        </div>
                      </div>

                      <div className="space-y-6 p-5 sm:p-6">
                        {/* Lead Routing Overrides Section */}
                        <section className="border border-blue-100 bg-blue-50/60 p-4 sm:p-5 rounded-md">
                          <div className="flex flex-col gap-3 border-b border-blue-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-base font-extrabold text-secondary">
                                Lead routing overrides
                              </h3>
                              <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-muted-foreground">
                                Page selections take priority over form values.
                                Person overrides bypass automatic assignment;
                                otherwise the selected team uses its matching
                                auto-assignment rule.
                                Without a person or team route, leads remain unassigned.
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
                                placeholder="Use Website source"
                                searchPlaceholder="Search lead sources..."
                                noOptionsText="No matching sources"
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
                                className="h-11 border-slate-200 bg-white shadow-none"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                              <StatusBadge
                                good={Boolean(selectedProjectId)}
                                goodLabel="Project mapped"
                                issueLabel="No project mapping"
                              />
                              <StatusBadge
                                good={Boolean(selectedSourceId)}
                                goodLabel="Source override"
                                issueLabel="Website source"
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
                            </div>
                            <Button
                              type="button"
                              className="h-9 rounded-md px-4 text-xs font-bold"
                              disabled={isSaving}
                              onClick={handleSaveRouting}
                            >
                              {mutations.saveWebsiteRouting.isPending ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                              )}
                              {mutations.saveWebsiteRouting.isPending
                                ? "Saving..."
                                : "Save routing overrides"}
                            </Button>
                          </div>
                        </section>

                        {/* Implementation Script Snippet Box */}
                        <section className="space-y-4">
                          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs font-semibold text-amber-900 flex items-start gap-2">
                            <span className="text-amber-600 font-bold shrink-0">
                              💡 TIP:
                            </span>
                            <span>
                              If your website uses template scripts like{" "}
                              <code>app.js</code> or jQuery that call{" "}
                              <code>e.preventDefault()</code>,{" "}
                              <strong>Option 1 (1-Line Script)</strong> is
                              recommended as it bypasses template restrictions
                              and automatically captures inline & pop-up modal
                              forms (<code>#enqModal</code>).
                            </span>
                          </div>

                          {/* Option 1: 1-Line Tracker Script */}
                          <div className="rounded-md border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                                  <Badge className="border-0 bg-primary text-white text-[10px] uppercase font-bold px-1.5 py-0.5">
                                    Option 1 (Recommended)
                                  </Badge>
                                  1-Line Website Tracker Script (&lt;script
                                  /&gt;)
                                </h3>
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                  Paste this single tag before &lt;/body&gt; or
                                  in &lt;head&gt;. Works automatically with all
                                  forms &amp; pop-up modals.
                                </p>
                              </div>
                              <CopyButton
                                label="1-Line Script"
                                value={simpleScriptSnippet}
                              />
                            </div>
                            <Input
                              readOnly
                              value={simpleScriptSnippet}
                              className="h-10 rounded-md bg-slate-900 text-slate-100 border-slate-700 font-mono text-xs font-semibold shadow-none"
                            />
                          </div>

                          {/* Option 2: Direct Form Action Tag */}
                          <div className="rounded-md border border-slate-200 p-4 space-y-3 bg-slate-50/60">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                                  <Badge className="border-0 bg-slate-200 text-slate-700 text-[10px] uppercase font-bold px-1.5 py-0.5">
                                    Option 2
                                  </Badge>
                                  Direct HTML Form Action Tag
                                </h3>
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                  Replace your website &lt;form ...&gt; tag with
                                  this line if your form does not use custom
                                  template JS.
                                </p>
                              </div>
                              <CopyButton
                                label="HTML Form Tag"
                                value={`<form action="${integration.endpointUrl}" method="POST" class="form-modal">`}
                              />
                            </div>
                            <Input
                              readOnly
                              value={`<form action="${integration.endpointUrl}" method="POST" class="form-modal">`}
                              className="h-10 rounded-md bg-white border-slate-200 font-mono text-xs font-semibold shadow-none"
                            />
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Supported fields: <code>name</code>,{" "}
                              <code>mobile</code> (or <code>fullMobileNo</code>
                              ), <code>email</code>, <code>configuration</code>,{" "}
                              <code>project</code>.
                            </p>
                          </div>
                        </section>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[560px] items-center justify-center p-8 text-center">
                      <div className="max-w-sm">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                          <Globe2 className="h-6 w-6" />
                        </span>
                        <h2 className="mt-4 text-lg font-extrabold text-secondary">
                          Select a website to configure
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                          Enter your website URL above to generate integration
                          script and configure routing overrides.
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </section>

              {/* Field Mapping & Live Webhook Simulator */}
              <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <Card className="border-slate-200 bg-white p-5 shadow-card sm:p-6">
                  <div className="flex flex-col gap-1 border-b border-slate-200 pb-5">
                    <h2 className="text-lg font-extrabold text-secondary">
                      Map form fields to CRM
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground">
                      Define how responses from your website forms are stored.
                      Lead name and mobile number are required.
                    </p>
                  </div>
                  <div className="mt-4 overflow-hidden border border-slate-200">
                    <div className="grid grid-cols-[minmax(140px,0.8fr)_minmax(220px,1.2fr)] bg-slate-50 text-xs font-extrabold text-secondary">
                      <div className="border-r border-slate-200 px-4 py-3">
                        Website Form Field
                      </div>
                      <div className="px-4 py-3">CRM destination</div>
                    </div>
                    {integration.sourceFields.map(
                      (field: WebsiteSourceField) => (
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
                      ),
                    )}
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
                  {/* Webhook Test Simulator */}
                  <Card className="border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <ShieldCheck className="h-5 w-5 text-success" />
                      <h2 className="text-base font-extrabold text-secondary">
                        Test Lead Simulator
                      </h2>
                    </div>
                    <p className="mt-3 text-xs font-medium text-muted-foreground leading-relaxed">
                      Send a test lead right now to verify that your website
                      lead integration and routing rules work cleanly.
                    </p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-xs font-extrabold text-secondary">
                          Full Name
                        </label>
                        <Input
                          value={testLeadName}
                          onChange={(e) => setTestLeadName(e.target.value)}
                          className="h-9 mt-1 rounded-md text-xs font-semibold shadow-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-secondary">
                          Mobile Number
                        </label>
                        <Input
                          value={testLeadMobile}
                          onChange={(e) => setTestLeadMobile(e.target.value)}
                          className="h-9 mt-1 rounded-md text-xs font-semibold shadow-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-secondary">
                          Email Address
                        </label>
                        <Input
                          value={testLeadEmail}
                          onChange={(e) => setTestLeadEmail(e.target.value)}
                          className="h-9 mt-1 rounded-md text-xs font-semibold shadow-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-secondary">
                          Configuration
                        </label>
                        <Input
                          value={testLeadConfig}
                          onChange={(e) => setTestLeadConfig(e.target.value)}
                          className="h-9 mt-1 rounded-md text-xs font-semibold shadow-none"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full h-10 mt-2 rounded-md text-xs font-bold"
                        disabled={mutations.testConnection.isPending}
                        onClick={handleTestSubmission}
                      >
                        {mutations.testConnection.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Submit Test Lead
                      </Button>
                    </div>
                  </Card>

                  {/* Operational Notes */}
                  <Card className="border-slate-200 bg-white p-5 shadow-card">
                    <label className="text-sm font-extrabold text-secondary">
                      Internal Operational Notes
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes for your marketing & web team..."
                      className="mt-3 min-h-[90px] rounded-md border-slate-200 px-3 py-2 text-xs font-semibold shadow-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full h-9 rounded-md text-xs font-bold"
                      disabled={isSaving}
                      onClick={async () => {
                        await mutations.saveConfig.mutateAsync({ notes });
                        toast.success("Notes saved");
                      }}
                    >
                      Save notes
                    </Button>
                  </Card>
                </aside>
              </section>

              {/* Webhook delivery logs table */}
              <Card className="border-slate-200 bg-white p-0 shadow-card">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-secondary">
                      Website delivery log
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Every website form submission & webhook received by CRM, including deduplicated and skipped leads.
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
                      {deliveryLogsQuery.data.data.map((log: WebsiteDeliveryLog) => {
                        const created = log.action === "WEBSITE_LEAD_RECEIVED";
                        const failed = log.action === "WEBSITE_LEAD_FAILED";
                        const skipped =
                          log.action === "WEBSITE_LEAD_SKIPPED" ||
                          log.action === "WEBSITE_DUPLICATE_LEAD_RECEIVED";
                        const label = created
                          ? "Lead created"
                          : failed
                          ? "Import failed"
                          : skipped
                          ? "Deduplicated"
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
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {formatDateTime(log.occurredAt)}
                                </span>
                              </div>
                              <p className="mt-2 truncate text-sm font-bold text-secondary">
                                {log.outcome ||
                                  log.reason ||
                                  (log.name && log.mobile
                                    ? `Lead ${log.name} (${log.mobile})`
                                    : "Website form submission received")}
                              </p>
                              <p className="mt-1 truncate font-mono text-xs font-medium text-muted-foreground">
                                {log.websiteUrl
                                  ? `Website: ${log.websiteUrl}`
                                  : log.displayId
                                  ? `CRM lead: ${displayReference(log.displayId, "Lead")}`
                                  : "Website webhook event"}
                              </p>
                            </div>
                            {log.displayId ? (
                              <span className="text-xs font-extrabold text-primary">
                                {displayReference(log.displayId, "Lead")}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
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
                      Submit a real website form lead, then refresh this log to confirm CRM receipt.
                    </p>
                  </div>
                )}
              </Card>
            </>
          )}
      </WorkspacePage>

      {/* Add Website Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md rounded-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Connect a new website URL
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWebsiteSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-extrabold text-secondary">
                Website URL
              </label>
              <Input
                value={newWebsiteUrl}
                placeholder="https://walchandparkview.com/"
                className="h-10 mt-1 rounded-md text-sm font-semibold shadow-none"
                onChange={(e) => setNewWebsiteUrl(e.target.value)}
              />
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                Enter the full domain or landing page URL.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {mutations.addWebsiteUrl.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Connect Website
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
