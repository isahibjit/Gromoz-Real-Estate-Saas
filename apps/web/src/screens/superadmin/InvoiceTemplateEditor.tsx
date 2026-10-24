import { useState, type ChangeEvent } from "react";
import { Button, Input, Textarea, cn } from "ui";
import { WorkspaceSelect } from "../billing/WorkspaceControls";
import {
  DEFAULT_INVOICE_TEMPLATE,
  type InvoiceTemplate,
} from "../billing/invoice.types";
import solverixLogo from "../../assets/solverix-invoice-logo.png";

export function InvoiceTemplateEditor({
  value,
  businessName,
  disabled,
  onChange,
  onProcessingChange,
}: {
  value: InvoiceTemplate;
  businessName: string;
  disabled: boolean;
  onChange: (template: InvoiceTemplate) => void;
  onProcessingChange: (processing: boolean) => void;
}) {
  const [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  const locked = disabled || reading;
  function update(change: Partial<InvoiceTemplate>) {
    onChange({ ...value, ...change });
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 256 * 1024
    ) {
      setError("Choose a PNG or JPEG logo up to 256 KB.");
      return;
    }
    setReading(true);
    onProcessingChange(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Could not read the logo."));
        reader.onerror = () =>
          reject(new Error("Could not read the logo. Try selecting it again."));
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () =>
          image.naturalWidth > 2048 || image.naturalHeight > 2048
            ? reject(new Error("Use a logo up to 2048 × 2048 pixels."))
            : resolve();
        image.onerror = () =>
          reject(
            new Error(
              "This image could not be opened. Choose a valid PNG or JPEG.",
            ),
          );
        image.src = data;
      });
      update({ logoMode: "CUSTOM", logoDataUrl: data });
    } catch (failure: unknown) {
      setError(
        failure instanceof Error ? failure.message : "Could not read the logo.",
      );
    } finally {
      setReading(false);
      onProcessingChange(false);
    }
  }
  return (
    <section
      className="space-y-4 border-t border-border pt-6"
      aria-labelledby="invoice-template-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="invoice-template-title" className="font-semibold">
            Invoice template
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Brand future invoices with your logo, layout, and additional
            information.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={locked}
          onClick={() => {
            setError("");
            onChange({ ...DEFAULT_INVOICE_TEMPLATE });
          }}
        >
          Reset template
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkspaceSelect
              label="Invoice layout"
              value={value.layout}
              disabled={locked}
              onChange={(layout) =>
                update({ layout: layout === "COMPACT" ? "COMPACT" : "CLASSIC" })
              }
              options={[
                { value: "CLASSIC", label: "Classic — spacious" },
                { value: "COMPACT", label: "Compact — condensed" },
              ]}
            />
            <WorkspaceSelect
              label="Invoice logo"
              value={value.logoMode}
              disabled={locked}
              onChange={(logoMode) =>
                update({
                  logoMode:
                    logoMode === "NONE"
                      ? "NONE"
                      : logoMode === "CUSTOM"
                      ? "CUSTOM"
                      : "DEFAULT",
                })
              }
              options={[
                { value: "DEFAULT", label: "Solverix logo" },
                { value: "CUSTOM", label: "Uploaded logo" },
                { value: "NONE", label: "No logo" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="invoice-logo-upload"
              className="text-sm font-medium"
            >
              Upload invoice logo
            </label>
            <Input
              id="invoice-logo-upload"
              type="file"
              accept="image/png,image/jpeg"
              disabled={locked}
              onChange={(event) => void upload(event)}
              aria-describedby="invoice-logo-help"
            />
            <p id="invoice-logo-help" className="text-xs text-muted-foreground">
              PNG or JPEG, up to 256 KB and 2048 × 2048 pixels. Transparent PNG
              works best.
            </p>
            {reading && (
              <p role="status" className="text-sm text-muted-foreground">
                Reading logo...
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          {value.logoMode === "CUSTOM" && !value.logoDataUrl && (
            <p className="text-sm text-muted-foreground">
              Upload a logo before saving, or select the Solverix logo.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invoice-heading" className="text-sm font-medium">
                Document heading
              </label>
              <Input
                id="invoice-heading"
                value={value.heading}
                maxLength={40}
                required
                disabled={locked}
                onChange={(event) => update({ heading: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invoice-accent" className="text-sm font-medium">
                Accent color
              </label>
              <Input
                id="invoice-accent"
                type="color"
                value={value.accentColor}
                disabled={locked}
                onChange={(event) =>
                  update({ accentColor: event.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Choose a dark color for readable text on white.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="invoice-payment-note"
              className="text-sm font-medium"
            >
              Additional payment information
            </label>
            <Textarea
              id="invoice-payment-note"
              rows={3}
              maxLength={600}
              value={value.paymentNote}
              disabled={locked}
              onChange={(event) => update({ paymentNote: event.target.value })}
              placeholder="Optional instructions or billing contact information"
            />
            <p className="text-xs text-muted-foreground">
              Appended to the standard payment terms. Does not change amounts or
              deadlines.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invoice-footer" className="text-sm font-medium">
              Footer message
            </label>
            <Textarea
              id="invoice-footer"
              rows={2}
              maxLength={240}
              value={value.footer}
              disabled={locked}
              onChange={(event) => update({ footer: event.target.value })}
              placeholder="For example, thank you for your business."
            />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Template preview</p>
          <div
            className={cn(
              "space-y-5 rounded-lg border border-border bg-white p-6 text-slate-800",
              value.layout === "COMPACT" && "space-y-3",
            )}
            aria-label="Invoice template preview"
          >
            <div className="flex flex-wrap items-center justify-between gap-5">
              {value.logoMode !== "NONE" &&
                (value.logoMode === "DEFAULT" || value.logoDataUrl) && (
                  <img
                    src={
                      value.logoMode === "CUSTOM"
                        ? value.logoDataUrl
                        : solverixLogo
                    }
                    alt="Invoice logo preview"
                    className="h-12 max-w-full object-contain object-left"
                  />
                )}
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold">
                  {value.heading || "Invoice"}
                </p>
                <p className="text-xs text-slate-500">Preview · not issued</p>
              </div>
            </div>
            <div
              className="border-t border-slate-200 pt-4"
              style={
                value.layout === "COMPACT"
                  ? { borderTopColor: value.accentColor }
                  : undefined
              }
            >
              <p className="break-words font-semibold">
                {businessName || "Your business name"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Seller and customer billing details
              </p>
            </div>
            <div className="flex justify-between gap-4 border-y border-slate-200 py-3 text-sm">
              <span>Subscription charges</span>
              <span>Saved pricing</span>
            </div>
            <p
              className="text-right text-sm font-semibold"
              style={{ color: value.accentColor }}
            >
              Balance due
            </p>
            {value.paymentNote && (
              <p className="whitespace-pre-wrap break-words text-xs leading-5">
                {value.paymentNote}
              </p>
            )}
            {value.footer && (
              <p className="whitespace-pre-wrap break-words border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                {value.footer}
              </p>
            )}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Layout illustration only. Save your changes and download the PDF
            preview to check exact pagination and print appearance.
          </p>
        </div>
      </div>
    </section>
  );
}
