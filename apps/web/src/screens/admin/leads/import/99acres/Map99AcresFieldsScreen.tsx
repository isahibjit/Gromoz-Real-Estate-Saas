import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Crown,
  Info,
  Lightbulb,
  Minus,
  PlayCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import {
  ConnectionStepper,
  Header,
  SidebarFooter,
} from "./components/Shared99AcresComponents";

// --- Mock Data ---

const crmFields = [
  "Full Name",
  "Mobile Number",
  "Email Address",
  "Budget",
  "Property Type",
  "Preferred Location",
  "Lead Source",
  "Remarks / Notes",
  "Lead Created Date",
  "Last Contacted Date",
  "-- Do not import this field --",
];

type MappingRow = {
  id: string;
  sourceField: string;
  required: boolean;
  type: "Text" | "Date";
  previewData: string;
  mappedField: string;
  isAutoMapped?: boolean;
};

const initialMappings: MappingRow[] = [
  {
    id: "1",
    sourceField: "Full Name",
    required: true,
    type: "Text",
    previewData: "Rahul Sharma",
    mappedField: "Full Name",
  },
  {
    id: "2",
    sourceField: "Mobile Number",
    required: true,
    type: "Text",
    previewData: "+91 98765 43210",
    mappedField: "Mobile Number",
  },
  {
    id: "3",
    sourceField: "Email Address",
    required: false,
    type: "Text",
    previewData: "rahul.sharma@email.com",
    mappedField: "Email Address",
  },
  {
    id: "4",
    sourceField: "Budget",
    required: false,
    type: "Text",
    previewData: "1 - 1.5 Cr",
    mappedField: "Budget",
  },
  {
    id: "5",
    sourceField: "Property Type",
    required: false,
    type: "Text",
    previewData: "2 BHK Apartment",
    mappedField: "Property Type",
  },
  {
    id: "6",
    sourceField: "Location",
    required: false,
    type: "Text",
    previewData: "Andheri, Mumbai",
    mappedField: "Preferred Location",
  },
  {
    id: "7",
    sourceField: "Requirement Type",
    required: false,
    type: "Text",
    previewData: "99Acres",
    mappedField: "Lead Source",
  },
  {
    id: "8",
    sourceField: "Comments",
    required: false,
    type: "Text",
    previewData: "Interested in premium project",
    mappedField: "Remarks / Notes",
  },
  {
    id: "9",
    sourceField: "Created Date",
    required: false,
    type: "Date",
    previewData: "20 May 2025, 10:25 AM",
    mappedField: "Lead Created Date",
  },
  {
    id: "10",
    sourceField: "Last Contacted On",
    required: false,
    type: "Date",
    previewData: "19 May 2025, 04:15 PM",
    mappedField: "Last Contacted Date",
  },
  {
    id: "11",
    sourceField: "Interested For",
    required: false,
    type: "Text",
    previewData: "2 BHK",
    mappedField: "-- Do not import this field --",
  },
];

// --- Subcomponents ---

function FieldMappingTable({
  mappings,
  onMappingChange,
}: {
  mappings: MappingRow[];
  onMappingChange: (id: string, value: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-3 text-xs font-extrabold text-secondary font-manrope">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#e71921] text-[10px] font-extrabold text-white">
                  mb
                </span>
                99Acres Fields
              </div>
            </th>
            <th className="w-12 pb-3"></th>
            <th className="pb-3 text-xs font-extrabold text-secondary font-manrope">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Trueroot Realty CRM Fields
              </div>
            </th>
            <th className="pb-3 text-xs font-extrabold text-secondary font-manrope">
              Preview Data
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mappings.map((row) => {
            const isUnmapped =
              row.mappedField === "-- Do not import this field --";
            let pillClass = "bg-green-50 text-green-700 border-green-100";
            if (isUnmapped)
              pillClass = "bg-slate-100 text-slate-500 border-transparent";
            else if (row.isAutoMapped)
              pillClass = "bg-blue-50 text-blue-600 border-blue-100";
            else if (row.type === "Date")
              pillClass = "bg-slate-50 text-slate-600 border-slate-200";

            return (
              <tr key={row.id} className="group">
                <td className="py-4 align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-extrabold text-secondary">
                      {row.sourceField}
                      {row.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Type: {row.type}
                    </span>
                  </div>
                </td>
                <td className="py-4 align-top text-center text-slate-300">
                  <ArrowRight className="h-4 w-4 inline-block mt-1" />
                </td>
                <td className="py-4 align-top pr-8">
                  <Select
                    value={row.mappedField}
                    onValueChange={(value) => onMappingChange(row.id, value)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-10 w-full rounded-md border-slate-200 text-[13px] font-bold shadow-none",
                        isUnmapped ? "text-slate-400" : "text-secondary",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {crmFields.map((field) => (
                        <SelectItem
                          key={field}
                          value={field}
                          className="text-[13px] font-bold"
                        >
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-4 align-top">
                  <Badge
                    className={cn(
                      "mt-1 rounded-md border px-2.5 py-1 text-[11px] font-bold pointer-events-none whitespace-nowrap w-fit",
                      pillClass,
                    )}
                  >
                    {row.previewData}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MappingSummaryCard({ mappings }: { mappings: MappingRow[] }) {
  const total = mappings.length;
  const unmapped = mappings.filter(
    (m) => m.mappedField === "-- Do not import this field --",
  ).length;
  // Let's assume manual mapping is anything that isn't auto-mapped and isn't unmapped.
  // For the sake of the static design request, we'll mimic the numbers requested.
  const manuallyMapped = mappings.filter(
    (m) =>
      m.mappedField !== "-- Do not import this field --" && !m.isAutoMapped,
  ).length;
  const autoMapped = mappings.filter(
    (m) => m.mappedField !== "-- Do not import this field --" && m.isAutoMapped,
  ).length;
  const mapped = manuallyMapped + autoMapped;

  const data = [
    { name: "Mapped", value: mapped, color: "#118d57" }, // Success green
    { name: "Manual", value: manuallyMapped > 0 ? 0 : 1, color: "#f59e0b" }, // Orange for manual if we want to show it, hiding it in chart for simplicity
    { name: "Unmapped", value: unmapped, color: "#ef4444" }, // Red
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card sticky top-24">
      <h3 className="text-sm font-extrabold text-secondary mb-6 text-center">
        Mapping Summary
      </h3>

      <div className="relative h-40 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter(
                (d) => d.name === "Mapped" || d.name === "Unmapped",
              )} // Just show 2 segments for cleanliness
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#118d57" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-secondary leading-none">
            {total}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground mt-1">
            Total Fields
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success shrink-0" />
            <span className="text-xs font-bold text-secondary">Mapped</span>
          </div>
          <span className="text-xs font-extrabold text-secondary">
            {mapped}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
            <span className="text-xs font-bold text-secondary">
              Manually Mapped
            </span>
          </div>
          <span className="text-xs font-extrabold text-secondary">
            {manuallyMapped}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-xs font-bold text-secondary">Unmapped</span>
          </div>
          <span className="text-xs font-extrabold text-secondary">
            {unmapped}
          </span>
        </div>
      </div>
    </Card>
  );
}

function UnmappedFieldsCard({ mappings }: { mappings: MappingRow[] }) {
  const unmapped = mappings.filter(
    (m) => m.mappedField === "-- Do not import this field --",
  );

  if (unmapped.length === 0) return null;

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h3 className="text-sm font-extrabold text-secondary">
        Unmapped Fields ({unmapped.length})
      </h3>
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
        These fields will not be imported.
      </p>

      <div className="mt-4 space-y-2">
        {unmapped.map((field) => (
          <div
            key={field.id}
            className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 p-2.5"
          >
            <div>
              <p className="text-[13px] font-extrabold text-secondary">
                {field.sourceField}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                Type: {field.type}
              </p>
            </div>
            <button className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MappingTipCard() {
  return (
    <Card className="rounded-md border border-blue-100 bg-[#f4f9ff] p-5 shadow-none mt-5">
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-extrabold text-secondary">Tip</h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
            Ensure important fields like Mobile Number and Email are mapped
            correctly for accurate import.
          </p>
        </div>
      </div>
    </Card>
  );
}

function FieldMappingHelpCard() {
  const steps = [
    {
      title: "Match Fields",
      desc: "Map each source field to the corresponding CRM field.",
    },
    {
      title: "Preview Data",
      desc: "Review sample data to ensure correct mapping.",
    },
    { title: "Save Mapping", desc: "Save your mapping for future imports." },
    {
      title: "Import Leads",
      desc: "Start importing leads after successful mapping.",
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-extrabold text-secondary mb-6">
        How Field Mapping Works
      </h2>
      <div className="relative">
        <div className="absolute left-3.5 top-2 bottom-6 w-px bg-slate-200" />
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="relative flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-secondary z-10 relative">
                {index + 1}
              </div>
              <div className="pt-1">
                <p className="text-xs font-extrabold text-secondary">
                  {step.title}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MappingHelpCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-extrabold text-secondary">Need Help?</h2>
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground leading-relaxed mb-4">
        Watch tutorial or read our detailed guide on field mapping.
      </p>
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full h-9 rounded-md text-xs font-bold border-slate-200 shadow-none justify-start"
        >
          <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
          Watch Video
        </Button>
        <Button
          variant="outline"
          className="w-full h-9 rounded-md text-xs font-bold border-slate-200 shadow-none justify-start"
        >
          <Info className="mr-2 h-4 w-4 text-blue-600" />
          View Guide
        </Button>
      </div>
    </Card>
  );
}

function ImportantNoteCard() {
  return (
    <Card className="rounded-md border border-blue-100 bg-[#f4f9ff] p-5 shadow-none">
      <div className="flex gap-3">
        <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-extrabold text-secondary">
            Important Note
          </h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
            Once mapping is saved, it will be used as default for future imports
            from 99Acres.
          </p>
        </div>
      </div>
    </Card>
  );
}

function MappingFooterActions({
  onBack,
  onSavePreset,
  onTestContinue,
  isValid,
}: {
  onBack: () => void;
  onSavePreset: () => void;
  onTestContinue: () => void;
  isValid: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 border-t border-slate-200 pt-6">
      <Button
        type="button"
        variant="ghost"
        className="w-full sm:w-auto h-11 px-6 rounded-md font-extrabold text-secondary hover:bg-slate-100"
        onClick={onBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex-1" />
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto h-11 px-6 rounded-md shadow-none font-bold text-secondary border-slate-200"
        onClick={onSavePreset}
      >
        <Bookmark className="mr-2 h-4 w-4 text-muted-foreground" />
        Save Mapping as Preset
      </Button>
      <Button
        type="button"
        className="w-full sm:w-auto h-11 px-8 rounded-md font-bold text-white bg-primary hover:bg-primary-hover shadow-sm"
        disabled={!isValid}
        onClick={onTestContinue}
      >
        Test & Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Main Screen Component ---

export function Map99AcresFieldsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const [mappings, setMappings] = useState<MappingRow[]>(initialMappings);

  const handleMappingChange = (id: string, newMappedField: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, mappedField: newMappedField } : m,
      ),
    );
  };

  const handleAutoMap = () => {
    toast.success("Auto-mapped 8 fields based on intelligent matching.", {
      icon: <Sparkles className="h-5 w-5 text-blue-500" />,
    });
    // In a real app, this would apply matching logic
  };

  const handleSavePreset = () => {
    toast.success("Mapping preset saved successfully.");
  };

  const handleTestContinue = () => {
    // Navigate to Test Connection screen (mocked route for now)
    toast.success("Mappings validated successfully.");
    navigate("/leads/import/connect/99acres/test-connection");
  };

  const requiredUnmapped = mappings.filter(
    (m) => m.required && m.mappedField === "-- Do not import this field --",
  );
  const isValid = requiredUnmapped.length === 0;

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
          breadcrumbs={["Connect to 99Acres", "Map Fields"]}
      />
      <WorkspacePage className="overflow-x-hidden">
          <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-secondary">
                Map Fields
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground max-w-2xl">
                Map your 99Acres fields with Trueroot Realty CRM fields to
                ensure accurate data import.
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
            <div className="space-y-5 min-w-0">
              <ConnectionStepper activeStep={3} />

              <Card className="rounded-md border border-slate-200 bg-white p-5 sm:p-7 shadow-card overflow-hidden">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-xl font-extrabold text-secondary">
                      Field Mapping
                    </h2>
                    <p className="mt-1 text-[13px] font-semibold text-muted-foreground max-w-2xl">
                      Map each 99Acres field to the corresponding CRM field.
                      Unmapped fields will not be imported.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-secondary">
                        Mapping Preset:
                      </span>
                      <Select defaultValue="default">
                        <SelectTrigger className="h-9 w-[160px] rounded-md border-slate-200 text-xs font-bold shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="default"
                            className="text-xs font-bold"
                          >
                            Default Mapping
                          </SelectItem>
                          <SelectItem
                            value="custom1"
                            className="text-xs font-bold"
                          >
                            Custom Layout A
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-md shadow-none font-bold text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-4"
                      onClick={handleAutoMap}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Auto Map Fields
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-8">
                  <div className="min-w-0">
                    <FieldMappingTable
                      mappings={mappings}
                      onMappingChange={handleMappingChange}
                    />
                  </div>
                  <div className="shrink-0">
                    <MappingSummaryCard mappings={mappings} />
                    <UnmappedFieldsCard mappings={mappings} />
                    <MappingTipCard />
                  </div>
                </div>

                <MappingFooterActions
                  isValid={isValid}
                  onBack={() => navigate("/leads/import/connect/99acres")}
                  onSavePreset={handleSavePreset}
                  onTestContinue={handleTestContinue}
                />
              </Card>
            </div>

            <aside className="space-y-5">
              <FieldMappingHelpCard />
              <MappingHelpCard />
              <ImportantNoteCard />
            </aside>
          </div>
      </WorkspacePage>
    </>
  );
}
