import { Check } from "lucide-react";
import { Button, Card, cn } from "ui";

import type { LeadSource } from "./addLeadTypes";

export function LeadSourceSelector({
  sources,
  selectedSourceId,
  onSelect,
}: {
  sources: LeadSource[];
  selectedSourceId: string;
  onSelect: (sourceId: string) => void;
}) {
  return (
    <Card className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,37,68,0.04)]">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center text-primary">
            <Check className="size-4" />
          </span>
          <h2 className="text-base font-extrabold text-foreground">
            Lead Source
          </h2>
        </div>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          Select the source of this lead
        </p>
      </div>

      {sources.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
          {sources.map((source) => {
            const Icon = source.icon;
            const selected = selectedSourceId === source.id;

            return (
              <Button
                key={source.id}
                type="button"
                variant="outline"
                aria-pressed={selected}
                aria-label={`Lead source ${source.name}`}
                className={cn(
                  "relative h-[74px] flex-col rounded-[8px] border-slate-200 bg-white p-2 text-xs font-extrabold shadow-none hover:border-primary/50 hover:bg-primary/5",
                  selected &&
                    "border-primary bg-primary/5 ring-1 ring-primary/20",
                )}
                onClick={() => onSelect(source.id)}
              >
                {selected ? (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
                <Icon className={cn("size-7", source.tone)} />
                <span>{source.name}</span>
              </Button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm font-semibold text-muted-foreground">
          No lead sources available
        </p>
      )}
    </Card>
  );
}
