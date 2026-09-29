import {
  AlertCircle,
  CheckCircle2,
  Flame,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card, cn } from "ui";

import type { ProjectCatalogItem } from "../../projects/projectsData";
import type { AddLeadFormData } from "./addLeadTypes";
import { quickActionItems } from "./addLeadData";

type SummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "hot" | "success" | "warning";
};

// type RecommendedProjectRow = {
//   id: string;
//   name: string;
//   configuration: string;
//   location: string;
//   imageUrl?: string;
//   matchScore: number;
// };

const budgetMultiplier = (unit: string) => {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "cr" || normalized === "crore") return 10000000;
  if (normalized === "lakh" || normalized === "lac" || normalized === "l")
    return 100000;
  if (normalized === "thousand" || normalized === "k") return 1000;
  return 1;
};

const parseBudgetLabel = (value: string) => {
  const match = value.match(
    /(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lac|thousand|k|l)?/i,
  );
  if (!match) return undefined;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return numeric * budgetMultiplier(match[2] ?? "");
};

const parseBudgetRange = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return {};
  const parts = normalized.split("-").map((part) => part.trim());
  return {
    minBudget: parseBudgetLabel(parts[0] ?? ""),
    maxBudget: normalized.includes("+")
      ? undefined
      : parseBudgetLabel(parts[1] ?? ""),
  };
};

const formatMoney = (value?: number) => {
  if (!value) return "Not Set";
  if (value >= 10000000) return `INR ${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `INR ${(value / 100000).toFixed(2)} Lakh`;
  return `INR ${value.toLocaleString("en-IN")}`;
};

const prettifyRoleLabel = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parsePriceLabel = (value?: string) => {
  if (!value) return undefined;
  const numeric = Number(String(value).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) return undefined;
  if (String(value).toLowerCase().includes("cr")) return numeric * 10000000;
  if (String(value).toLowerCase().includes("lakh")) return numeric * 100000;
  return numeric;
};

const averageAvailableUnitPrice = (project: ProjectCatalogItem) => {
  const prices = project.units
    .filter((unit) => unit.availability === "Available")
    .map((unit) => parsePriceLabel(unit.price))
    .filter((value): value is number => Boolean(value));
  if (!prices.length) return undefined;
  return prices.reduce((sum, value) => sum + value, 0) / prices.length;
};

const hasCompleteRequirementProfile = (formData: AddLeadFormData) =>
  Boolean(
    formData.propertyType.trim() &&
      formData.configuration.trim() &&
      formData.budgetRange.trim() &&
      formData.preferredLocation.trim(),
  );

const buildRecommendedProjects = (
  formData: AddLeadFormData,
  projects: ProjectCatalogItem[],
) => {
  if (!hasCompleteRequirementProfile(formData)) {
    return [];
  }

  const preferredLocation = formData.preferredLocation.trim().toLowerCase();
  const configuration = formData.configuration.trim().toLowerCase();
  const { minBudget, maxBudget } = parseBudgetRange(formData.budgetRange);

  return projects
    .map((project) => {
      let score = 0;

      if (
        formData.preferredProject &&
        formData.preferredProject === project.id
      ) {
        score += 40;
      }

      if (project.location.toLowerCase().includes(preferredLocation)) {
        score += 25;
      }

      const configurationMatch =
        project.configurations.some((item) =>
          item.toLowerCase().includes(configuration),
        ) ||
        project.units.some((unit) =>
          unit.configuration.toLowerCase().includes(configuration),
        );

      if (configurationMatch) {
        score += 20;
      }

      const avgPrice = averageAvailableUnitPrice(project);
      if (
        avgPrice !== undefined &&
        minBudget !== undefined &&
        maxBudget !== undefined &&
        avgPrice >= minBudget &&
        avgPrice <= maxBudget
      ) {
        score += 15;
      }

      const availableUnits = project.units.filter(
        (unit) => unit.availability === "Available",
      ).length;
      if (availableUnits > 0) {
        score += Math.min(availableUnits, 5);
      }

      return {
        id: project.id,
        name: project.name,
        configuration:
          project.configurations.join(", ") ||
          formData.propertyType ||
          "Project",
        location: project.location,
        imageUrl: project.imageUrl,
        matchScore: Math.min(score, 100),
      };
    })
    .filter((project) => project.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 3);
};

const buildSummaryMetrics = (
  formData: AddLeadFormData,
  telecallerName?: string,
  fieldExecutiveName?: string,
): SummaryMetric[] => {
  const completeRequirementProfile = hasCompleteRequirementProfile(formData);
  const { minBudget, maxBudget } = parseBudgetRange(formData.budgetRange);

  const coverage = [
    telecallerName ? "Pre Sales Executive" : null,
    fieldExecutiveName ? "Sales Executive" : null,
  ].filter(Boolean);

  const qualityScore = completeRequirementProfile
    ? Math.min(
        100,
        45 +
          (formData.preferredProject ? 15 : 0) +
          (formData.possessionTimeline ? 10 : 0) +
          (formData.purpose ? 10 : 0) +
          (formData.interestLevel === "high"
            ? 20
            : formData.interestLevel
            ? 12
            : 0),
      )
    : undefined;

  return [
    {
      label: "Requirement Match Score",
      value: qualityScore ? `${qualityScore}%` : "Complete requirements",
      tone: qualityScore
        ? qualityScore >= 80
          ? "success"
          : qualityScore >= 60
          ? "warning"
          : "default"
        : "default",
    },
    {
      label: "Qualified Budget",
      value: formData.budgetRange.trim()
        ? formData.budgetRange
        : minBudget && maxBudget
        ? `${formatMoney(minBudget)} - ${formatMoney(maxBudget)}`
        : "Not Set",
    },
    {
      label: "Lead Temperature",
      value: formData.interestLevel
        ? prettifyRoleLabel(formData.interestLevel)
        : formData.priority
        ? prettifyRoleLabel(formData.priority)
        : "Not Scored",
      tone:
        formData.interestLevel === "high" || formData.priority === "high"
          ? "hot"
          : undefined,
    },
    {
      label: "Assignment Coverage",
      value: coverage.length > 0 ? coverage.join(" + ") : "Pending assignment",
    },
    {
      label: "Next Follow-up",
      value:
        formData.autoAssignFollowUp && formData.followUpDate
          ? [formData.followUpDate, formData.followUpTime]
              .filter(Boolean)
              .join(", ")
          : "Not scheduled",
    },
  ];
};

function CardHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Sparkles;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-info">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function RecommendedProjectsCard({
  formData,
  projects,
}: {
  formData: AddLeadFormData;
  projects: ProjectCatalogItem[];
}) {
  const recommendedProjects = buildRecommendedProjects(formData, projects);
  const showState = !hasCompleteRequirementProfile(formData);

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <CardHeader
        icon={FolderKanban}
        title="Recommended Projects"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-1 text-xs font-bold text-primary"
          >
            View All
          </Button>
        }
      />
      <div className="space-y-4 px-5 py-4">
        {showState ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-extrabold text-secondary">
              Complete the property requirements
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              Add configuration, budget, and preferred location to rank live
              projects by requirement fit.
            </p>
          </div>
        ) : recommendedProjects.length > 0 ? (
          recommendedProjects.map((project) => (
            <div key={project.id} className="flex gap-3">
              <div className="h-16 w-14 shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-100">
                {project.imageUrl ? (
                  <img
                    src={project.imageUrl}
                    alt={project.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {project.name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-secondary">
                      {project.configuration}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {project.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Match Score
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-success">
                      {project.matchScore}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-extrabold text-secondary">
              No matching live projects
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              The current requirement profile does not align with the active
              project inventory yet.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function LeadSummaryCard({
  formData,
  telecallerName,
  fieldExecutiveName,
}: {
  formData: AddLeadFormData;
  telecallerName?: string;
  fieldExecutiveName?: string;
}) {
  const metrics = buildSummaryMetrics(
    formData,
    telecallerName,
    fieldExecutiveName,
  );

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <CardHeader icon={Sparkles} title="Lead Summary" />
      <div className="space-y-4 px-5 py-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="font-semibold text-muted-foreground">
              {metric.label}
            </span>
            <span
              className={cn(
                "text-right font-extrabold text-secondary",
                metric.tone === "hot" &&
                  "inline-flex items-center gap-1 text-warning",
                metric.tone === "success" && "text-success",
                metric.tone === "warning" && "text-primary",
              )}
            >
              {metric.tone === "hot" ? <Flame className="size-4" /> : null}
              {metric.value}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-3">
          {hasCompleteRequirementProfile(formData) ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          )}
          <div>
            <p className="text-xs font-extrabold text-secondary">
              Requirement-based scoring
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              This score is calculated from the filled property requirement
              profile and live project fit. It is not AI-generated.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function QuickActionsCard({
  onAction,
}: {
  onAction: (actionId: string) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <CardHeader icon={Sparkles} title="Quick Actions" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-5">
        {quickActionItems.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              className="flex h-auto w-full flex-col items-center justify-start gap-2.5 rounded-md bg-transparent px-1 py-0 text-center whitespace-normal hover:bg-transparent"
              onClick={() => onAction(action.id)}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-md border border-slate-200 bg-white text-secondary px-2 py-1",
                  action.tone === "whatsapp" && "text-success",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-h-[40px] max-w-[84px] text-[11px] font-bold leading-[1.25rem] text-secondary whitespace-normal break-words">
                {action.label}
              </span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
