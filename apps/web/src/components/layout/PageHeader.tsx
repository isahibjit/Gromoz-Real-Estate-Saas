import * as React from "react";
import { cn } from "ui";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

type WorkspacePageProps = React.ComponentPropsWithoutRef<"div">;

export function WorkspacePage({ className, ...props }: WorkspacePageProps) {
  return <div className={cn("space-y-5", className)} {...props} />;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="crm-page-heading">{title}</h1>
        {subtitle && <p className="crm-page-description">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
