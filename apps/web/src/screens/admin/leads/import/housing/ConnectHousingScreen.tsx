import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Input,
  cn,
} from "ui";

import { api } from "../../../../../common/api";
import { currentOrganizationId } from "../../../../../common/tenantRequestScope";
import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import { housingIntegrationQueryKey } from "./housingIntegrationQuery";

type HousingIntegrationResponse = {
  id: string;
  webhookKeyId: string;
  webhookUrl: string;
  apiKey?: string | null;
  isActive: boolean;
  leadCount: number;
  lastWebhookReceivedAt?: string | null;
  fieldMapping: any;
  samplePayload: any;
};

export function ConnectHousingScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const organizationId = currentOrganizationId() ?? "unscoped";
  const queryKey = housingIntegrationQueryKey(organizationId);

  const integrationQuery = useQuery<HousingIntegrationResponse>({
    queryKey,
    queryFn: async () => {
      const response = await api.get("/housing-integrations");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { isActive?: boolean; apiKey?: string }) => {
      return (await api.post("/housing-integrations", payload)).data;
    },
    onSuccess: () => {
      toast.success("Housing.com integration settings updated");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ["lead-import-stats", organizationId],
      });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async () => {
      return (await api.post("/housing-integrations/regenerate-key")).data;
    },
    onSuccess: () => {
      toast.success("New Webhook Key generated");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ["lead-import-stats", organizationId],
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      return (await api.post("/housing-integrations/test")).data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Test lead ingested successfully!");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ["lead-import-stats", organizationId],
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Test ingestion failed");
    },
  });

  const integration = integrationQuery.data;
  const webhookUrl = integration?.webhookUrl || "Loading webhook URL...";

  const handleCopyWebhookUrl = () => {
    if (integration?.webhookUrl) {
      navigator.clipboard.writeText(integration.webhookUrl);
      setCopied(true);
      toast.success("Webhook URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Import Leads"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1 flex flex-col font-sans text-secondary antialiased">
        <main className="flex-1 space-y-6 p-4 sm:p-6 overflow-x-hidden">
          {/* Header */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-[#453580] text-white shadow-xs">
                  <span className="text-xl font-extrabold leading-none tracking-tight">H</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider">Housing</span>
                </span>
                <div>
                  <h1 className="text-2xl font-black text-secondary tracking-tight">
                    Housing.com Integration Setup
                  </h1>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Connect Housing.com lead webhooks to capture and auto-assign buyer enquiries in real time.
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="text-xs font-bold text-secondary hover:bg-slate-100 self-start sm:self-auto"
              onClick={() => navigate("/leads/import")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Import Sources
            </Button>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
            <div className="space-y-6 min-w-0">
              {/* Profile Card & Setup Form */}
              <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg font-extrabold text-secondary">
                      Webhook & API Settings
                    </h2>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Configure your public webhook URL in your Housing.com Partner Dashboard.
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "border-0 px-4 py-1 text-xs font-extrabold rounded-full self-start sm:self-auto",
                      integration?.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {integration?.isActive ? "Integration Active" : "Integration Paused"}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {/* Webhook URL Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-secondary flex items-center justify-between">
                      <span>Housing.com Push Webhook URL (Give this to Housing.com Support)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] font-bold text-primary hover:bg-blue-50"
                        onClick={() => regenerateKeyMutation.mutate()}
                        disabled={regenerateKeyMutation.isPending}
                      >
                        <RefreshCw className="mr-1 size-3" />
                        Regenerate Key
                      </Button>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="h-11 font-mono text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 shadow-none"
                      />
                      <Button
                        type="button"
                        onClick={handleCopyWebhookUrl}
                        className="h-11 px-5 rounded-xl font-extrabold shadow-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="mr-1.5 size-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 size-4" />
                            Copy URL
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Copy this webhook URL and paste it into Housing.com Partner Portal &gt; Webhook Settings.
                    </p>
                  </div>

                  {/* Partner API Key Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-secondary">
                      Housing Partner API Key (Optional for Pull API)
                    </label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your Housing.com Partner API Key"
                        value={apiKeyInput || integration?.apiKey || ""}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 text-xs font-bold shadow-none pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto h-10 rounded-xl px-5 text-xs font-extrabold shadow-none border-slate-200"
                      onClick={() =>
                        saveMutation.mutate({
                          isActive: !integration?.isActive,
                        })
                      }
                    >
                      {integration?.isActive ? "Pause Integration" : "Activate Integration"}
                    </Button>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={testMutation.isPending}
                        onClick={() => testMutation.mutate()}
                        className="w-full sm:w-auto h-10 rounded-xl px-5 text-xs font-extrabold shadow-none text-primary border-primary/40 hover:bg-blue-50"
                      >
                        {testMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Sending Test Lead...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1.5 size-4" />
                            Test Lead Ingestion
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        onClick={() => navigate("/leads/import/connect/housing/map-fields")}
                        className="w-full sm:w-auto h-10 rounded-xl px-6 text-xs font-extrabold shadow-sm"
                      >
                        Configure Field Mapping
                        <ChevronRight className="ml-1.5 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <p className="text-xs font-semibold text-muted-foreground">Total Housing Leads</p>
                  <p className="mt-1 text-2xl font-black text-secondary">
                    {integration?.leadCount ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-600">Captured in Truroot CRM</p>
                </Card>

                <Card className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <p className="text-xs font-semibold text-muted-foreground">Last Webhook Activity</p>
                  <p className="mt-1 text-sm font-extrabold text-secondary">
                    {integration?.lastWebhookReceivedAt
                      ? new Date(integration.lastWebhookReceivedAt).toLocaleString()
                      : "No leads received yet"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Real-time HTTP Push</p>
                </Card>

                <Card className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <p className="text-xs font-semibold text-muted-foreground">Auto-Assign Status</p>
                  <p className="mt-1 text-sm font-extrabold text-secondary">Auto-Assign Active</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Controlled via Lead Masters</p>
                </Card>
              </div>
            </div>

            {/* Sidebar Guide */}
            <aside className="space-y-6">
              <Card className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <h3 className="text-base font-extrabold text-secondary mb-4">
                  Housing.com Integration Guide
                </h3>
                <div className="space-y-4 text-xs font-semibold text-secondary">
                  <div className="flex gap-3 items-start">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-secondary">
                      1
                    </span>
                    <div>
                      <p className="font-extrabold text-secondary">Copy Webhook URL</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Copy the unique endpoint URL generated on the left.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-secondary">
                      2
                    </span>
                    <div>
                      <p className="font-extrabold text-secondary">Provide to Housing.com Support</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Login to Housing Partner Portal or email your Housing Account Manager with the webhook URL.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-secondary">
                      3
                    </span>
                    <div>
                      <p className="font-extrabold text-secondary">Verify & Test Connection</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Click &quot;Test Lead Ingestion&quot; to verify auto-creation and field mappings in Truroot CRM.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 shadow-xs">
                <div className="flex items-center gap-3">
                  <Shield className="size-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-extrabold text-secondary">End-to-End Encryption</h4>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      All lead payloads are verified using unique SHA-256 tokens.
                    </p>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
