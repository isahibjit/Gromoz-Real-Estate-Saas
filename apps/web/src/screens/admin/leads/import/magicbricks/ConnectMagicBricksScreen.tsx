import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  ShieldCheck,
  SquareArrowOutUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Input, Textarea } from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import { Header } from "./components/SharedMagicBricksComponents";
import {
  useMagicBricksIntegration,
  useMagicBricksIntegrationMutations,
} from "./useMagicBricksIntegration";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
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

const formatNumber = (value: number) => value.toLocaleString("en-IN");

function CopyButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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

export function ConnectMagicBricksScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  const integrationQuery = useMagicBricksIntegration();
  const mutations = useMagicBricksIntegrationMutations();
  const integration = integrationQuery.data;

  useEffect(() => {
    if (integration) {
      setNotes(integration.notes ?? "");
    }
  }, [integration]);

  const isSaving =
    mutations.saveConfig.isPending || mutations.regenerateApiKey.isPending;

  const requirementItems = useMemo(
    () => [
      "Share the working endpoint open URL with MagicBricks",
      "Use push integration type GET in the MagicBricks panel",
      "Pass ApiKey and lead fields as query parameters",
      "Keep this Push API active to accept live portal leads",
    ],
    [],
  );

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
      />
      <WorkspacePage>
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-secondary">
                MagicBricks Push API settings
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Copy the exact GET endpoint, API key, parameters, and response
                message requested by MagicBricks.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 self-start rounded-md px-3 text-sm font-extrabold text-secondary hover:bg-slate-100 sm:self-auto"
              onClick={() => navigate("/leads/import")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to import sources
            </Button>
          </section>

          {integrationQuery.isLoading ? (
            <Card className="rounded-md border border-slate-200 bg-white p-8 shadow-card">
              <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading MagicBricks Push API settings...
              </div>
            </Card>
          ) : integration ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#e71921] text-4xl font-extrabold leading-none text-white">
                        mb
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-extrabold text-secondary">
                            MagicBricks GET Push API
                          </h2>
                          <Badge
                            className={
                              integration.isActive
                                ? "border-0 bg-green-50 text-success"
                                : "border-0 bg-slate-100 text-muted-foreground"
                            }
                          >
                            {integration.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">
                          Use this endpoint in the MagicBricks partner panel.
                          Leads are pushed through a GET URL protected by ApiKey.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[320px]">
                      <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-muted-foreground">
                          Leads this month
                        </p>
                        <p className="mt-2 text-2xl font-extrabold text-secondary">
                          {formatNumber(
                            integration.stats.totalImportedThisMonth,
                          )}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-muted-foreground">
                          Total received
                        </p>
                        <p className="mt-2 text-2xl font-extrabold text-secondary">
                          {formatNumber(integration.totalLeadsReceived)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-xs font-bold text-muted-foreground">
                        CRM name
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-secondary">
                        {integration.crmName}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-xs font-bold text-muted-foreground">
                        Push integration type
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-secondary">
                        {integration.pushIntegrationType}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 md:col-span-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-muted-foreground">
                            Working endpoint
                          </p>
                          <p className="mt-1 break-all text-sm font-extrabold text-secondary">
                            {integration.endpointUrl}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <CopyButton
                            label="Endpoint URL"
                            value={integration.endpointUrl}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md border-slate-200 px-3 text-xs font-bold shadow-none"
                            onClick={() =>
                              window.open(integration.endpointUrl, "_blank")
                            }
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            Open
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 md:col-span-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-muted-foreground">
                            Complete working endpoint URL
                          </p>
                          <p className="mt-1 break-all text-sm font-extrabold text-secondary">
                            {integration.completeWorkingEndpointUrl}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <CopyButton
                            label="Complete endpoint URL"
                            value={integration.completeWorkingEndpointUrl}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md border-slate-200 px-3 text-xs font-bold shadow-none"
                            onClick={() =>
                              window.open(
                                integration.completeWorkingEndpointUrl,
                                "_blank",
                              )
                            }
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            Test URL
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-5">
                      <div className="rounded-md border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-extrabold text-secondary">
                              Dedicated MagicBricks API key
                            </p>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                              Share this key with MagicBricks as the
                              <code> ApiKey</code> query parameter.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <CopyButton
                              label="MagicBricks API key"
                              value={integration.apiKey}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-md border-slate-200 px-3 text-xs font-bold shadow-none"
                              disabled={mutations.regenerateApiKey.isPending}
                              onClick={async () => {
                                await mutations.regenerateApiKey.mutateAsync();
                                toast.success("MagicBricks API key regenerated");
                              }}
                            >
                              {mutations.regenerateApiKey.isPending ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <KeyRound className="mr-2 h-3.5 w-3.5" />
                              )}
                              Regenerate
                            </Button>
                          </div>
                        </div>
                        <div className="relative mt-4">
                          <Input
                            readOnly
                            value={
                              showApiKey
                                ? integration.apiKey
                                : integration.apiKeyPreview
                            }
                            className="h-11 rounded-md border-slate-200 pr-11 text-sm font-semibold shadow-none"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                            onClick={() => setShowApiKey((value) => !value)}
                          >
                            {showApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border border-slate-200 p-4">
                          <p className="text-xs font-bold text-muted-foreground">
                            Authentication
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-secondary">
                            {integration.authenticationType}
                          </p>
                        </div>
                        <div className="rounded-md border border-slate-200 p-4">
                          <p className="text-xs font-bold text-muted-foreground">
                            Response messages
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-secondary">
                            Success / duplicate safe
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-extrabold text-secondary">
                              Push API status
                            </p>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                              Pause this Push API if you want MagicBricks to stop
                              pushing new leads temporarily.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant={integration.isActive ? "outline" : "primary"}
                            className="h-10 rounded-md px-4 text-xs font-bold shadow-none"
                            disabled={mutations.saveConfig.isPending}
                            onClick={async () => {
                              await mutations.saveConfig.mutateAsync({
                                isActive: !integration.isActive,
                              });
                              toast.success(
                                integration.isActive
                                  ? "MagicBricks Push API paused"
                                  : "MagicBricks Push API activated",
                              );
                            }}
                          >
                            {integration.isActive ? "Pause Push API" : "Activate Push API"}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 p-4">
                        <label className="text-sm font-extrabold text-secondary">
                          Internal notes
                        </label>
                        <Textarea
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="Add operational notes for your team"
                          className="mt-3 min-h-[110px] rounded-md border-slate-200 px-4 py-3 text-sm font-semibold shadow-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Card className="rounded-md border border-slate-200 bg-slate-50/60 p-4 shadow-none">
                        <h3 className="text-sm font-extrabold text-secondary">
                          Push API health
                        </h3>
                        <div className="mt-4 space-y-4 text-xs font-semibold text-muted-foreground">
                          <div>
                            <p className="font-bold text-secondary">Status</p>
                            <p className="mt-1">{integration.status}</p>
                          </div>
                          <div>
                            <p className="font-bold text-secondary">Last test</p>
                            <p className="mt-1">
                              {formatDateTime(integration.lastTestedAt)}
                            </p>
                            {integration.lastTestStatus ? (
                              <p className="mt-1 font-bold text-secondary">
                                {integration.lastTestStatus}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <p className="font-bold text-secondary">
                              Last lead received
                            </p>
                            <p className="mt-1">
                              {formatDateTime(integration.lastLeadReceivedAt)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                        <h3 className="text-sm font-extrabold text-secondary">
                          Parameters to pass
                        </h3>
                        <div className="mt-4 space-y-3">
                          {Object.entries(
                            integration.manual.parametersToBePassedWithValues,
                          ).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                            >
                              <p className="text-xs font-extrabold text-secondary">
                                {key}
                              </p>
                              <p className="max-w-[180px] break-all text-right text-xs font-semibold text-muted-foreground">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      Public GET endpoint protected with MagicBricks ApiKey
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md border-slate-200 px-5 text-sm font-bold shadow-none"
                        disabled={isSaving}
                        onClick={async () => {
                          await mutations.saveConfig.mutateAsync({
                            notes,
                            status: "Configured",
                          });
                          toast.success("MagicBricks Push API settings saved");
                        }}
                      >
                        {mutations.saveConfig.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save settings
                      </Button>
                      <Button
                        type="button"
                        className="h-10 rounded-md px-5 text-sm font-bold"
                        onClick={() =>
                          navigate("/leads/import/connect/magicbricks/map-fields")
                        }
                      >
                        Review field mapping
                        <SquareArrowOutUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <aside className="space-y-5">
                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <h2 className="text-base font-extrabold text-secondary">
                    Submit these values to MagicBricks
                  </h2>
                  <div className="mt-5 space-y-4">
                    {[
                      ["CRM name", integration.manual.crmName],
                      [
                        "Working endpoint open URL",
                        integration.manual.workingEndpointOpenUrl,
                      ],
                      [
                        "Complete working endpoint URL",
                        integration.manual.completeWorkingEndpointUrl,
                      ],
                      ["Push integration type", integration.manual.pushIntegrationType],
                      ["Authentication type", integration.manual.authenticationType],
                      [
                        "Success response",
                        integration.responseMessages.success,
                      ],
                      [
                        "Failure response",
                        integration.responseMessages.failure,
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground">
                          {label}
                        </p>
                        <p className="break-all text-xs font-extrabold text-secondary">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <h2 className="text-base font-extrabold text-secondary">
                    Handover checklist
                  </h2>
                  <div className="mt-4 space-y-3">
                    {requirementItems.map((item) => (
                      <div key={item} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <h2 className="text-base font-extrabold text-secondary">
                    Push API instructions
                  </h2>
                  <div className="mt-4 space-y-3">
                    {integration.manual.integrationManual.map((step) => (
                      <div key={step} className="flex gap-3">
                        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </aside>
            </div>
          ) : (
            <Card className="rounded-md border border-destructive/20 bg-white p-8 shadow-card">
              <p className="text-sm font-semibold text-destructive">
                Failed to load the MagicBricks Push API settings.
              </p>
            </Card>
          )}
      </WorkspacePage>
    </>
  );
}
