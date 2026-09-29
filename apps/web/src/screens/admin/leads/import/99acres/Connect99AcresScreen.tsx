import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Info,
  LifeBuoy,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  Loader2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";

import {
  ConnectionStepper,
  Header,
  SidebarFooter,
} from "./components/Shared99AcresComponents";

function IntegrationSourceProfileCard() {
  return (
    <div className="w-full xl:w-[220px] shrink-0 border-b xl:border-b-0 xl:border-r border-slate-100 pb-6 xl:pb-0 xl:pr-6 flex flex-col">
      <div className="flex items-center justify-center xl:justify-start gap-4">
        <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1597d4] text-white">
          <span className="text-3xl font-extrabold leading-none">99</span>
          <span className="text-[10px] font-bold leading-none">acres</span>
        </span>
        <div className="text-left">
          <h3 className="text-[22px] font-extrabold text-secondary leading-none">
            99Acres
          </h3>
          <p className="mt-1.5 text-[13px] font-bold text-slate-500">
            Real Estate Portal
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-center xl:justify-start pl-1">
        <Badge className="bg-[#eefcf3] text-[#118d57] hover:bg-[#eefcf3] border-0 px-4 py-1 text-[11px] font-extrabold rounded-full">
          Active Source
        </Badge>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6 w-full space-y-6 text-center xl:text-left">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            Leads Imported
          </p>
          <p className="mt-1 text-2xl font-extrabold text-secondary">1,248</p>
          <p className="text-xs font-semibold text-muted-foreground">
            This Month
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            Last Imported
          </p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            20 May 2025
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            10:25 AM
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">Status</p>
          <div className="mt-1 flex items-center justify-center xl:justify-start gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-sm font-extrabold text-success">
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Acres99CredentialsForm() {
  const navigate = useNavigate();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const handleTestConnection = () => {
    setConnectionStatus("testing");
    setTimeout(() => {
      setConnectionStatus("success");
    }, 1500);
  };

  return (
    <div className="flex-1">
      <h3 className="text-base font-extrabold text-secondary mb-4">
        Enter API Credentials
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-secondary">
            API Key / Client ID <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder="Enter your 99Acres API Key"
              className="h-11 rounded-md border-slate-200 text-sm shadow-none pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-secondary">
            API Secret / Client Secret <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showApiSecret ? "text" : "password"}
              placeholder="Enter your 99Acres API Secret"
              className="h-11 rounded-md border-slate-200 text-sm shadow-none pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
              onClick={() => setShowApiSecret(!showApiSecret)}
            >
              {showApiSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-secondary">
            Username / Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter your 99Acres registered email"
              className="h-11 rounded-md border-slate-200 text-sm shadow-none pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-secondary">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your 99Acres password"
              className="h-11 rounded-md border-slate-200 text-sm shadow-none pl-10 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-secondary">
            Select Region / Account
          </label>
          <Select>
            <SelectTrigger className="h-11 rounded-md border-slate-200 text-sm shadow-none">
              <SelectValue placeholder="Select your 99Acres account/region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="india-west">India - West Region</SelectItem>
              <SelectItem value="india-north">India - North Region</SelectItem>
              <SelectItem value="india-south">India - South Region</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox id="import-historical" className="border-slate-300" />
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="import-historical"
                className="text-sm font-extrabold text-secondary cursor-pointer"
              >
                Import Historical Leads
              </label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-md text-xs font-bold text-secondary bg-white">
            <CalendarDays className="h-4 w-4 text-primary" />
            Apr 20, 2025 - May 20, 2025
          </div>
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground ml-6 mt-0.5">
          Import leads from the last 30 days
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 px-8 rounded-md shadow-none font-bold text-secondary border-slate-200"
            onClick={() => navigate("/leads/import")}
          >
            Cancel
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full sm:w-auto h-11 px-6 rounded-md shadow-none font-bold",
              connectionStatus === "success" 
                ? "text-success border-success bg-green-50"
                : "text-blue-600 border-blue-600 hover:bg-blue-50"
            )}
            onClick={handleTestConnection}
            disabled={connectionStatus === "testing" || connectionStatus === "success"}
          >
            {connectionStatus === "testing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : connectionStatus === "success" ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Connection Successful
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto h-11 px-6 rounded-md font-bold text-white bg-primary hover:bg-primary-hover shadow-sm"
            onClick={() =>
              navigate("/leads/import/connect/99acres/map-fields")
            }
            disabled={connectionStatus !== "success"}
          >
            Connect & Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConnectionRequirementsCard() {
  const requirements = [
    "Active 99Acres account",
    "API access enabled",
    "Valid API credentials",
    "Permissions to read leads",
    "Stable internet connection",
  ];

  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/50 p-5">
      <h4 className="text-sm font-extrabold text-secondary mb-4">
        Connection Requirements
      </h4>
      <div className="space-y-3">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-xs font-bold text-secondary">{req}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CredentialsGuideCard() {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/50 p-5 mt-5">
      <h4 className="text-sm font-extrabold text-secondary mb-2">
        Where to find API Credentials?
      </h4>
      <p className="text-xs font-semibold text-muted-foreground mb-4 leading-relaxed">
        Follow the steps on the right to get your API credentials from
        99Acres.
      </p>
      <Button
        variant="outline"
        className="w-full h-10 rounded-md shadow-none text-xs font-bold border-slate-200 bg-white"
      >
        <FileText className="mr-2 h-4 w-4 text-primary" />
        View Detailed Guide
      </Button>
    </div>
  );
}

function CredentialStepsCard() {
  const steps = [
    {
      title: "Login to 99Acres Partner Panel",
      desc: "Go to https://partners.99Acres.com and login with your account.",
    },
    {
      title: "Navigate to API Section",
      desc: "Go to Settings > API Integration from the left menu.",
    },
    {
      title: "Generate API Credentials",
      desc: "Click on 'Generate New API Key' and copy your API Key and Secret.",
    },
    {
      title: "Set Permissions",
      desc: "Ensure you have 'Read Leads' permission enabled.",
    },
    {
      title: "Copy & Connect",
      desc: "Paste the credentials here and click on Connect.",
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-extrabold text-secondary mb-6">
        How to Get 99Acres API Credentials
      </h2>
      <div className="relative">
        {/* Vertical line connector */}
        <div className="absolute left-3.5 top-2 bottom-6 w-0.5 bg-slate-100" />

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

function ConnectionBenefitsCard() {
  const benefits = [
    {
      title: "Auto Sync Leads",
      desc: "Automatically import leads in real-time.",
      icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    },
    {
      title: "No Manual Effort",
      desc: "Save time with automated lead capture.",
      icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    },
    {
      title: "Better Accuracy",
      desc: "Eliminate manual entry errors.",
      icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    },
    {
      title: "Real-time Updates",
      desc: "Get instant lead updates and notifications.",
      icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <h2 className="text-base font-extrabold text-secondary mb-5">
        Benefits of Connection
      </h2>
      <div className="space-y-5">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex gap-3">
            <div className="mt-0.5">{benefit.icon}</div>
            <div>
              <p className="text-xs font-extrabold text-secondary">
                {benefit.title}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                {benefit.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConnectionHelpCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card mt-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-secondary">Need Help?</h2>
          <p className="text-[11px] font-medium text-muted-foreground">
            Our support team is here to help you.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 h-9 rounded-md text-xs font-bold border-slate-200 bg-white shadow-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="mr-2 h-4 w-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
          </svg>
          Live Chat
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-secondary">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          +91 22 4567 8900
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-secondary">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        support@truerootrealty.com
      </div>
    </Card>
  );
}

function SecurityNoticeBar() {
  return (
    <Card className="rounded-md border border-slate-200 bg-slate-50/50 p-4 shadow-card mt-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-success shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-secondary">
              Your data is 100% secure
            </h3>
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
              We never store your 99Acres password. All connections are
              encrypted and secure.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> SSL Encrypted
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Bank-level Security
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> GDPR Compliant
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Connect99AcresScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

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
        />
        <main className="flex-1 space-y-5 p-4 sm:p-6 overflow-x-hidden">
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-secondary">
                Connect to 99Acres
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Connect your 99Acres account to import leads directly into
                Trueroot Realty CRM.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="text-sm font-extrabold text-secondary hover:bg-slate-100 -ml-2 sm:ml-0 self-start sm:self-auto"
              onClick={() => navigate("/leads/import")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Import Sources
            </Button>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
            <div className="space-y-5 min-w-0">
              <ConnectionStepper activeStep={2} />

              <Card className="rounded-md border border-slate-200 bg-white p-5 sm:p-7 shadow-card overflow-hidden">
                <div className="mb-8">
                  <h2 className="text-xl font-extrabold text-secondary">
                    Connect Your 99Acres Account
                  </h2>
                  <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
                    To connect, you need your 99Acres API credentials.
                    Follow the steps on the right to get your credentials.
                  </p>
                </div>

                <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
                  <IntegrationSourceProfileCard />
                  <Acres99CredentialsForm />
                  <div className="hidden 2xl:block w-[260px] shrink-0">
                    <ConnectionRequirementsCard />
                    <CredentialsGuideCard />
                  </div>
                </div>

                {/* Show requirements on smaller screens */}
                <div className="2xl:hidden mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <ConnectionRequirementsCard />
                  <CredentialsGuideCard />
                </div>
              </Card>

              <SecurityNoticeBar />
            </div>

            <aside className="space-y-5">
              <CredentialStepsCard />
              <ConnectionBenefitsCard />
              <ConnectionHelpCard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
