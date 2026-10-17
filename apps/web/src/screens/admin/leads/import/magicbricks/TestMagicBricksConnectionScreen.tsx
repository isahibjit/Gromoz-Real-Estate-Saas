import { presentRecordDetails } from "../../../../../common/displayReference";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  PlayCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Input, Textarea } from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import {
  ConnectionStepper,
  Header,
} from "./components/SharedMagicBricksComponents";
import {
  useMagicBricksIntegration,
  useMagicBricksIntegrationMutations,
  type MagicBricksTestResult,
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

export function TestMagicBricksConnectionScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [samplePayload, setSamplePayload] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MagicBricksTestResult | null>(null);
  const navigate = useNavigate();

  const integrationQuery = useMagicBricksIntegration();
  const mutations = useMagicBricksIntegrationMutations();
  const integration = integrationQuery.data;

  useEffect(() => {
    if (integration?.manual.parametersToBePassedWithValues) {
      setSamplePayload(integration.manual.parametersToBePassedWithValues);
    }
  }, [integration?.manual.parametersToBePassedWithValues]);

  const runTest = async () => {
    const nextResult = await mutations.testConnection.mutateAsync(samplePayload);
    setResult(nextResult);
    toast.success(
      nextResult.valid
        ? "MagicBricks test payload validated"
        : "MagicBricks test payload needs attention",
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
          breadcrumbs={["Connect to MagicBricks", "Test connection"]}
      />
      <WorkspacePage>
          <section>
            <h1 className="text-2xl font-extrabold text-secondary">
              Test MagicBricks connection
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Run a live backend validation against the public connector contract
              before handing the endpoint to MagicBricks.
            </p>
          </section>

          <ConnectionStepper activeStep={4} />

          {integrationQuery.isLoading ? (
            <Card className="rounded-md border border-slate-200 bg-white p-8 shadow-card">
              <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading test configuration...
              </div>
            </Card>
          ) : integration ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-secondary">
                          Connector validation
                        </h2>
                        {result ? (
                          <Badge
                            className={
                              result.valid
                                ? "border-0 bg-green-50 text-success"
                                : "border-0 bg-red-50 text-destructive"
                            }
                          >
                            {result.status}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        This test runs against the backend mapping and duplicate
                        detection logic for{" "}
                        <span className="font-extrabold text-secondary">
                          {integration.endpointUrl}
                        </span>
                        .
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="h-10 rounded-md px-5 text-sm font-bold"
                      disabled={mutations.testConnection.isPending}
                      onClick={runTest}
                    >
                      {mutations.testConnection.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="mr-2 h-4 w-4" />
                      )}
                      Run test
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {Object.entries(samplePayload).map(([key, value]) => {
                      const isMessageField = key === "msg";
                      return (
                        <div
                          key={key}
                          className={isMessageField ? "md:col-span-2" : ""}
                        >
                          <label className="text-xs font-extrabold text-secondary">
                            {key}
                          </label>
                          {isMessageField ? (
                            <Textarea
                              value={value}
                              onChange={(event) =>
                                setSamplePayload((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              className="mt-2 min-h-[96px] rounded-md border-slate-200 px-4 py-3 text-sm font-semibold shadow-none"
                            />
                          ) : (
                            <Input
                              value={value}
                              onChange={(event) =>
                                setSamplePayload((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              className="mt-2 h-10 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {result ? (
                    <div className="mt-6 grid gap-5 border-t border-slate-200 pt-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-5">
                        <Card className="rounded-md border border-slate-200 bg-slate-50/60 p-4 shadow-none">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-extrabold text-secondary">
                                Normalized lead preview
                              </p>
                              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                This is what the backend will send into the CRM.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-md border-slate-200 px-3 text-xs font-bold shadow-none"
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  JSON.stringify(presentRecordDetails(result.normalizedLead), null, 2),
                                );
                                toast.success("Normalized lead copied");
                              }}
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              Copy JSON
                            </Button>
                          </div>
                          <pre className="mt-4 overflow-x-auto rounded-md bg-white p-4 text-xs font-semibold text-secondary">
                            {JSON.stringify(presentRecordDetails(result.normalizedLead), null, 2)}
                          </pre>
                        </Card>

                        {result.errors.length > 0 ? (
                          <Card className="rounded-md border border-destructive/20 bg-red-50 p-4 shadow-none">
                            <div className="flex items-start gap-3">
                              <TriangleAlert className="mt-0.5 h-5 w-5 text-destructive" />
                              <div>
                                <p className="text-sm font-extrabold text-secondary">
                                  Validation issues
                                </p>
                                <div className="mt-2 space-y-2">
                                  {result.errors.map((error) => (
                                    <p
                                      key={error}
                                      className="text-xs font-semibold text-destructive"
                                    >
                                      {error}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                          <h3 className="text-sm font-extrabold text-secondary">
                            Test outcome
                          </h3>
                          <div className="mt-4 space-y-3 text-xs font-semibold text-muted-foreground">
                            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                              <p className="font-bold text-secondary">Would create lead</p>
                              <p className="mt-1">
                                {result.wouldCreateLead ? "Yes" : "No"}
                              </p>
                            </div>
                            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                              <p className="font-bold text-secondary">Success response</p>
                              <p className="mt-1">{result.responseMessages.success}</p>
                            </div>
                            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                              <p className="font-bold text-secondary">Failure response</p>
                              <p className="mt-1">{result.responseMessages.failure}</p>
                            </div>
                            {result.duplicate ? (
                              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                                <p className="font-bold text-secondary">Duplicate found</p>
                                <p className="mt-1">
                                  {result.duplicate.name}
                                  {result.duplicate.displayId
                                    ? ` (${result.duplicate.displayId})`
                                    : ""}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </Card>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 self-start rounded-md px-3 text-sm font-extrabold text-secondary hover:bg-slate-100"
                      onClick={() =>
                        navigate("/leads/import/connect/magicbricks/map-fields")
                      }
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md border-slate-200 px-5 text-sm font-bold shadow-none"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            JSON.stringify(samplePayload, null, 2),
                          );
                          toast.success("Sample payload copied");
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy sample payload
                      </Button>
                      <Button
                        type="button"
                        className="h-10 rounded-md px-5 text-sm font-bold"
                        disabled={!result?.valid}
                        onClick={() => {
                          toast.success("MagicBricks connector is ready");
                          navigate("/leads/import");
                        }}
                      >
                        Finish setup
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <aside className="space-y-5">
                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <h3 className="text-base font-extrabold text-secondary">
                    Live connector state
                  </h3>
                  <div className="mt-4 space-y-4 text-xs font-semibold text-muted-foreground">
                    <div>
                      <p className="font-bold text-secondary">Last tested</p>
                      <p className="mt-1">{formatDateTime(integration.lastTestedAt)}</p>
                    </div>
                    <div>
                      <p className="font-bold text-secondary">Last test status</p>
                      <p className="mt-1">{integration.lastTestStatus ?? "Not available"}</p>
                    </div>
                    <div>
                      <p className="font-bold text-secondary">Last lead received</p>
                      <p className="mt-1">
                        {formatDateTime(integration.lastLeadReceivedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-secondary">Endpoint URL</p>
                      <p className="mt-1 break-all">{integration.endpointUrl}</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-success" />
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        What this test checks
                      </h3>
                      <div className="mt-3 space-y-2 text-xs font-semibold text-muted-foreground">
                        <p>API key structure</p>
                        <p>Required payload fields</p>
                        <p>Saved field mapping</p>
                        <p>Project lookup by name</p>
                        <p>Duplicate lead detection</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {result?.valid ? (
                  <Card className="rounded-md border border-green-200 bg-green-50 p-5 shadow-none">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm font-extrabold text-secondary">
                          Ready for MagicBricks submission
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Share the endpoint and API key with the portal team.
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : null}
              </aside>
            </div>
          ) : (
            <Card className="rounded-md border border-destructive/20 bg-white p-8 shadow-card">
              <p className="text-sm font-semibold text-destructive">
                Failed to load MagicBricks connector test data.
              </p>
            </Card>
          )}
      </WorkspacePage>
    </>
  );
}
