import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "ui";

interface InfoNoteProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoNote({ children, className }: InfoNoteProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full bg-blue-50/80 p-4 rounded-xl border border-blue-100",
        className,
      )}
    >
      <Info className="h-5 w-5 text-blue-600 shrink-0" />
      <span className="text-sm font-semibold text-secondary">{children}</span>
    </div>
  );
}
