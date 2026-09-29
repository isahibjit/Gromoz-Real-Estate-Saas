import * as React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-secondary">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
