import { ChevronRight, Search } from "lucide-react";
import { Card, Input, cn } from "ui";

import { DashboardHeader } from "../../../../dashboard/DashboardHeader";

export function Header({
  search,
  onSearchChange,
  onMobileMenuOpen,
  onDesktopSidebarToggle,
  breadcrumbs = ["Connect to MagicBricks"],
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
          <span>Lead management</span>
          <ChevronRight className="size-3.5" />
          <span>Import leads</span>
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
      <div className="flex w-full items-center gap-3">
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
            Ctrl K
          </span>
        </div>
      </div>
    </DashboardHeader>
  );
}

export function ConnectionStepper({ activeStep }: { activeStep: number }) {
  const steps = [
    {
      number: 1,
      title: "Select source",
      subtitle: "MagicBricks",
      state:
        activeStep > 1 ? "completed" : activeStep === 1 ? "active" : "inactive",
    },
    {
      number: 2,
      title: "Configure endpoint",
      subtitle: "Webhook and API key",
      state:
        activeStep > 2 ? "completed" : activeStep === 2 ? "active" : "inactive",
    },
    {
      number: 3,
      title: "Map fields",
      subtitle: "Portal to CRM fields",
      state:
        activeStep > 3 ? "completed" : activeStep === 3 ? "active" : "inactive",
    },
  ];

  return (
    <Card className="overflow-x-auto rounded-md border border-slate-200 bg-white p-4 shadow-card sm:p-6">
      <div className="flex w-max min-w-[560px] items-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex shrink-0 items-center gap-3">
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
            {index < steps.length - 1 ? (
              <div className="mx-4 h-px w-16 shrink-0 bg-slate-200 sm:w-24 lg:w-32" />
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
