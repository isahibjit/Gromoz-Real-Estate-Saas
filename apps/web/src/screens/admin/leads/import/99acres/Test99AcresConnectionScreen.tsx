import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  CloudUpload,
  Copy,
  ExternalLink,
  FileText,
  Info,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  RefreshCcw,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { Badge, Button, Card, cn } from "ui";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import {
  ConnectionStepper,
  Header,
  SidebarFooter,
} from "./components/Shared99AcresComponents";

// --- Mock Data ---

type SampleLead = {
  id: string;
  initials: string;
  fullName: string;
  mobile: string;
  email: string;
  propertyType: string;
  budget: string;
  location: string;
  source: string;
  status: "Valid" | "Invalid";
};

const sampleLeads: SampleLead[] = [
  {
    id: "1",
    initials: "RS",
    fullName: "Rahul Sharma",
    mobile: "+91 98765 43210",
    email: "rahul.sharma@email.com",
    propertyType: "2 BHK Apartment",
    budget: "1 - 1.5 Cr",
    location: "Andheri, Mumbai",
    source: "99Acres",
    status: "Valid",
  },
  {
    id: "2",
    initials: "NK",
    fullName: "Neha Kapoor",
    mobile: "+91 98123 45678",
    email: "neha.kapoor@email.com",
    propertyType: "3 BHK Apartment",
    budget: "1.5 - 2 Cr",
    location: "Borivali, Mumbai",
    source: "99Acres",
    status: "Valid",
  },
  {
    id: "3",
    initials: "VS",
    fullName: "Vikram Singh",
    mobile: "+91 98234 56789",
    email: "vikram.singh@email.com",
    propertyType: "2 BHK Apartment",
    budget: "90 L - 1.2 Cr",
    location: "Thane, Mumbai",
    source: "99Acres",
    status: "Valid",
  },
  {
    id: "4",
    initials: "AM",
    fullName: "Anjali Mehta",
    mobile: "+91 98345 67890",
    email: "anjali.mehta@email.com",
    propertyType: "1 BHK Apartment",
    budget: "60 - 80 L",
    location: "Dadar, Mumbai",
    source: "99Acres",
    status: "Valid",
  },
  {
    id: "5",
    initials: "KP",
    fullName: "Karan Patel",
    mobile: "+91 98712 34567",
    email: "karan.patel@email.com",
    propertyType: "2 BHK Apartment",
    budget: "1 - 1.3 Cr",
    location: "Goregaon, Mumbai",
    source: "99Acres",
    status: "Valid",
  },
];

// --- Subcomponents ---

function ConnectionTestResultCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 sm:p-7 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-secondary">
              Connection Successful!
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
              We have successfully connected to your 99Acres account and
              fetched sample leads.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md shadow-none font-bold text-secondary border-slate-200 hover:bg-slate-50 text-[13px] px-5"
        >
          <RefreshCcw className="mr-2 h-4 w-4 text-muted-foreground" />
          Re-Test Connection
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Records Fetched */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                1,248
              </p>
              <p className="text-[11px] font-bold text-muted-foreground mt-1.5">
                Total Records Fetched
              </p>
            </div>
          </div>
        </div>

        {/* Valid Records */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                1,236
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[11px] font-bold text-secondary">
                  Valid Records
                </p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  (99.04%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invalid Records */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                8
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[11px] font-bold text-secondary">
                  Invalid Records
                </p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  (0.64%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Duplicates Found */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                4
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[11px] font-bold text-secondary">
                  Duplicates Found
                </p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  (0.32%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Time */}
        <div className="flex flex-col justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-secondary leading-none mt-1">
                2.34 sec
              </p>
              <p className="text-[11px] font-bold text-muted-foreground mt-1.5">
                Response Time
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SampleLeadsPreviewTable() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white shadow-card overflow-hidden mt-5">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-[13px] font-extrabold text-secondary">
          Preview of Sample Leads (First 5 Records)
        </h3>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Full Name
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
                Budget
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Location
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Source
              </th>
              <th className="py-3 px-5 text-[11px] font-extrabold text-secondary font-manrope">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sampleLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-extrabold text-secondary">
                      {lead.initials}
                    </span>
                    <span className="text-xs font-bold text-secondary">
                      {lead.fullName}
                    </span>
                  </div>
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
                <td className="py-3 px-5 text-xs font-semibold text-muted-foreground">
                  {lead.budget}
                </td>
                <td className="py-3 px-5 text-xs font-semibold text-muted-foreground">
                  {lead.location}
                </td>
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#e71921] text-[8px] font-extrabold text-white">
                      mb
                    </span>
                    <span className="text-xs font-bold text-secondary">
                      {lead.source}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-5">
                  <Badge className="rounded-full border-0 bg-green-50 px-2.5 py-0.5 text-[10px] font-extrabold text-success">
                    {lead.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 text-blue-600">
          <Info className="h-4 w-4" />
          <p className="text-[11px] font-semibold text-muted-foreground">
            Only first 5 records are shown. You can import up to 1,236 valid
            records.
          </p>
        </div>
        <Button
          variant="ghost"
          className="h-auto p-0 text-[11px] font-extrabold text-blue-600 shadow-none hover:bg-transparent hover:text-blue-700"
        >
          View All Sample Data
          <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function SecurityNoticeBar() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-sm mt-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-4 items-start md:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-extrabold text-secondary">
              Your data is secure
            </h4>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
              We use bank-level encryption to keep your data safe and secure.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-[11px] font-bold text-secondary">
              SSL Encrypted
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-[11px] font-bold text-secondary">
              Secure Connection
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-[11px] font-bold text-secondary">
              GDPR Compliant
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ConnectionDetailsCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary mb-5">
        Connection Details
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Source
          </span>
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#e71921] text-[8px] font-extrabold text-white">
              mb
            </span>
            <span className="text-[11px] font-extrabold text-secondary text-right break-all">
              99Acres
            </span>
          </div>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Account
          </span>
          <span className="text-[11px] font-semibold text-blue-600 text-right break-all">
            rahul.sharma@truerootrealty.com
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Connected On
          </span>
          <span className="text-[11px] font-bold text-secondary text-right">
            20 May 2025, 10:25 AM
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Connected By
          </span>
          <span className="text-[11px] font-bold text-secondary text-right">
            Amit Kumar
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] font-bold text-muted-foreground min-w-[90px]">
            Status
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[11px] font-extrabold text-green-600 text-right">
              Connected
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DataSummaryCard() {
  const data = [
    { name: "Valid Records", value: 1236, color: "#118d57" },
    { name: "Invalid Records", value: 8, color: "#f59e0b" },
    { name: "Duplicates", value: 4, color: "#9333ea" },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h3 className="text-sm font-extrabold text-secondary mb-6">
        Data Summary
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={35}
                outerRadius={50}
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
            <span className="text-sm font-extrabold text-secondary leading-none">
              1,248
            </span>
            <span className="text-[8px] font-bold text-muted-foreground mt-0.5 leading-tight text-center">
              Total
              <br />
              Records
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-extrabold text-secondary">
                  {item.value}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WhatHappensNextCard() {
  const steps = [
    {
      title: "Import Process",
      desc: "We will start importing your leads from 99Acres.",
    },
    {
      title: "Data Validation",
      desc: "All leads will be validated and duplicates removed.",
    },
    {
      title: "Import to CRM",
      desc: "Valid leads will be added to Trueroot Realty CRM.",
    },
    {
      title: "You'll Get Notified",
      desc: "Once import is complete, you'll receive a notification.",
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h3 className="text-sm font-extrabold text-secondary mb-6">
        What Happens Next?
      </h3>
      <div className="relative">
        <div className="absolute left-3.5 top-2 bottom-6 w-px bg-slate-200" />
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="relative flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 z-10 relative">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="pt-0.5">
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

function ConnectionHelpCard() {
  return (
    <Card className="rounded-md border border-blue-100 bg-[#f4f9ff] p-5 shadow-none mt-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-secondary">Need Help?</h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
            Our support team is here to help you.
          </p>
        </div>
      </div>
      <div className="space-y-2 text-[11px] font-bold text-secondary pl-11">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          Live Chat
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          +91 22 4567 8900
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          support@truerootrealty.com
        </div>
      </div>
    </Card>
  );
}

function TestConnectionFooterActions({
  onBack,
  onSaveLater,
  onStartImport,
}: {
  onBack: () => void;
  onSaveLater: () => void;
  onStartImport: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
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
        onClick={onSaveLater}
      >
        <Bookmark className="mr-2 h-4 w-4 text-muted-foreground" />
        Save Connection for Later
      </Button>
      <Button
        type="button"
        className="w-full sm:w-auto h-11 px-8 rounded-md font-bold text-white bg-primary hover:bg-primary-hover shadow-sm"
        onClick={onStartImport}
      >
        Start Import
        <CloudUpload className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Main Screen Component ---

export function Test99AcresConnectionScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSaveLater = () => {
    toast.success("Connection saved for later.");
    navigate("/leads/import");
  };

  const handleStartImport = () => {
    toast.success("Starting import process...");
    navigate("/leads/import/summary/99acres-12345?source=99acres");
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
      <div className="min-w-0 flex-1 flex flex-col">
        <Header
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={["Connect to 99Acres", "Test Connection"]}
        />
        <main className="flex-1 space-y-5 p-4 sm:p-6 overflow-x-hidden">
          <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-secondary">
                  Test Connection
                </h1>
                <Badge className="bg-green-50 text-success border-0 px-2 py-0.5 text-[10px] font-extrabold rounded">
                  Connection Successful
                </Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-muted-foreground max-w-2xl">
                We have successfully connected to 99Acres. Test your
                connection and verify the data before importing.
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
            <div className="space-y-5 min-w-0">
              <ConnectionStepper activeStep={4} />

              <ConnectionTestResultCard />

              <SampleLeadsPreviewTable />

              <TestConnectionFooterActions
                onBack={() =>
                  navigate("/leads/import/connect/99acres/map-fields")
                }
                onSaveLater={handleSaveLater}
                onStartImport={handleStartImport}
              />

              <SecurityNoticeBar />
            </div>

            <aside>
              <ConnectionDetailsCard />
              <DataSummaryCard />
              <WhatHappensNextCard />
              <ConnectionHelpCard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
