import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import { api } from "../../../../../common/api";
import { currentOrganizationId } from "../../../../../common/tenantRequestScope";
import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import { housingIntegrationQueryKey } from "./housingIntegrationQuery";

const crmTargetFields = [
  { key: "name", label: "Full Name" },
  { key: "phone", label: "Mobile Number" },
  { key: "email", label: "Email Address" },
  { key: "projectName", label: "Project Name" },
  { key: "locality", label: "Locality / Suburb" },
  { key: "city", label: "City" },
  { key: "budget", label: "Budget Range" },
  { key: "createdDate", label: "Inquiry Created Date" },
  { key: "remarks", label: "Remarks / Notes" },
  { key: "unmapped", label: "-- Do not import this field --" },
];

const initialHousingMappings = [
  { key: "Name", label: "name", mappedTo: "name", required: true, sample: "Rajesh Kumar" },
  { key: "Phone", label: "phone", mappedTo: "phone", required: true, sample: "+91 98700 66177" },
  { key: "Email", label: "email", mappedTo: "email", required: false, sample: "rajesh.kumar@example.com" },
  { key: "ProjectName", label: "project_name", mappedTo: "projectName", required: false, sample: "Truroot Heights" },
  { key: "Locality", label: "locality", mappedTo: "locality", required: false, sample: "Mira Road" },
  { key: "City", label: "city", mappedTo: "city", required: false, sample: "Mumbai" },
  { key: "Budget", label: "budget", mappedTo: "budget", required: false, sample: "75 Lakhs - 1 Cr" },
  { key: "CreatedDate", label: "created_at", mappedTo: "createdDate", required: false, sample: "2026-08-29T12:00:00Z" },
  { key: "Remarks", label: "remarks", mappedTo: "remarks", required: false, sample: "Looking for ready to move 2 BHK" },
];

export function MapHousingFieldsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mappings, setMappings] = useState(initialHousingMappings);
  const organizationId = currentOrganizationId() ?? "unscoped";

  const saveMappingMutation = useMutation({
    mutationFn: async (fieldMapping: any) => {
      return (await api.post("/housing-integrations/field-mapping", { fieldMapping })).data;
    },
    onSuccess: () => {
      toast.success("Housing.com field mapping saved successfully!");
      queryClient.invalidateQueries({
        queryKey: housingIntegrationQueryKey(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ["lead-import-stats", organizationId],
      });
      navigate("/leads/import/test/housing");
    },
    onError: () => {
      toast.error("Failed to save field mapping");
    },
  });

  const handleFieldChange = (key: string, newMappedTo: string) => {
    setMappings((prev) =>
      prev.map((row) => (row.key === key ? { ...row, mappedTo: newMappedTo } : row)),
    );
  };

  const handleSaveAndContinue = () => {
    const mappingObj: Record<string, string> = {};
    mappings.forEach((row) => {
      mappingObj[row.key] = row.mappedTo;
    });
    saveMappingMutation.mutate(mappingObj);
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
                Housing.com field mapping
              </h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Map Housing.com JSON payload keys to Truroot CRM Lead attributes.
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

          <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-extrabold text-secondary">
                  Payload Key Mapping Table
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  Select which CRM field receives each Housing.com property inquiry parameter.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.success("Auto-mapped Housing.com fields based on standard key schema!")}
                className="h-9 rounded-xl text-xs font-extrabold shadow-none text-primary border-primary/40 hover:bg-blue-50"
              >
                <Sparkles className="mr-1.5 size-4" />
                Intelligent Auto-Map
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[650px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-extrabold text-secondary">
                    <th className="pb-3">Housing.com Payload Key</th>
                    <th className="w-10 pb-3"></th>
                    <th className="pb-3">Truroot CRM Lead Attribute</th>
                    <th className="pb-3">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappings.map((row) => (
                    <tr key={row.key} className="group">
                      <td className="py-4 align-middle">
                        <span className="font-mono text-xs font-extrabold text-secondary">
                          {row.label}
                        </span>
                        {row.required && <span className="text-red-500 ml-1 font-extrabold">*</span>}
                      </td>
                      <td className="py-4 align-middle text-slate-300">
                        <ArrowRight className="size-4" />
                      </td>
                      <td className="py-4 align-middle pr-6">
                        <Select
                          value={row.mappedTo}
                          onValueChange={(val) => handleFieldChange(row.key, val)}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 text-xs font-bold shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {crmTargetFields.map((field) => (
                              <SelectItem key={field.key} value={field.key} className="text-xs font-bold">
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-4 align-middle">
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0 px-3 py-1 font-mono text-[11px] font-bold">
                          {row.sample}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto h-11 px-6 rounded-xl font-extrabold text-secondary hover:bg-slate-100"
                onClick={() => navigate("/leads/import/connect/housing")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saveMappingMutation.isPending}
                className="w-full sm:w-auto h-11 px-8 rounded-xl font-extrabold shadow-sm"
              >
                {saveMappingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving Mapping...
                  </>
                ) : (
                  <>
                    Save Mapping & Proceed to Testing
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
      </WorkspacePage>
    </>
  );
}
