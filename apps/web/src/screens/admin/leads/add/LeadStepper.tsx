import { Card, cn } from "ui";

const steps = [
  "Lead Information",
  "Requirements",
  "Assign & Follow-up",
  "Review & Submit",
];

export function LeadStepper({ currentStep }: { currentStep: number }) {
  return (
    <Card className="rounded-[12px] border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,37,68,0.04)]">
      <ol
        aria-label="Lead creation steps"
        className="grid gap-4 md:grid-cols-4"
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const complete = currentStep > stepNumber;

          return (
            <li
              key={step}
              className="flex items-center gap-3"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0  items-center justify-center rounded-full border text-sm font-extrabold px-2",
                  active || complete
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-slate-50 text-secondary",
                )}
              >
                {stepNumber}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-bold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step}
              </span>
              {index < steps.length - 1 ? (
                <span className="hidden h-px flex-1 bg-slate-200 md:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
