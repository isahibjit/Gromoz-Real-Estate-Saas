import type { PropsWithChildren } from "react";

import { Card, cn } from "ui";

export function AuthCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <Card
      className={cn(
        "rounded-[18px] border border-slate-200 bg-white shadow-none sm:rounded-[20px]",
        className,
      )}
    >
      {children}
    </Card>
  );
}
