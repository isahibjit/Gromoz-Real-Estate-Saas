import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, cn } from "ui";
import { dashboardPanelClass } from "./dashboardStyles";

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardPanel({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
}: DashboardPanelProps) {
  return (
    <Card className={cn(dashboardPanelClass, "min-w-0", className)}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <CardTitle className="text-sm font-extrabold text-foreground">
            {title}
          </CardTitle>
          {subtitle ? (
            <span className="text-xs text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("min-w-0 px-4 pb-4 pt-1 sm:px-5 sm:pb-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
