import React, { useState } from "react";
import {
  Eye,
  Headphones,
  Phone,
  RotateCcw,
  Save,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "ui";
import trurootLogo from "../../../assets/truroot-logo.png";
import onboardBuildings from "../../../assets/onboard-buildings.png";

export interface LoginPageCmsData {
  heroHeadlinePrefix: string;
  heroHeadlineHighlight: string;
  heroTagline: string;
  heroLogoUrl: string;
  heroBgImageUrl: string;
  features: Array<{ title: string }>;
  trustBadgeTitle: string;
  trustBadgeDescription: string;
  cardTitle: string;
  cardSubtitle: string;
  passwordHint: string;
  downloadAppLabel: string;
  downloadAppUrl: string;
  showDownloadApp: boolean;
  supportTitle: string;
  supportSubtitle: string;
  supportPhone: string;
  supportEmail: string;
  termsUrl: string;
  privacyUrl: string;
}

export const defaultLoginPageCms: LoginPageCmsData = {
  heroHeadlinePrefix: "Welcome to",
  heroHeadlineHighlight: "Trueroot Realty CRM",
  heroTagline: "Streamline your leads, follow-ups, site visits and sales - all in one place.",
  heroLogoUrl: "",
  heroBgImageUrl: "",
  features: [
    { title: "Manage Leads" },
    { title: "Track Activities" },
    { title: "Close More Deals" },
    { title: "Boost Productivity" },
  ],
  trustBadgeTitle: "Secure. Reliable. Always with You.",
  trustBadgeDescription: "Your data is protected with enterprise grade security.",
  cardTitle: "Login to Your Account",
  cardSubtitle: "Welcome back! Please login to continue.",
  passwordHint: "Enter your password first. If two-factor authentication is enabled for your role or employee profile, we will send an SMS OTP before signing you in.",
  downloadAppLabel: "Download Android app",
  downloadAppUrl: "/download-app",
  showDownloadApp: true,
  supportTitle: "Need help?",
  supportSubtitle: "Contact our support team",
  supportPhone: "+91 98765 43210",
  supportEmail: "support@truerootrealty.com",
  termsUrl: "/terms",
  privacyUrl: "/privacy-policy",
};

interface LoginPageCmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: LoginPageCmsData;
  onSave: (data: LoginPageCmsData) => Promise<void>;
  orgName?: string;
  orgLogo?: string;
  orgPhone?: string;
  orgEmail?: string;
}

export function LoginPageCmsModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  orgName = "Trueroot Realty CRM",
  orgLogo = "",
  orgPhone = "+91 98765 43210",
  orgEmail = "support@truerootrealty.com",
}: LoginPageCmsModalProps) {
  const [data, setData] = useState<LoginPageCmsData>(() => ({
    ...defaultLoginPageCms,
    heroHeadlineHighlight: orgName || defaultLoginPageCms.heroHeadlineHighlight,
    heroLogoUrl: orgLogo || defaultLoginPageCms.heroLogoUrl,
    supportPhone: orgPhone || defaultLoginPageCms.supportPhone,
    supportEmail: orgEmail || defaultLoginPageCms.supportEmail,
    ...(initialData || {}),
  }));

  const [activeTab, setActiveTab] = useState<"hero" | "features" | "support" | "card">("hero");
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field: keyof LoginPageCmsData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (index: number, title: string) => {
    setData((prev) => {
      const nextFeatures = [...prev.features];
      nextFeatures[index] = { title };
      return { ...prev, features: nextFeatures };
    });
  };

  const handleReset = () => {
    setData({
      ...defaultLoginPageCms,
      heroHeadlineHighlight: orgName || defaultLoginPageCms.heroHeadlineHighlight,
      heroLogoUrl: orgLogo || "",
      supportPhone: orgPhone || defaultLoginPageCms.supportPhone,
      supportEmail: orgEmail || defaultLoginPageCms.supportEmail,
    });
    toast.success("Reset to default login layout");
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(data);
      toast.success("Login page CMS customized and published!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save login page CMS");
    } finally {
      setIsSaving(false);
    }
  };

  const effectiveLogo = data.heroLogoUrl || orgLogo || trurootLogo;
  const effectiveBg = data.heroBgImageUrl || onboardBuildings;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-full h-[88vh] min-h-[620px] max-h-[820px] p-0 overflow-hidden flex flex-col bg-card border-border rounded-xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Login Page Visual CMS Customizer
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Customize your organization's login portal headlines, support contact details, feature highlights, and trust badges.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: Split Editor & Live Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* Left Panel: Form Controls */}
          <div className="lg:col-span-6 flex flex-col h-full border-r border-border overflow-y-auto p-5 space-y-4 bg-background">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("hero")}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                  activeTab === "hero"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hero & Branding
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                  activeTab === "features"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Feature Highlights
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("support")}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                  activeTab === "support"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Support Center
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                  activeTab === "card"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Form & App
              </button>
            </div>

            {/* Tab 1: Hero & Brand */}
            {activeTab === "hero" && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Headline Prefix</label>
                  <Input
                    value={data.heroHeadlinePrefix}
                    onChange={(e) => handleFieldChange("heroHeadlinePrefix", e.target.value)}
                    placeholder="e.g. Welcome to"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Company Name Highlight</label>
                  <Input
                    value={data.heroHeadlineHighlight}
                    onChange={(e) => handleFieldChange("heroHeadlineHighlight", e.target.value)}
                    placeholder="e.g. Skyline Realty Group"
                    className="text-xs font-semibold text-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Hero Subtitle & Tagline</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs focus:ring-1 focus:ring-primary focus:border-primary"
                    value={data.heroTagline}
                    onChange={(e) => handleFieldChange("heroTagline", e.target.value)}
                    placeholder="Describe your workspace value proposition..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Custom Login Logo URL</label>
                  <Input
                    value={data.heroLogoUrl}
                    onChange={(e) => handleFieldChange("heroLogoUrl", e.target.value)}
                    placeholder="https://yourdomain.com/logo.png (leave blank for workspace logo)"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Custom Hero Background Image URL</label>
                  <Input
                    value={data.heroBgImageUrl}
                    onChange={(e) => handleFieldChange("heroBgImageUrl", e.target.value)}
                    placeholder="https://images.unsplash.com/... (optional)"
                    className="text-xs"
                  />
                </div>

                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                  <span className="text-xs font-semibold text-foreground">Security Trust Badge</span>
                  <Input
                    value={data.trustBadgeTitle}
                    onChange={(e) => handleFieldChange("trustBadgeTitle", e.target.value)}
                    placeholder="Trust title"
                    className="text-xs"
                  />
                  <Input
                    value={data.trustBadgeDescription}
                    onChange={(e) => handleFieldChange("trustBadgeDescription", e.target.value)}
                    placeholder="Trust description"
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Feature Badges */}
            {activeTab === "features" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Configure the 4 key feature highlights displayed under your welcome banner.
                </p>
                {data.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs">
                      {idx + 1}
                    </span>
                    <Input
                      value={feat.title}
                      onChange={(e) => handleFeatureChange(idx, e.target.value)}
                      placeholder={`Feature ${idx + 1} title`}
                      className="text-xs font-semibold flex-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Support Team */}
            {activeTab === "support" && (
              <div className="space-y-3.5">
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <Headphones className="size-3.5" /> Support Center Customization
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    This contact box is shown directly below the login form so agents and employees can reach your IT support team easily.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Support Header Title</label>
                  <Input
                    value={data.supportTitle}
                    onChange={(e) => handleFieldChange("supportTitle", e.target.value)}
                    placeholder="e.g. Need help?"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Support Subtitle</label>
                  <Input
                    value={data.supportSubtitle}
                    onChange={(e) => handleFieldChange("supportSubtitle", e.target.value)}
                    placeholder="e.g. Contact our support team"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Support Phone Hotline</label>
                  <Input
                    value={data.supportPhone}
                    onChange={(e) => handleFieldChange("supportPhone", e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Support Email Address</label>
                  <Input
                    value={data.supportEmail}
                    onChange={(e) => handleFieldChange("supportEmail", e.target.value)}
                    placeholder="e.g. support@truerootrealty.com"
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Login Form & App */}
            {activeTab === "card" && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Form Header Title</label>
                  <Input
                    value={data.cardTitle}
                    onChange={(e) => handleFieldChange("cardTitle", e.target.value)}
                    placeholder="e.g. Login to Your Account"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Form Subtitle</label>
                  <Input
                    value={data.cardSubtitle}
                    onChange={(e) => handleFieldChange("cardSubtitle", e.target.value)}
                    placeholder="e.g. Welcome back! Please login to continue."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Password & 2FA Hint Notice</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs focus:ring-1 focus:ring-primary focus:border-primary"
                    value={data.passwordHint}
                    onChange={(e) => handleFieldChange("passwordHint", e.target.value)}
                  />
                </div>

                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Show Mobile App Download Button</label>
                    <Checkbox
                      checked={data.showDownloadApp}
                      onCheckedChange={(checked) => handleFieldChange("showDownloadApp", Boolean(checked))}
                    />
                  </div>
                  {data.showDownloadApp && (
                    <div className="space-y-2 pt-1">
                      <Input
                        value={data.downloadAppLabel}
                        onChange={(e) => handleFieldChange("downloadAppLabel", e.target.value)}
                        placeholder="Button label (e.g. Download Android app)"
                        className="text-xs"
                      />
                      <Input
                        value={data.downloadAppUrl}
                        onChange={(e) => handleFieldChange("downloadAppUrl", e.target.value)}
                        placeholder="App URL or Play Store link"
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Terms of Use URL</label>
                    <Input
                      value={data.termsUrl}
                      onChange={(e) => handleFieldChange("termsUrl", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Privacy Policy URL</label>
                    <Input
                      value={data.privacyUrl}
                      onChange={(e) => handleFieldChange("privacyUrl", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live Visual Mockup Preview */}
          <div className="lg:col-span-6 flex flex-col bg-slate-900 p-4 sm:p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-2.5 text-white">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary shrink-0" /> Live snapshot preview
              </span>
              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/40">
                Real-time updates
              </span>
            </div>

            {/* Scaled Mockup Frame */}
            <div className="relative flex-1 min-h-[420px] rounded-lg overflow-hidden border border-slate-700 shadow-xl bg-slate-950 text-slate-800">
              <img
                src={effectiveBg}
                alt="Background preview"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/95" />

              <div className="relative z-10 p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 h-full items-center">
                {/* Mockup Left Banner */}
                <div className="space-y-2.5">
                  <img
                    src={effectiveLogo}
                    alt="Logo"
                    className="h-7 max-w-[130px] object-contain"
                  />
                  <div>
                    <h3 className="text-xs font-bold leading-tight text-slate-900">
                      {data.heroHeadlinePrefix}{" "}
                      <span className="text-primary block">{data.heroHeadlineHighlight}</span>
                    </h3>
                    <p className="text-[10px] text-slate-600 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {data.heroTagline}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {data.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="bg-white/90 border border-slate-200 rounded px-1.5 py-0.5 text-[8.5px] font-semibold text-slate-800 text-center truncate shadow-2xs"
                      >
                        {feat.title}
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 text-white rounded p-2 text-[8.5px] space-y-0.5 shadow-xs">
                    <p className="font-bold text-amber-300">{data.trustBadgeTitle}</p>
                    <p className="text-slate-300 text-[8px] leading-tight line-clamp-2">
                      {data.trustBadgeDescription}
                    </p>
                  </div>
                </div>

                {/* Mockup Right Login Card */}
                <div className="bg-white rounded-lg p-3 shadow-lg border border-slate-200 space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{data.cardTitle}</h4>
                    <p className="text-[9px] text-slate-500 font-medium">{data.cardSubtitle}</p>
                  </div>

                  <div className="space-y-1.5 pointer-events-none opacity-85">
                    <div className="h-6 bg-slate-100 rounded border border-slate-200 px-2 flex items-center text-[9px] text-slate-400">
                      Enter email or mobile
                    </div>
                    <div className="h-6 bg-slate-100 rounded border border-slate-200 px-2 flex items-center text-[9px] text-slate-400">
                      ••••••••
                    </div>
                    <div className="h-6 bg-[#0D1F3D] text-white rounded font-semibold text-[9px] flex items-center justify-center">
                      Login
                    </div>
                  </div>

                  {data.showDownloadApp && (
                    <div className="h-5 border border-slate-200 rounded flex items-center justify-center text-[8.5px] font-medium text-slate-700 bg-slate-50">
                      <Smartphone className="h-2.5 w-2.5 mr-1 text-slate-500 shrink-0" />
                      {data.downloadAppLabel}
                    </div>
                  )}

                  {/* Mockup Support Box */}
                  <div className="rounded border border-slate-200 bg-slate-50 p-1.5 text-[8px] flex items-center justify-between gap-1">
                    <div>
                      <p className="font-bold text-slate-900">{data.supportTitle}</p>
                      <p className="text-[7.5px] text-slate-500">{data.supportSubtitle}</p>
                    </div>
                    <div className="text-right font-semibold text-slate-800 text-[7.5px]">
                      <p className="flex items-center justify-end gap-1 text-primary font-bold">
                        <Phone className="h-2.5 w-2.5 shrink-0" /> {data.supportPhone}
                      </p>
                      <p className="text-slate-500 truncate max-w-[90px]">{data.supportEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving}
              className="gap-1.5 font-bold text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save and publish"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
