import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Server,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";

import { api } from "../../../common/api";

type WhatsAppProviderMode = "PLATFORM" | "CUSTOM_PINBOT";
type WhatsAppDispatchStatus =
  | "QUEUED"
  | "PROCESSING"
  | "RETRYING"
  | "ACCEPTED"
  | "FAILED"
  | "SKIPPED";

interface WhatsAppConfigResponse {
  organizationId: string;
  providerMode: WhatsAppProviderMode;
  ready: boolean;
  readinessMessage: string;
  customApiUrl: string;
  customSenderNumber: string;
  customTemplateLanguage: string;
  hasCustomApiKey: boolean;
  canManage: boolean;
  updatedAt: string | null;
}

interface WhatsAppDeliveryItem {
  id: string;
  eventKey: string;
  templateName: string;
  recipientMasked: string;
  status: WhatsAppDispatchStatus;
  attemptCount: number;
  lastError: string | null;
  acceptedAt: string | null;
  failedAt: string | null;
  skippedAt: string | null;
  createdAt: string;
}

interface WhatsAppDeliveriesResponse {
  data: WhatsAppDeliveryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

interface WhatsAppSettingsPanelProps {
  organizationId: string;
  onReadinessChange: (ready: boolean) => void;
}

const DELIVERY_STATUSES: WhatsAppDispatchStatus[] = [
  "QUEUED",
  "PROCESSING",
  "RETRYING",
  "ACCEPTED",
  "FAILED",
  "SKIPPED",
];

function errorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const response = "response" in error ? error.response : undefined;
  if (!response || typeof response !== "object" || !("data" in response)) {
    return fallback;
  }
  const data = response.data;
  if (!data || typeof data !== "object" || !("message" in data))
    return fallback;
  return typeof data.message === "string" ? data.message : fallback;
}

function statusClasses(status: WhatsAppDispatchStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";
    case "SKIPPED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "RETRYING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "PROCESSING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "QUEUED":
      return "border-violet-200 bg-violet-50 text-violet-700";
  }
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WhatsAppSettingsPanel({
  organizationId,
  onReadinessChange,
}: WhatsAppSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [providerMode, setProviderMode] =
    useState<WhatsAppProviderMode>("PLATFORM");
  const [customApiUrl, setCustomApiUrl] = useState("");
  const [customSenderNumber, setCustomSenderNumber] = useState("");
  const [customTemplateLanguage, setCustomTemplateLanguage] = useState("en");
  const [customApiKey, setCustomApiKey] = useState("");
  const [removeCustomApiKey, setRemoveCustomApiKey] = useState(false);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const configKey = ["notification-whatsapp-config", organizationId] as const;
  const configQuery = useQuery<WhatsAppConfigResponse>({
    queryKey: configKey,
    queryFn: async () => {
      const response = await api.get("/notifications/whatsapp-config");
      return response.data;
    },
  });

  useEffect(() => {
    if (!configQuery.data) return;
    setProviderMode(configQuery.data.providerMode);
    setCustomApiUrl(configQuery.data.customApiUrl);
    setCustomSenderNumber(configQuery.data.customSenderNumber);
    setCustomTemplateLanguage(configQuery.data.customTemplateLanguage || "en");
    setCustomApiKey("");
    setRemoveCustomApiKey(false);
  }, [configQuery.data]);

  useEffect(() => {
    onReadinessChange(configQuery.data?.ready === true);
  }, [configQuery.data?.ready, onReadinessChange]);

  const configDirty = useMemo(() => {
    const current = configQuery.data;
    if (!current) return false;
    return (
      providerMode !== current.providerMode ||
      customApiUrl !== current.customApiUrl ||
      customSenderNumber !== current.customSenderNumber ||
      customTemplateLanguage !== current.customTemplateLanguage ||
      customApiKey.trim().length > 0 ||
      removeCustomApiKey
    );
  }, [
    configQuery.data,
    customApiKey,
    customApiUrl,
    customSenderNumber,
    customTemplateLanguage,
    providerMode,
    removeCustomApiKey,
  ]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload: {
        providerMode: WhatsAppProviderMode;
        customApiUrl?: string;
        customSenderNumber?: string;
        customTemplateLanguage?: string;
        customApiKey?: string;
        removeCustomApiKey?: boolean;
      } = { providerMode };
      if (providerMode === "CUSTOM_PINBOT") {
        payload.customApiUrl = customApiUrl.trim();
        payload.customSenderNumber = customSenderNumber.trim();
        payload.customTemplateLanguage = customTemplateLanguage.trim();
        if (customApiKey.trim()) payload.customApiKey = customApiKey.trim();
        if (removeCustomApiKey) payload.removeCustomApiKey = true;
      }
      const response = await api.patch(
        "/notifications/whatsapp-config",
        payload,
      );
      return response.data as WhatsAppConfigResponse;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(configKey, updated);
      toast.success("WhatsApp provider settings saved");
    },
    onError: (error: unknown) => {
      toast.error(
        errorMessage(error, "Failed to save WhatsApp provider settings"),
      );
    },
  });

  const deliveriesQuery = useQuery<WhatsAppDeliveriesResponse>({
    queryKey: [
      "notification-whatsapp-deliveries",
      organizationId,
      deliveryPage,
      statusFilter,
    ],
    queryFn: async () => {
      const response = await api.get("/notifications/whatsapp-deliveries", {
        params: {
          page: deliveryPage,
          limit: 10,
          ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
        },
      });
      return response.data;
    },
  });

  const canManage = configQuery.data?.canManage === true;
  const totalPages = Math.max(
    1,
    Math.ceil((deliveriesQuery.data?.meta.total ?? 0) / 10),
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary shadow-2xs">
              <Server className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                WhatsApp provider
              </h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                Choose the platform sender or connect this workspace to its own
                Pinbot account.
              </p>
            </div>
          </div>
          {configQuery.data && (
            <Badge
              className={cn(
                "w-fit border text-xs font-bold",
                configQuery.data.ready
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              {configQuery.data.ready ? "Ready" : "Needs configuration"}
            </Badge>
          )}
        </div>

        <div className="space-y-5 p-5">
          {configQuery.isLoading ? (
            <div
              className="space-y-3 animate-pulse"
              aria-label="Loading provider settings"
            >
              <div className="h-10 rounded-lg bg-slate-100" />
              <div className="h-24 rounded-lg bg-slate-100" />
            </div>
          ) : configQuery.isError ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span className="flex items-center gap-2">
                <AlertCircle className="size-4" />
                Provider settings could not be loaded.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => configQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              {!canManage && (
                <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                  <p>
                    You are viewing this workspace as a platform administrator.
                    Provider credentials are masked and tenant settings are
                    read-only.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Provider mode
                  <Select
                    value={providerMode}
                    onValueChange={(value) =>
                      setProviderMode(value as WhatsAppProviderMode)
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger
                      aria-label="Provider mode"
                      className="h-10 rounded-xl"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLATFORM">Platform sender</SelectItem>
                      <SelectItem value="CUSTOM_PINBOT">
                        Custom Pinbot
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-secondary">
                    {configQuery.data?.ready ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="size-4 text-amber-600" />
                    )}
                    Connection readiness
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {configQuery.data?.readinessMessage}
                  </p>
                </div>
              </div>

              {providerMode === "CUSTOM_PINBOT" && (
                <div className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-secondary md:col-span-2">
                    HTTPS API endpoint
                    <Input
                      aria-label="HTTPS API endpoint"
                      value={customApiUrl}
                      onChange={(event) => setCustomApiUrl(event.target.value)}
                      placeholder="https://partnersv1.pinbot.ai/v3/..."
                      disabled={!canManage}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-secondary">
                    Sender number
                    <Input
                      aria-label="Sender number"
                      inputMode="numeric"
                      value={customSenderNumber}
                      onChange={(event) =>
                        setCustomSenderNumber(
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                      placeholder="919876543210"
                      disabled={!canManage}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-secondary">
                    Template language
                    <Input
                      aria-label="Template language"
                      value={customTemplateLanguage}
                      onChange={(event) =>
                        setCustomTemplateLanguage(event.target.value)
                      }
                      placeholder="en"
                      disabled={!canManage}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-secondary md:col-span-2">
                    API token
                    <Input
                      aria-label="API token"
                      type="password"
                      autoComplete="new-password"
                      value={customApiKey}
                      onChange={(event) => {
                        setCustomApiKey(event.target.value);
                        if (event.target.value) setRemoveCustomApiKey(false);
                      }}
                      placeholder={
                        configQuery.data?.hasCustomApiKey
                          ? "Saved securely — enter only to replace"
                          : "Enter the Pinbot API token"
                      }
                      disabled={!canManage}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyRound className="size-3.5" />
                      Tokens are encrypted at rest and are never returned to the
                      browser.
                    </p>
                    {configQuery.data?.hasCustomApiKey && canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRemoveCustomApiKey((current) => !current);
                          setCustomApiKey("");
                        }}
                        className={cn(
                          "text-xs",
                          removeCustomApiKey &&
                            "border-red-200 bg-red-50 text-red-700",
                        )}
                      >
                        {removeCustomApiKey
                          ? "Keep saved token"
                          : "Remove saved token"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {canManage && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => saveConfig.mutate()}
                    disabled={!configDirty || saveConfig.isPending}
                  >
                    {saveConfig.isPending
                      ? "Saving provider..."
                      : "Save provider settings"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary shadow-2xs">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                WhatsApp delivery activity
              </h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                Provider acceptance and failure history for this workspace only.
              </p>
            </div>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setDeliveryPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Filter delivery status"
              className="h-9 w-48 rounded-xl bg-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {DELIVERY_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {humanize(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {deliveriesQuery.isLoading ? (
          <div
            className="space-y-3 p-5 animate-pulse"
            aria-label="Loading delivery activity"
          >
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
          </div>
        ) : deliveriesQuery.isError ? (
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto size-7 text-red-500" />
            <p className="mt-2 text-sm font-semibold text-secondary">
              Delivery activity could not be loaded.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => deliveriesQuery.refetch()}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : deliveriesQuery.data?.data.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveriesQuery.data.data.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-semibold text-secondary">
                      {delivery.recipientMasked}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-secondary">
                        {humanize(delivery.eventKey)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.templateName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border text-xs",
                          statusClasses(delivery.status),
                        )}
                      >
                        {humanize(delivery.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{delivery.attemptCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatTimestamp(delivery.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      <span
                        className="line-clamp-2"
                        title={delivery.lastError ?? undefined}
                      >
                        {delivery.lastError || "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Page {deliveryPage} of {totalPages} ·{" "}
                {deliveriesQuery.data.meta.total} deliveries
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Previous delivery page"
                  disabled={deliveryPage <= 1}
                  onClick={() =>
                    setDeliveryPage((page) => Math.max(1, page - 1))
                  }
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Next delivery page"
                  disabled={deliveryPage >= totalPages}
                  onClick={() => setDeliveryPage((page) => page + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <MessageSquare className="mx-auto size-8 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-secondary">
              No WhatsApp deliveries yet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Accepted, retried, failed, and skipped dispatches will appear
              here.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
