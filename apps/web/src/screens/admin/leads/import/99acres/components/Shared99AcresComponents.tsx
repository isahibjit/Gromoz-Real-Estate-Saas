import {
  CalendarDays,
  ChevronRight,
  LifeBuoy,
  Search,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";
import { DashboardHeader } from "../../../../dashboard/DashboardHeader";

export function Header({
  search,
  onSearchChange,
  onMobileMenuOpen,
  onDesktopSidebarToggle,
  breadcrumbs = ["Connect to 99Acres"],
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onMobileMenuOpen: () => void;
  onDesktopSidebarToggle: () => void;
  breadcrumbs?: string[];
}) {
  return (
    <DashboardHeader
      onMobileMenuOpen={onMobileMenuOpen}
      onDesktopSidebarToggle={onDesktopSidebarToggle}
      breadcrumbs={
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Dashboard</span>
          <ChevronRight className="size-3.5" />
          <span>Lead Management</span>
          <ChevronRight className="size-3.5" />
          <span>Import Leads</span>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5" />
              <span
                className={
                  idx === breadcrumbs.length - 1 ? "text-foreground" : ""
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
      }
    >
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search leads, customers, projects, mobile number"
            value={search}
            placeholder="Search leads, customers, projects, mobile number..."
            className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
            ⌘ K
          </span>
        </div>
        <Select defaultValue="date">
          <SelectTrigger
            aria-label="Date range"
            className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
          >
            <CalendarDays className="h-4 w-4 text-info mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">May 20 - May 20, 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </DashboardHeader>
  );
}

export function SidebarFooter() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">Need Help?</p>
            <p className="text-xs font-semibold text-white/75">
              Contact Support
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <p className="text-sm font-extrabold">Trueroot Realty CRM</p>
        <p className="mt-1 text-sm font-bold text-[#ffc78f]">Premium Plan</p>
        <p className="mt-3 text-xs font-semibold text-white/75">
          Valid till 31 Dec 2025
        </p>
        <Button
          type="button"
          className="mt-4 h-10 w-full rounded-md bg-primary text-sm font-bold text-white hover:bg-primary-hover"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}

export function ConnectionStepper({ activeStep }: { activeStep: number }) {
  const steps = [
    {
      number: 1,
      title: "Select Source",
      subtitle: "99Acres",
      state:
        activeStep > 1 ? "completed" : activeStep === 1 ? "active" : "inactive",
    },
    {
      number: 2,
      title: "Connect Account",
      subtitle: activeStep > 2 ? "Authenticated" : "Authenticate & Configure",
      state:
        activeStep > 2 ? "completed" : activeStep === 2 ? "active" : "inactive",
    },
    {
      number: 3,
      title: "Map Fields",
      subtitle: "Map lead fields",
      state:
        activeStep > 3 ? "completed" : activeStep === 3 ? "active" : "inactive",
    },
    {
      number: 4,
      title: "Test Connection",
      subtitle: "Verify & Save",
      state:
        activeStep > 4 ? "completed" : activeStep === 4 ? "active" : "inactive",
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 sm:p-6 shadow-card overflow-x-auto">
      <div className="flex items-center min-w-[700px] w-max">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                  step.state === "inactive"
                    ? "bg-slate-100 text-slate-400"
                    : "bg-secondary text-white",
                )}
              >
                {step.number}
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-extrabold",
                    step.state === "inactive"
                      ? "text-slate-400"
                      : "text-secondary",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {step.subtitle}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="w-16 sm:w-24 lg:w-32 mx-4 h-px bg-slate-200 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
