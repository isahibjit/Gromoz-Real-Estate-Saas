import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CloudUpload,
  Copy,
  Download,
  Frown,
  Meh,
  MessageSquare,
  Smile,
  List,
  Mail,
  Phone,
  User as UserIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
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

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { assignLeadsSidebarItems } from "../assignment/leadAssignmentData";
import {
  Header,
  SidebarFooter,
} from "./magicbricks/components/SharedMagicBricksComponents";

// --- Mock Data ---

type ImportedLead = {
  id: string;
  status: "Success" | "Failed" | "Duplicate";
  fullName: string;
  mobile: string;
  email: string;
  propertyType: string;
  source: string;
  importedOn: string;
};

const mockImportedLeads: ImportedLead[] = [
  {
    id: "1",
    status: "Success",
    fullName: "Rahul Sharma",
    mobile: "+91 98765 43210",
    email: "rahul.sharma@email.com",
    propertyType: "2 BHK Apartment",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
  {
    id: "2",
    status: "Success",
    fullName: "Neha Kapoor",
    mobile: "+91 98123 45678",
    email: "neha.kapoor@email.com",
    propertyType: "3 BHK Apartment",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
  {
    id: "3",
    status: "Success",
    fullName: "Vikram Singh",
    mobile: "+91 98234 56789",
    email: "vikram.singh@email.com",
    propertyType: "2 BHK Apartment",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
  {
    id: "4",
    status: "Success",
    fullName: "Anjali Mehta",
    mobile: "+91 98345 67890",
    email: "anjali.mehta@email.com",
    propertyType: "1 BHK Apartment",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
  {
    id: "5",
    status: "Success",
    fullName: "Karan Patel",
    mobile: "+91 98712 34567",
    email: "karan.patel@email.com",
    propertyType: "2 BHK Apartment",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
  {
    id: "6",
    status: "Success",
    fullName: "Pooja Verma",
    mobile: "+91 97654 32109",
    email: "pooja.verma@email.com",
    propertyType: "3 BHK Apartment",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
];

const mockFailedLeads: ImportedLead[] = [
  {
    id: "7",
    status: "Failed",
    fullName: "Unknown",
    mobile: "+91 00000 00000",
    email: "invalid@email",
    propertyType: "Plot",
    source: "MagicBricks",
    importedOn: "20 May 2025, 10:28 AM",
  },
];

// --- Subcomponents ---

function ImportProgressTimeline() {
  const steps = [
    {
      title: "File Uploaded",
      time: "20 May, 10:25 AM",
      icon: <CloudUpload className="h-4 w-4" />,
    },
    {
      title: "Data Validated",
      time: "20 May, 10:26 AM",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: "Data Mapped",
      time: "20 May, 10:27 AM",
      icon: <Copy className="h-4 w-4" />,
    },
    {
      title: "Import Completed",
      time: "20 May, 10:28 AM",
      icon: <CloudUpload className="h-4 w-4" />,
    },
    {
      title: "Leads Ready",
      time: "20 May, 10:28 AM",
      icon: <Check className="h-5 w-5" />,
      isFinal: true,
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card overflow-x-auto">
      <div className="flex items-start justify-between min-w-[700px]">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <div key={index} className="flex-1 relative">
              {!isLast && (
                <div className="absolute top-5 left-1/2 w-full h-0.5 bg-green-500" />
              )}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-green-500",
                    step.isFinal ? "bg-green-500 text-white" : "text-green-500",
                  )}
                >
                  {step.icon}
                </div>
                <div className="mt-3 text-center">
                  <p className="text-[13px] font-extrabold text-secondary">
                    {step.title}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    {step.time}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ImportOverviewCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h2 className="text-[15px] font-extrabold text-secondary mb-4">
        Import Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Records */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                1,248
              </p>
              <p className="text-[11px] font-bold text-secondary mt-1.5">
                Total Records
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                From MagicBricks
              </p>
            </div>
          </div>
        </div>

        {/* Imported Successfully */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                1,236
              </p>
              <p className="text-[11px] font-bold text-secondary mt-1.5">
                Imported Successfully
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                (99.04%)
              </p>
            </div>
          </div>
        </div>

        {/* Failed Records */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                8
              </p>
              <p className="text-[11px] font-bold text-secondary mt-1.5">
                Failed Records
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                (0.64%)
              </p>
            </div>
          </div>
        </div>

        {/* Duplicates Skipped */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                4
              </p>
              <p className="text-[11px] font-bold text-secondary mt-1.5">
                Duplicates Skipped
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                (0.32%)
              </p>
            </div>
          </div>
        </div>

        {/* Total Import Time */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                28 sec
              </p>
              <p className="text-[11px] font-bold text-secondary mt-1.5">
                Total Import Time
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                Started at 10:25 AM
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ImportResultsTable({ sourceLabel }: { sourceLabel: string }) {
  const [activeTab, setActiveTab] = useState<
    "Import Results" | "Failed Records" | "Duplicate Records"
  >("Import Results");

  const tabs = [
    { id: "Import Results", label: "Import Results" },
    { id: "Failed Records", label: "Failed Records (8)" },
    { id: "Duplicate Records", label: "Duplicate Records (4)" },
  ] as const;

  const data =
    activeTab === "Import Results"
      ? mockImportedLeads.map((lead) => ({ ...lead, source: sourceLabel }))
      : activeTab === "Failed Records"
      ? mockFailedLeads.map((lead) => ({ ...lead, source: sourceLabel }))
      : [];

  return (
    <Card className="rounded-md border border-slate-200 bg-white shadow-card overflow-hidden mt-5">
      <div className="flex items-center gap-6 px-5 border-b border-slate-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "py-4 text-[13px] font-extrabold transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Status
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Lead Name
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Mobile Number
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Email Address
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Property Type
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Source
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Imported On
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-sm font-semibold text-muted-foreground"
                >
                  No records to display.
                </td>
              </tr>
            ) : (
              data.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3 px-5">
                    {lead.status === "Success" ? (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white">
                        <AlertTriangle className="h-3 w-3" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-5 text-xs font-bold text-secondary">
                    {lead.fullName}
                  </td>
                  <td className="py-3 px-5 text-xs font-bold text-secondary">
                    {lead.mobile}
                  </td>
                  <td className="py-3 px-5 text-xs font-semibold text-muted-foreground">
                    {lead.email}
                  </td>
                  <td className="py-3 px-5 text-xs font-semibold text-muted-foreground">
                    {lead.propertyType}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 min-w-4 shrink-0 items-center justify-center rounded px-1 text-[8px] font-extrabold text-white",
                          sourceLabel === "99Acres"
                            ? "bg-[#1597d4]"
                            : "bg-[#e71921]",
                        )}
                      >
                        {sourceLabel === "99Acres" ? "99" : "mb"}
                      </span>
                      <span className="text-xs font-bold text-secondary">
                        {lead.source}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-xs font-semibold text-secondary">
                    {lead.importedOn}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activeTab === "Import Results" && (
        <div className="border-t border-slate-100 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Showing 1 to 6 of 1,236 records
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-7 w-7 p-0 rounded border-slate-200 shadow-none"
              disabled
            >
              <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0 rounded border-primary bg-primary text-white font-bold shadow-none text-xs"
            >
              1
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0 rounded border-slate-200 shadow-none text-xs font-bold text-secondary hover:bg-slate-50"
            >
              2
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0 rounded border-slate-200 shadow-none text-xs font-bold text-secondary hover:bg-slate-50"
            >
              3
            </Button>
            <span className="text-xs font-bold text-slate-400 px-1">...</span>
            <Button
              variant="outline"
              className="h-7 w-auto px-2 rounded border-slate-200 shadow-none text-xs font-bold text-secondary hover:bg-slate-50"
            >
              206
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0 rounded border-slate-200 shadow-none hover:bg-slate-50"
            >
              <ChevronRight className="h-3.5 w-3.5 text-secondary" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Rows per page
            </span>
            <Select defaultValue="10">
              <SelectTrigger className="h-7 w-[60px] rounded border-slate-200 text-xs font-bold shadow-none bg-white px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10" className="text-xs font-bold">
                  10
                </SelectItem>
                <SelectItem value="25" className="text-xs font-bold">
                  25
                </SelectItem>
                <SelectItem value="50" className="text-xs font-bold">
                  50
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </Card>
  );
}

function ImportExperienceFeedback() {
  const handleRating = (rating: string) => {
    toast.success(`Thanks for your feedback: ${rating}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 mt-2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-500">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-[13px] font-extrabold text-secondary">
            How was your import experience?
          </h4>
          <p className="text-[11px] font-semibold text-muted-foreground">
            Your feedback helps us improve.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => handleRating("Excellent")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="text-2xl grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
            🤩
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-secondary">
            Excellent
          </span>
        </button>
        <button
          onClick={() => handleRating("Good")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="text-2xl grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
            🙂
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-secondary">
            Good
          </span>
        </button>
        <button
          onClick={() => handleRating("Average")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="text-2xl grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
            😐
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-secondary">
            Average
          </span>
        </button>
        <button
          onClick={() => handleRating("Poor")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="text-2xl grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
            😕
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-secondary">
            Poor
          </span>
        </button>
        <button
          onClick={() => handleRating("Very Poor")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="text-2xl grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
            😫
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-secondary">
            Very Poor
          </span>
        </button>
      </div>
    </div>
  );
}

function ImportSummaryFooterActions({
  onBackToLeads,
  onImportAnother,
  onViewImported,
}: {
  onBackToLeads: () => void;
  onImportAnother: () => void;
  onViewImported: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 py-6 border-t border-slate-200">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto h-11 px-6 rounded-md shadow-none font-bold text-secondary border-slate-200 hover:bg-slate-50"
        onClick={onBackToLeads}
      >
        <List className="mr-2 h-4 w-4" />
        Back to Leads
      </Button>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto h-11 px-6 rounded-md shadow-none font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={onImportAnother}
        >
          <CloudUpload className="mr-2 h-4 w-4" />
          Import Another File
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto h-11 px-8 rounded-md font-bold text-white bg-primary hover:bg-primary-hover shadow-sm"
          onClick={onViewImported}
        >
          View Imported Leads
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Sidebar Components ---

function ImportFileDetailsCard({ sourceLabel }: { sourceLabel: string }) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-extrabold text-secondary">
          Import File Details
        </h3>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-2">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            File Name
          </span>
          <span className="text-[11px] font-extrabold text-secondary text-right break-all">
            {sourceLabel === "99Acres"
              ? "99Acres_Leads_20May2025.xlsx"
              : "MagicBricks_Leads_20May2025.xlsx"}
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            File Size
          </span>
          <span className="text-[11px] font-bold text-secondary text-right">
            2.45 MB
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Uploaded By
          </span>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[8px] font-extrabold text-secondary overflow-hidden">
              <img
                src="https://i.pravatar.cc/150?u=amit"
                alt="Amit Kumar"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="text-[11px] font-bold text-blue-600">
              Amit Kumar
            </span>
          </div>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Uploaded On
          </span>
          <span className="text-[11px] font-bold text-secondary text-right">
            20 May 2025, 10:25 AM
          </span>
        </div>
      </div>
    </Card>
  );
}

function DataQualityCheckCard() {
  const data = [
    { name: "Valid Data", value: 1236, color: "#118d57", percentage: "99.04%" },
    { name: "Invalid Data", value: 8, color: "#f59e0b", percentage: "0.64%" },
    { name: "Duplicate Data", value: 4, color: "#9333ea", percentage: "0.32%" },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h3 className="text-sm font-extrabold text-secondary mb-6">
        Data Quality Check
      </h3>

      <div className="flex flex-col items-center">
        <div className="relative h-32 w-32 shrink-0 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={45}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
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
            <span className="text-[15px] font-extrabold text-secondary leading-none">
              99.04%
            </span>
            <span className="text-[9px] font-bold text-muted-foreground mt-0.5 leading-tight text-center">
              Data Quality
            </span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-secondary">
                  {item.value.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground w-12 text-right">
                  ({item.percentage})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WhatsNextCard({ sourceLabel }: { sourceLabel: string }) {
  const actions = [
    {
      title: "View Imported Leads",
      desc: "Go to lead list and view your imported leads.",
      icon: <Users className="h-4 w-4 text-blue-600" />,
      bg: "bg-blue-50",
      onClick: () => {},
    },
    {
      title: "Check Failed Records",
      desc: "Review and fix the failed records.",
      icon: <AlertTriangle className="h-4 w-4 text-blue-600" />,
      bg: "bg-blue-50",
      onClick: () => {},
    },
    {
      title: "Import Another File",
      desc: `Import more leads from ${sourceLabel}.`,
      icon: <CloudUpload className="h-4 w-4 text-blue-600" />,
      bg: "bg-blue-50",
      onClick: () => {},
    },
    {
      title: "Download Import Report",
      desc: "Download complete import report.",
      icon: <Download className="h-4 w-4 text-blue-600" />,
      bg: "bg-blue-50",
      onClick: () => {
        toast.success("Downloading report...");
      },
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h3 className="text-sm font-extrabold text-secondary mb-4">
        What's Next?
      </h3>
      <div className="space-y-1 -mx-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors text-left group"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                action.bg,
              )}
            >
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-secondary group-hover:text-primary transition-colors">
                {action.title}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
                {action.desc}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </Card>
  );
}

function ImportSummaryHelpCard() {
  return (
    <Card className="rounded-md border border-blue-100 bg-[#f4f9ff] p-5 shadow-none mt-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
          <Phone className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-secondary">Need Help?</h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
            Our support team is here to help you.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full h-9 rounded-md bg-white text-xs font-bold border-slate-200 shadow-sm"
      >
        <MessageSquare className="mr-2 h-3.5 w-3.5 text-blue-600" />
        Contact Support
      </Button>
    </Card>
  );
}

// --- Main Screen Component ---

export function ImportSummaryScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { importId } = useParams();
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target") === "contact" ? "contact" : "lead";
  const sourceLabel = useMemo(() => {
    const source = searchParams.get("source")?.toLowerCase();
    const normalizedId = String(importId ?? "").toLowerCase();
    if (source === "99acres" || normalizedId.startsWith("99acres")) {
      return "99Acres";
    }
    return "MagicBricks";
  }, [importId, searchParams]);

  const handleBackToLeads = () =>
    navigate(target === "contact" ? "/leads/contact" : "/leads/all");
  const handleImportAnother = () =>
    navigate(
      target === "contact"
        ? "/leads/import?target=contact&method=excel-csv"
        : "/leads/import?method=excel-csv",
    );
  const handleViewImported = () =>
    navigate(target === "contact" ? "/leads/contact" : "/leads/all");

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
      <div className="min-w-0 flex-1 flex flex-col">
        <Header
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={[`Connect to ${sourceLabel}`, "Import Summary"]}
        />
        <main className="flex-1 space-y-5 p-4 sm:p-6 overflow-x-hidden">
          <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-secondary">
                  Import Summary
                </h1>
                <Badge className="bg-green-50 text-success border-0 px-2 py-0.5 text-[10px] font-extrabold rounded flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Import Completed Successfully
                </Badge>
              </div>
                <p className="mt-1 max-w-3xl text-sm font-semibold text-muted-foreground">
                  {target === "contact"
                    ? `Your ${sourceLabel} contact leads are being imported into the Contact Leads workspace. You can track the progress and review the results below.`
                    : `Your ${sourceLabel} leads are being imported into Trueroot Realty CRM. You can track the progress and review the results below.`}
                </p>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
            <div className="space-y-5 min-w-0">
              <ImportProgressTimeline />
              <ImportOverviewCard />
              <ImportResultsTable sourceLabel={sourceLabel} />
              <ImportExperienceFeedback />
              <ImportSummaryFooterActions
                onBackToLeads={handleBackToLeads}
                onImportAnother={handleImportAnother}
                onViewImported={handleViewImported}
              />
            </div>

            <aside className="space-y-5">
              <ImportFileDetailsCard sourceLabel={sourceLabel} />
              <DataQualityCheckCard />
              <WhatsNextCard sourceLabel={sourceLabel} />
              <ImportSummaryHelpCard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
