import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "ui";

export function SecurityInfoCard() {
  return (
    <Card className="rounded-[var(--radius-card)] border-border/90 bg-card shadow-card">
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-secondary">
          <ShieldCheck
            aria-hidden="true"
            className="size-7"
            strokeWidth={1.9}
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-extrabold tracking-tight text-foreground">
            Secure. Role-based. Built for your team.
          </h3>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Truroot Realty CRM provides secure, role-based access for Admin,
            Pre Sales Executive, and Sales Executive.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
