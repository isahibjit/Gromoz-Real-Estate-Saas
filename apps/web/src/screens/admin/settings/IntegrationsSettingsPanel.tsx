import { useNavigate } from "react-router-dom";
import { AlertCircle, ExternalLink, PlugZap } from "lucide-react";
import { Badge, Button, Card, cn } from "ui";

import {
  CONNECTOR_STATE_LABEL,
  LEAD_SOURCE_CONNECTORS,
  LeadSourceConnectorMark,
  type ConnectorState,
} from "../leads/import/leadSourceRegistry";
import { useLeadImportStats } from "../leads/import/useLeadImportStats";

const connectorBadgeVariant: Record<
  ConnectorState,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  NOT_CONFIGURED: "neutral",
  CONFIGURED: "info",
  ACTIVE: "success",
  PAUSED: "warning",
  ERROR: "danger",
};

function formatDate(value: string | null) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IntegrationsSettingsPanel() {
  const navigate = useNavigate();
  const leadStatsQuery = useLeadImportStats();
  const connectorSummaries = new Map(
    (leadStatsQuery.data?.connectors ?? []).map((connector) => [
      connector.id,
      connector,
    ]),
  );

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/70 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <PlugZap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Lead-source integrations
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review connection health and open the dedicated setup workspace
              for each supported lead source.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/leads/import")}
        >
          Open Portal Integrations
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      {leadStatsQuery.isLoading ? (
        <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
          {LEAD_SOURCE_CONNECTORS.map((connector) => (
            <div
              key={connector.id}
              className="h-40 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      ) : leadStatsQuery.isError ? (
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Lead-source status could not be loaded.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void leadStatsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
          {LEAD_SOURCE_CONNECTORS.map((connector) => {
            const summary = connectorSummaries.get(connector.id);
            const state = summary?.state ?? "NOT_CONFIGURED";
            return (
              <article
                key={connector.id}
                className="flex min-h-44 flex-col rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <LeadSourceConnectorMark connector={connector} />
                  <Badge variant={connectorBadgeVariant[state]}>
                    {CONNECTOR_STATE_LABEL[state]}
                  </Badge>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-foreground">
                    {connector.name}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {connector.description}
                  </p>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {(summary?.leadCount ?? 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Leads received
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(connector.route)}
                  >
                    {state === "NOT_CONFIGURED" ? "Configure" : "Manage"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs text-muted-foreground",
                    state === "ERROR" && "text-destructive",
                  )}
                >
                  {summary?.lastTestStatus
                    ? `Last test: ${summary.lastTestStatus}`
                    : `Last lead: ${formatDate(
                        summary?.lastLeadReceivedAt ?? null,
                      )}`}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
