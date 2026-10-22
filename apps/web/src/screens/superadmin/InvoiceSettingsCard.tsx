import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Input, Textarea } from "ui";
import { FileText } from "lucide-react";
import { api } from "../../common/api";
import { getApiErrorMessage } from "../../common/apiError";
import { displayText } from "../../common/displayReference";
import { downloadBillingPdf } from "../billing/invoiceDownload";
import type {
  BackfillPreview,
  BackfillProgress,
  InvoiceSettings,
} from "../billing/invoice.types";
import { dateLabel, humanLabel } from "../billing/WorkspaceControls";

const settingsPath = "/billing/platform/invoices/settings";
const backfillsPath = "/billing/platform/invoices/backfills";
const queryKey = ["platform-invoice-settings"];

export function InvoiceSettingsCard() {
  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get<InvoiceSettings>(settingsPath)).data,
    retry: false,
  });
  return (
    <Card className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Invoice settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your business details appear on tenant invoices. Preview before
              enabling issuance.
            </p>
          </div>
        </div>
        <Badge variant={query.data?.enabledAt ? "success" : "neutral"}>
          {query.data?.enabledAt ? "Issuance enabled" : "Issuance disabled"}
        </Badge>
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading invoice settings...
        </p>
      ) : query.isError || !query.data ? (
        <div role="alert" className="space-y-3">
          <p>
            {getApiErrorMessage(
              query.error,
              "Could not load invoice settings.",
            )}
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <InvoiceSettingsForm
          key={JSON.stringify([
            query.data.businessName,
            query.data.address,
            query.data.email,
            query.data.phone,
            query.data.enabledAt,
            query.data.previewedAt,
          ])}
          settings={query.data}
        />
      )}
    </Card>
  );
}

function InvoiceSettingsForm({ settings }: { settings: InvoiceSettings }) {
  const client = useQueryClient();
  const [form, setForm] = useState({
    businessName: settings.businessName,
    address: settings.address,
    email: settings.email,
    phone: settings.phone,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<BackfillPreview | null>(null);
  const [runCode, setRunCode] = useState(
    () => sessionStorage.getItem("gromoze-invoice-backfill") ?? "",
  );
  const progress = useQuery({
    queryKey: ["invoice-backfill-progress", runCode],
    queryFn: async () =>
      (
        await api.get<BackfillProgress>(
          `${backfillsPath}/${encodeURIComponent(runCode)}`,
        )
      ).data,
    enabled: Boolean(runCode),
    retry: false,
    refetchInterval: (query) =>
      ["COMPLETED", "STOPPED"].includes(query.state.data?.status ?? "")
        ? false
        : 3000,
  });
  const progressData: BackfillProgress | undefined = progress.data;
  const dirty = Object.entries(form).some(
    ([name, value]) => value !== settings[name as keyof typeof form],
  );
  async function action(task: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(message);
      await client.invalidateQueries({ queryKey });
    } catch (failure: unknown) {
      setError(
        getApiErrorMessage(
          failure,
          "Could not complete the invoice action. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void action(
      () => api.patch(settingsPath, form),
      "Invoice identity saved. Download a preview before enabling issuance.",
    );
  }
  async function startBackfill() {
    if (!preview || !preview.candidates) return;
    await action(async () => {
      const { data } = await api.post<BackfillProgress>(backfillsPath, {
        previewToken: preview.previewToken,
      });
      sessionStorage.setItem("gromoze-invoice-backfill", data.code);
      setRunCode(data.code);
      setPreview(null);
    }, "Historical backfill queued. No historical emails will be sent.");
  }
  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="invoice-business-name"
              className="text-sm font-medium"
            >
              Business name
            </label>
            <Input
              id="invoice-business-name"
              required
              minLength={2}
              maxLength={160}
              value={form.businessName}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  businessName: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invoice-email" className="text-sm font-medium">
              Billing contact email
            </label>
            <Input
              id="invoice-email"
              type="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="invoice-address" className="text-sm font-medium">
              Business billing address
            </label>
            <Textarea
              id="invoice-address"
              required
              minLength={5}
              maxLength={1000}
              rows={3}
              value={form.address}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  address: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invoice-phone" className="text-sm font-medium">
              Contact phone (optional)
            </label>
            <Input
              id="invoice-phone"
              maxLength={40}
              value={form.phone}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  phone: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Changing these details disables future issuance until the saved
          identity is previewed and enabled again. Existing issued invoices keep
          their original details.
        </p>
        <Button type="submit" disabled={busy || !dirty}>
          Save invoice details
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button
          variant="outline"
          disabled={busy || dirty || !settings.businessName}
          onClick={() =>
            void action(
              () =>
                downloadBillingPdf(
                  `${settingsPath}/preview`,
                  "gromoze-invoice-preview",
                  true,
                ),
              "Preview generated. Review the PDF before enabling invoicing.",
            )
          }
        >
          Download preview
        </Button>
        <Button
          disabled={busy || dirty || !settings.previewedAt}
          onClick={() =>
            void action(
              () =>
                api.post(`${settingsPath}/enable`, {
                  enabled: !settings.enabledAt,
                }),
              settings.enabledAt
                ? "Future invoice issuance disabled."
                : "Future invoice issuance enabled.",
            )
          }
        >
          {settings.enabledAt ? "Disable issuance" : "Enable invoicing"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {settings.previewedAt
            ? `Last preview: ${dateLabel(settings.previewedAt)}`
            : "Preview required"}
        </span>
      </div>
      {settings.deliveryIssues || settings.reconciliationCount ? (
        <div
          role="status"
          className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm"
        >
          {settings.deliveryIssues ?? 0} invoice deliveries need attention;{" "}
          {settings.reconciliationCount ?? 0} invoices need payment
          reconciliation. Check platform email and application logs before
          resending or asking a tenant to pay again.
        </div>
      ) : null}
      <div className="space-y-4 border-t border-border pt-5">
        <div>
          <h3 className="font-semibold">Historical invoices</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview earlier captured payments, then explicitly confirm backfill.
            Historical invoices use the current issue date and do not send
            emails.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy || dirty || !settings.enabledAt}
          onClick={() =>
            void action(async () => {
              setPreview(
                (await api.post<BackfillPreview>(`${backfillsPath}/preview`))
                  .data,
              );
            }, "Backfill preview ready.")
          }
        >
          Preview historical backfill
        </Button>
        {preview && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="font-medium">
              {preview.candidates} candidate payments -{" "}
              {preview.mode === "TEST" ? "Test mode" : "Live mode"}
            </p>
            <p className="text-sm text-muted-foreground">{preview.message}</p>
            <Button
              disabled={busy || !preview.candidates}
              onClick={() => void startBackfill()}
            >
              Confirm historical backfill
            </Button>
          </div>
        )}
        {runCode && (
          <div
            className="space-y-2 rounded-lg border border-border p-4"
            role="status"
          >
            <p className="font-medium">Backfill {runCode}</p>
            {progressData ? (
              <>
                <p className="text-sm">
                  {humanLabel(progressData.status)} - {progressData.created}{" "}
                  invoices created, {progressData.skipped} skipped,{" "}
                  {progressData.processed} processed.
                </p>
                {progressData.errors.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      View skipped payment details
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {progressData.errors.map((item, index) => (
                        <li key={index}>{displayText(item.reason)}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : progress.isError ? (
              <>
                <p className="text-sm text-destructive">
                  Could not check backfill progress.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void progress.refetch()}
                >
                  Check progress
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Checking progress...
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
    </div>
  );
}
