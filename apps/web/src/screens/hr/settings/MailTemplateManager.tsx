import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../common/api";
import { RichEmailEditor } from "./RichEmailEditor";
import {
  Badge,
  Button,
  Card,
  Input,
} from "ui";
import {
  CheckCircle2,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";

type MailTemplateDefinition = {
  key: string;
  label: string;
  description: string;
  subject: string;
  fromName: string;
  htmlBody: string;
  enabled: boolean;
  variables: Array<{ token: string; sample: string }>;
};

const STORAGE_KEY = "truroot_hr_mail_templates_v1";

const defaultTemplates: MailTemplateDefinition[] = [
  {
    key: "employee-welcome",
    label: "Employee Welcome",
    description: "Used when a new employee account is created.",
    subject: "Welcome to TrueRoot Realty, {{fullName}}",
    fromName: "TrueRoot HR",
    enabled: true,
    htmlBody:
      "<p>Hello {{fullName}},</p><p>Your employee account has been created successfully. You can now log in using your registered email or mobile number and temporary password.</p><p>Regards,<br/>TrueRoot HR Team</p>",
    variables: [
      { token: "fullName", sample: "Khushvinder Kaur" },
      { token: "employeeCode", sample: "EMP-8833975F" },
      { token: "role", sample: "Sales Executive" },
    ],
  },
  {
    key: "password-reset",
    label: "Password Reset",
    description: "Sent when an employee password is changed or reset.",
    subject: "Your TrueRoot account password has been updated",
    fromName: "TrueRoot Security",
    enabled: true,
    htmlBody:
      "<p>Hello {{fullName}},</p><p>This is a confirmation that your account password was updated successfully.</p><p>If you did not request this change, please contact the administrator immediately.</p>",
    variables: [
      { token: "fullName", sample: "Rahul Mehta" },
      { token: "employeeCode", sample: "EMP-00A1132C" },
    ],
  },
  {
    key: "payslip-issued",
    label: "Payslip Issued",
    description: "Sent when a finalized payslip is generated and shared.",
    subject: "Payslip for {{month}} {{year}} is ready",
    fromName: "TrueRoot Payroll",
    enabled: true,
    htmlBody:
      "<p>Hello {{fullName}},</p><p>Your payslip for {{month}} {{year}} has been generated.</p><p>Net pay: {{netPay}}</p><p>Please review the attached document for full details.</p>",
    variables: [
      { token: "fullName", sample: "Siddharth Nair" },
      { token: "month", sample: "June" },
      { token: "year", sample: "2026" },
      { token: "netPay", sample: "INR 35,000" },
    ],
  },
];

function buildPreviewHtml({
  content,
  bannerColor,
  logoUrl,
}: {
  content: string;
  bannerColor: string;
  logoUrl: string;
}) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Email Preview</title>
    </head>
    <body style="margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto;">
        <tr>
          <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;">
            <div style="height:132px;border-radius:14px;background:${bannerColor};display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Brand logo" style="max-width:220px;max-height:56px;object-fit:contain;" />`
                  : `<div style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:0.04em;">TRUEROOT</div>`
              }
            </div>
            <div style="font-size:15px;line-height:1.7;color:#334155;">
              ${content}
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function dataURLtoFile(dataUrl: string, fileName: string) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

export function MailTemplateManager() {
  const [templates, setTemplates] = useState<MailTemplateDefinition[]>(
    defaultTemplates,
  );
  const [selectedKey, setSelectedKey] = useState(defaultTemplates[0].key);
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [bannerColor, setBannerColor] = useState("#1d4ed8");
  const [logoUrl, setLogoUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        templates?: MailTemplateDefinition[];
        bannerColor?: string;
        logoUrl?: string;
      };
      if (parsed.templates?.length) {
        setTemplates(parsed.templates);
        setSelectedKey(parsed.templates[0].key);
      }
      if (parsed.bannerColor) setBannerColor(parsed.bannerColor);
      if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === selectedKey) ?? null,
    [selectedKey, templates],
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    setSubject(selectedTemplate.subject);
    setFromName(selectedTemplate.fromName);
    setHtmlBody(selectedTemplate.htmlBody);
    setEnabled(selectedTemplate.enabled);
  }, [selectedTemplate]);

  const hasChanges =
    !!selectedTemplate &&
    (subject !== selectedTemplate.subject ||
      fromName !== selectedTemplate.fromName ||
      htmlBody !== selectedTemplate.htmlBody ||
      enabled !== selectedTemplate.enabled);

  const previewHtml = useMemo(
    () =>
      buildPreviewHtml({
        content: htmlBody,
        bannerColor,
        logoUrl,
      }),
    [bannerColor, htmlBody, logoUrl],
  );

  const persistTemplates = (
    nextTemplates: MailTemplateDefinition[],
    nextBannerColor = bannerColor,
    nextLogoUrl = logoUrl,
  ) => {
    setTemplates(nextTemplates);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        templates: nextTemplates,
        bannerColor: nextBannerColor,
        logoUrl: nextLogoUrl,
      }),
    );
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    const nextTemplates = templates.map((template) =>
      template.key === selectedTemplate.key
        ? {
            ...template,
            subject,
            fromName,
            htmlBody,
            enabled,
          }
        : template,
    );
    persistTemplates(nextTemplates);
    toast.success("Email template saved.");
  };

  const handleReset = () => {
    if (!selectedTemplate) return;
    const baseTemplate = defaultTemplates.find(
      (template) => template.key === selectedTemplate.key,
    );
    if (!baseTemplate) return;
    const nextTemplates = templates.map((template) =>
      template.key === baseTemplate.key ? baseTemplate : template,
    );
    persistTemplates(nextTemplates);
    setSubject(baseTemplate.subject);
    setFromName(baseTemplate.fromName);
    setHtmlBody(baseTemplate.htmlBody);
    setEnabled(baseTemplate.enabled);
    toast.success("Template reset to default.");
  };

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await api.post<{ url: string }>(
        "/uploads/images",
        uploadForm,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const nextLogoUrl = uploadRes.data.url;
      setLogoUrl(nextLogoUrl);
      persistTemplates(templates, bannerColor, nextLogoUrl);
      toast.success("Brand logo updated.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "Unable to upload logo.",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter an email address for the test send.");
      return;
    }

    setIsSendingTest(true);
    try {
      let resolvedLogoUrl = logoUrl;
      if (logoUrl.startsWith("data:")) {
        const uploadForm = new FormData();
        uploadForm.append(
          "file",
          dataURLtoFile(logoUrl, "mail-template-logo.png"),
        );
        const uploadRes = await api.post<{ url: string }>(
          "/uploads/images",
          uploadForm,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        resolvedLogoUrl = uploadRes.data.url;
        setLogoUrl(resolvedLogoUrl);
        persistTemplates(templates, bannerColor, resolvedLogoUrl);
      }

      const lightweightPreviewHtml = buildPreviewHtml({
        content: htmlBody,
        bannerColor,
        logoUrl: resolvedLogoUrl,
      });

      await api.post("/mail/test-send", {
        toEmail: testEmail.trim(),
        subject,
        fromName,
        htmlBody: lightweightPreviewHtml,
      });
      toast.success(`Test email sent to ${testEmail.trim()}.`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "Unable to send test email.",
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)_minmax(28rem,34rem)]">
      <aside className="space-y-4">
        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-sm font-semibold text-slate-500">
            Templates
          </p>
          <div className="mt-4 space-y-2">
            {templates.map((template) => {
              const active = template.key === selectedKey;
              return (
                <button
                  key={template.key}
                  type="button"
                  className={`w-full rounded-md border px-3 py-3 text-left transition ${
                    active
                      ? "border-primary/30 bg-orange-50"
                      : "border-slate-200 bg-white hover:border-primary/20 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedKey(template.key)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-secondary">
                      {template.label}
                    </p>
                    {template.enabled ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <ShieldAlert className="size-4 text-amber-600" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-sm font-semibold text-slate-500">
            Shared branding
          </p>
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-secondary">Header Banner</p>
              <div
                className="mt-3 h-16 rounded-md border border-slate-200"
                style={{ backgroundColor: bannerColor }}
              />
            </div>
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Banner Color
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bannerColor}
                  onChange={(event) => {
                    const nextColor = event.target.value;
                    setBannerColor(nextColor);
                    persistTemplates(templates, nextColor, logoUrl);
                  }}
                  className="h-10 w-14 rounded-md border border-slate-200 bg-white p-1"
                />
                <Input
                  value={bannerColor}
                  onChange={(event) => {
                    const nextColor = event.target.value;
                    setBannerColor(nextColor);
                    persistTemplates(templates, nextColor, logoUrl);
                  }}
                  className="h-10 text-sm font-bold shadow-none"
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Brand Logo
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md text-xs shadow-none"
                  onClick={() =>
                    document.getElementById("hr-mail-logo-upload")?.click()
                  }
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}{" "}
                  {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 rounded-md text-xs shadow-none"
                    disabled={isUploadingLogo}
                    onClick={() => {
                      setLogoUrl("");
                      persistTemplates(templates, bannerColor, "");
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <input
                id="hr-mail-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  handleLogoUpload(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </Card>
      </aside>

      <section className="space-y-4">
        <Card className="rounded-md border border-slate-200 bg-white p-0 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Template manager
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-secondary">
                {selectedTemplate?.label}
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {selectedTemplate?.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`border-0 ${
                  hasChanges
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-success"
                }`}
              >
                {hasChanges ? "Unsaved Changes" : "Saved"}
              </Badge>
              <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-secondary">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                Enabled
              </label>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                From Name
              </span>
              <Input
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
                className="h-11 rounded-md text-sm font-bold shadow-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Subject
              </span>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-11 rounded-md text-sm font-bold shadow-none"
              />
            </label>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-0 shadow-card">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-500">
              Variables
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTemplate?.variables.map((item) => (
                <Badge
                  key={item.token}
                  className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-secondary"
                >
                  {`${`{{${item.token}}}`} -> ${item.sample}`}
                </Badge>
              ))}
            </div>
          </div>
          <div className="px-5 py-4">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Email content
              </span>
              <RichEmailEditor
                value={htmlBody}
                onChange={setHtmlBody}
                variableTokens={
                  selectedTemplate?.variables.map((item) => item.token) ?? []
                }
              />
            </label>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="space-y-2 lg:max-w-sm lg:flex-1">
              <span className="text-xs font-extrabold text-secondary">
                Send Test Email
              </span>
              <Input
                type="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="name@company.com"
                className="h-11 rounded-md text-sm font-bold shadow-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-4 shadow-none"
                onClick={handleReset}
              >
                <RotateCcw className="size-4" /> Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-4 shadow-none"
                disabled={!testEmail.trim() || isSendingTest || isUploadingLogo}
                onClick={handleSendTest}
              >
                <Send className="size-4" />{" "}
                {isSendingTest ? "Sending..." : "Send Test"}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-md px-5"
                disabled={!hasChanges}
                onClick={handleSave}
              >
                <Save className="size-4" /> Save Template
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <aside className="space-y-4 xl:col-span-2 2xl:col-span-1">
        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Live preview
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Mail className="size-4" /> Auto-updated
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="h-[760px] w-full bg-white"
            />
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-sm font-extrabold text-secondary">
            Operational Notes
          </p>
          <div className="mt-3 space-y-3 text-xs font-semibold leading-5 text-muted-foreground">
            <p>
              Shared branding applies to every template in this manager, so HR
              communication stays visually consistent.
            </p>
            <p>
              Variable chips show the supported placeholders for the selected
              template.
            </p>
            <p>
              Test send is simulated here for admin review until the central mail
              API is wired in this workspace.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
