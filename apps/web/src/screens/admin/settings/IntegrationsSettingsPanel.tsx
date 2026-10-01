import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Clock3,
  ExternalLink,
  KeyRound,
  Loader2,
  MapPinned,
  PlugZap,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDeleteDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
} from "ui";

import { api } from "../../../common/api";
import {
  googleMapsMetadataQueryKey,
  googleMapsRuntimeQueryKey,
  useGoogleMapsMetadata,
} from "../../../common/queries/useGoogleMapsIntegration";
import { currentOrganizationId } from "../../../common/tenantRequestScope";
import {
  CONNECTOR_STATE_LABEL,
  LEAD_SOURCE_CONNECTORS,
  LeadSourceConnectorMark,
  type ConnectorState,
} from "../leads/import/leadSourceRegistry";
import { useLeadImportStats } from "../leads/import/useLeadImportStats";

interface IntegrationsSettingsPanelProps {
  readonly subdomain: string;
  readonly customDomain: string;
  readonly customDomainVerified: boolean;
}

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

function apiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<{ message?: string }>(error)) return fallback;
  return error.response?.data?.message || fallback;
}

export function IntegrationsSettingsPanel({
  subdomain,
  customDomain,
  customDomainVerified,
}: IntegrationsSettingsPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = currentOrganizationId() ?? "unscoped";
  const mapsQuery = useGoogleMapsMetadata();
  const leadStatsQuery = useLeadImportStats();
  const [configureOpen, setConfigureOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const invalidateMaps = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: googleMapsMetadataQueryKey(organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: googleMapsRuntimeQueryKey(organizationId),
      }),
    ]);
  };

  const saveMaps = useMutation({
    mutationFn: async (nextApiKey: string) =>
      (
        await api.put("/integrations/google-maps", {
          apiKey: nextApiKey,
        })
      ).data,
    onSuccess: async () => {
      await invalidateMaps();
      setApiKey("");
      setConfigureOpen(false);
      toast.success("Google Maps configuration saved");
    },
    onError: (error: unknown) =>
      toast.error(
        apiErrorMessage(error, "Could not save the Google Maps configuration"),
      ),
  });

  const removeMaps = useMutation({
    mutationFn: async () => (await api.delete("/integrations/google-maps")).data,
    onSuccess: async () => {
      await invalidateMaps();
      setRemoveOpen(false);
      toast.success("Google Maps configuration removed");
    },
    onError: (error: unknown) =>
      toast.error(
        apiErrorMessage(
          error,
          "Could not remove the Google Maps configuration",
        ),
      ),
  });

  const mapsConfigured = Boolean(mapsQuery.data?.configured);
  const connectorSummaries = new Map(
    (leadStatsQuery.data?.connectors ?? []).map((connector) => [
      connector.id,
      connector,
    ]),
  );
  const allowedOrigins = [
    subdomain ? `https://${subdomain}.yourcrm.com/*` : null,
    customDomain && customDomainVerified ? `https://${customDomain}/*` : null,
    "http://localhost:3000/*",
  ].filter((origin): origin is string => Boolean(origin));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/70 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <MapPinned className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Google Maps
                </h2>
                <Badge variant={mapsConfigured ? "success" : "neutral"}>
                  {mapsConfigured ? "Configured" : "Not configured"}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Power live tracking, route directions, place search, and project
                geofence selection with this workspace&apos;s Google browser key.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {mapsConfigured ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemoveOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => setConfigureOpen(true)}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {mapsConfigured ? "Replace key" : "Configure Maps"}
            </Button>
          </div>
        </div>

        {mapsQuery.isLoading ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-lg bg-muted/50" />
            <div className="h-20 animate-pulse rounded-lg bg-muted/50" />
          </div>
        ) : mapsQuery.isError ? (
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Google Maps configuration could not be loaded.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void mapsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground">
                Browser key
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {mapsQuery.data?.keyHint ?? "No tenant key saved"}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {mapsQuery.data?.updatedAt
                  ? `Updated ${formatDate(mapsQuery.data.updatedAt)}`
                  : "Configuration has not been saved yet"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Restrict this key in Google Cloud
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Enable Maps JavaScript API, Places API, and Directions API.
                    Add these HTTP referrers before using the key in production:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs font-semibold text-foreground">
                    {allowedOrigins.map((origin) => (
                      <li key={origin} className="break-all">
                        {origin}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

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

      <Dialog
        open={configureOpen}
        onOpenChange={(open) => {
          if (!saveMaps.isPending) setConfigureOpen(open);
          if (!open) setApiKey("");
        }}
      >
        <DialogContent className="max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle>
              {mapsConfigured ? "Replace Google Maps key" : "Configure Google Maps"}
            </DialogTitle>
            <DialogDescription>
              Save the HTTP-referrer-restricted browser key for this workspace.
              The key is encrypted at rest and never shared with another tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label
              htmlFor="google-maps-api-key"
              className="text-sm font-semibold text-foreground"
            >
              Google Maps browser key
            </label>
            <Input
              id="google-maps-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              placeholder="Paste the tenant browser key"
              onChange={(event) => setApiKey(event.target.value)}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Saving confirms that a key is present; Google authorization is
              checked when a map loads on an allowed domain.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigureOpen(false)}
              disabled={saveMaps.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveMaps.mutate(apiKey.trim())}
              disabled={apiKey.trim().length < 20 || saveMaps.isPending}
            >
              {saveMaps.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {saveMaps.isPending ? "Saving..." : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={removeOpen}
        title="Remove Google Maps configuration?"
        description="Live maps, directions, place search, and map-based geofence selection will be unavailable until this workspace adds another key. Manual coordinates will continue to work."
        confirmLabel="Remove key"
        cancelLabel="Keep key"
        isLoading={removeMaps.isPending}
        onConfirm={() => removeMaps.mutate()}
        onCancel={() => setRemoveOpen(false)}
        onClose={() => setRemoveOpen(false)}
      />
    </div>
  );
}
