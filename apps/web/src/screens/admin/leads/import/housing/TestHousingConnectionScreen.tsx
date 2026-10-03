import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Send,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Card,
  cn,
} from "ui";

import { api } from "../../../../../common/api";
import { currentOrganizationId } from "../../../../../common/tenantRequestScope";
import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import { housingIntegrationQueryKey } from "./housingIntegrationQuery";

const samplePayloadJson = JSON.stringify(
  {
    lead_id: "HSG-984210",
    name: "Rajesh Kumar",
    phone: "9876543210",
    email: "rajesh.kumar@example.com",
    project_name: "Truroot Heights",
    locality: "Mira Road",
    city: "Mumbai",
    budget: "75 Lakhs - 1 Cr",
    created_at: "2026-08-29T12:00:00Z",
    remarks: "Looking for 2 BHK ready to move unit",
  },
  null,
  2,
);

export function TestHousingConnectionScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [payloadText, setPayloadText] = useState(samplePayloadJson);
  const [lastResult, setLastResult] = useState<any>(null);
  const organizationId = currentOrganizationId() ?? "unscoped";

  const testMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post("/housing-integrations/test", payload)).data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      toast.success("Housing.com test lead ingested successfully!");
      queryClient.invalidateQueries({
        queryKey: housingIntegrationQueryKey(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ["lead-import-stats", organizationId],
      });
    },
    onError: (err: any) => {
      setLastResult({
        error: err?.response?.data?.message || "Ingestion Failed",
      });
      toast.error(err?.response?.data?.message || "Test ingestion failed");
    },
  });

  const handleRunTest = () => {
    try {
      const parsed = JSON.parse(payloadText);
      testMutation.mutate(parsed);
    } catch {
      toast.error("Invalid JSON syntax in test payload");
    }
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
      <WorkspacePage className="space-y-6 overflow-x-hidden">
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-secondary tracking-tight">
                Test Housing.com webhook ingestion
              </h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Dispatch simulated Housing.com buyer inquiries to test parsing, deduplication, and auto-assignment.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="text-xs font-bold text-secondary hover:bg-slate-100 self-start sm:self-auto"
              onClick={() => navigate("/leads/import/connect/housing")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Webhook Setup
            </Button>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payload Editor */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-secondary">Sample Housing.com JSON Payload</h2>
                  <p className="text-xs font-semibold text-muted-foreground">Edit parameters to simulate different lead data.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs font-bold shadow-none"
                  onClick={() => setPayloadText(samplePayloadJson)}
                >
                  Reset Sample
                </Button>
              </div>

              <textarea
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs font-extrabold rounded-xl border border-slate-200 p-4 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  disabled={testMutation.isPending}
                  onClick={handleRunTest}
                  className="h-11 px-8 rounded-xl font-extrabold shadow-sm"
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Testing Webhook...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 size-4" />
                      Dispatch Webhook Request
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Test Result Inspector */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col">
              <h2 className="text-base font-extrabold text-secondary mb-1">Execution Log & Result</h2>
              <p className="text-xs font-semibold text-muted-foreground mb-4">
                Real-time API response and lead creation output.
              </p>

              {lastResult ? (
                <div className="space-y-4 flex-1">
                  <div
                    className={cn(
                      "rounded-xl p-4 border text-xs font-bold",
                      lastResult.error
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="size-4" />
                      <span className="font-extrabold">
                        {lastResult.error ? "Test Failed" : "Webhook Ingested Successfully"}
                      </span>
                    </div>
                    <p className="font-medium text-[11px]">{lastResult.message || lastResult.error}</p>
                    {lastResult.leadId && (
                      <p className="mt-2 text-xs font-extrabold">Created Lead ID: {lastResult.leadId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-secondary">Server Response JSON:</label>
                    <pre className="font-mono text-xs font-bold rounded-xl border border-slate-200 p-4 bg-slate-50 text-slate-800 overflow-x-auto">
                      {JSON.stringify(lastResult, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
                  <Play className="size-10 text-slate-300 mb-2" />
                  <p className="text-xs font-extrabold text-secondary">No Webhook Dispatched Yet</p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    Click &quot;Dispatch Webhook Request&quot; on the left to test the ingestion pipeline.
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-4 flex justify-between items-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs font-bold text-secondary"
                  onClick={() => navigate("/leads/import/connect/housing")}
                >
                  <ArrowLeft className="mr-1.5 size-4" />
                  Back to Setup
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate("/leads/import")}
                  className="h-10 px-6 rounded-xl text-xs font-extrabold"
                >
                  Done & Go to Lead Import Hub
                </Button>
              </div>
            </Card>
          </div>
      </WorkspacePage>
    </>
  );
}
