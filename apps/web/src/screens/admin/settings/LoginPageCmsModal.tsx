import React, { useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  Globe,
  Headphones,
  Image as ImageIcon,
  Layers,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, Checkbox, Input } from "ui";
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

  if (!isOpen) return null;

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
      toast.success("Login Page CMS updated and published!");
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-modal-backdrop">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Login Page Visual CMS & Customizer
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Customize your workspace's branded login screen, headlines, support hotline, and trust badges.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body: Split Editor & Live Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* Left Panel: Form Controls */}
          <div className="lg:col-span-6 flex flex-col border-r border-slate-200 overflow-y-auto p-5 space-y-5 bg-white">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("hero")}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "hero"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Hero & Brand
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "features"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Feature Badges
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("support")}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "support"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Support Team
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "card"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Login Form & App
              </button>
            </div>

            {/* Tab 1: Hero & Brand */}
            {activeTab === "hero" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Headline Prefix</label>
                  <Input
                    className="mt-1"
                    value={data.heroHeadlinePrefix}
                    onChange={(e) => handleFieldChange("heroHeadlinePrefix", e.target.value)}
                    placeholder="e.g. Welcome to"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Headline Company Highlight</label>
                  <Input
                    className="mt-1 font-bold text-primary"
                    value={data.heroHeadlineHighlight}
                    onChange={(e) => handleFieldChange("heroHeadlineHighlight", e.target.value)}
                    placeholder="e.g. Skyline Realty CRM"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Hero Subtitle / Tagline</label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:ring-1 focus:ring-primary focus:border-primary"
                    value={data.heroTagline}
                    onChange={(e) => handleFieldChange("heroTagline", e.target.value)}
                    placeholder="Describe your workspace value proposition..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Custom Login Logo URL</label>
                  <Input
                    className="mt-1"
                    value={data.heroLogoUrl}
                    onChange={(e) => handleFieldChange("heroLogoUrl", e.target.value)}
                    placeholder="https://yourdomain.com/logo.png (leave blank for workspace logo)"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Custom Hero Background Image URL</label>
                  <Input
                    className="mt-1"
                    value={data.heroBgImageUrl}
                    onChange={(e) => handleFieldChange("heroBgImageUrl", e.target.value)}
                    placeholder="https://images.unsplash.com/... (optional)"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-slate-800">Security Trust Badge (Bottom Left)</p>
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
                <p className="text-xs text-slate-500 font-medium">
                  Configure the 4 key feature highlights displayed under your welcome banner.
                </p>
                {data.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs">
                      {idx + 1}
                    </span>
                    <Input
                      value={feat.title}
                      onChange={(e) => handleFeatureChange(idx, e.target.value)}
                      placeholder={`Feature ${idx + 1} title`}
                      className="text-xs font-semibold"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Support Team */}
            {activeTab === "support" && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Headphones className="size-4" /> Support Box Customization
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1">
                    This contact box is shown directly below the login form so agents and employees can reach your IT / support team easily.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Support Box Header Title</label>
                  <Input
                    className="mt-1"
                    value={data.supportTitle}
                    onChange={(e) => handleFieldChange("supportTitle", e.target.value)}
                    placeholder="e.g. Need help?"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Support Box Subtitle</label>
                  <Input
                    className="mt-1"
                    value={data.supportSubtitle}
                    onChange={(e) => handleFieldChange("supportSubtitle", e.target.value)}
                    placeholder="e.g. Contact our support team"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Support Phone Hotline</label>
                  <Input
                    className="mt-1"
                    value={data.supportPhone}
                    onChange={(e) => handleFieldChange("supportPhone", e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Support Email Address</label>
                  <Input
                    className="mt-1"
                    value={data.supportEmail}
                    onChange={(e) => handleFieldChange("supportEmail", e.target.value)}
                    placeholder="e.g. support@truerootrealty.com"
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Login Form & App */}
            {activeTab === "card" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Form Header Title</label>
                  <Input
                    className="mt-1"
                    value={data.cardTitle}
                    onChange={(e) => handleFieldChange("cardTitle", e.target.value)}
                    placeholder="e.g. Login to Your Account"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Form Subtitle</label>
                  <Input
                    className="mt-1"
                    value={data.cardSubtitle}
                    onChange={(e) => handleFieldChange("cardSubtitle", e.target.value)}
                    placeholder="e.g. Welcome back! Please login to continue."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Password / 2FA Hint Notice</label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:ring-1 focus:ring-primary focus:border-primary"
                    value={data.passwordHint}
                    onChange={(e) => handleFieldChange("passwordHint", e.target.value)}
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Show Mobile App Download Button</label>
                    <Checkbox
                      checked={data.showDownloadApp}
                      onCheckedChange={(checked) => handleFieldChange("showDownloadApp", Boolean(checked))}
                    />
                  </div>
                  {data.showDownloadApp && (
                    <>
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
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Terms of Use URL</label>
                    <Input
                      className="mt-1 text-xs"
                      value={data.termsUrl}
                      onChange={(e) => handleFieldChange("termsUrl", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Privacy Policy URL</label>
                    <Input
                      className="mt-1 text-xs"
                      value={data.privacyUrl}
                      onChange={(e) => handleFieldChange("privacyUrl", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live Visual Mockup Preview */}
          <div className="lg:col-span-6 flex flex-col bg-slate-900 p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="size-3.5" /> Live Preview
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Real-Time Updates
              </span>
            </div>

            {/* Scaled Mockup Frame */}
            <div className="relative flex-1 min-h-[440px] rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 text-slate-800">
              <img
                src={effectiveBg}
                alt="Background preview"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/95" />

              <div className="relative z-10 p-5 grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-center">
                {/* Mockup Left Banner */}
                <div className="space-y-3">
                  <img
                    src={effectiveLogo}
                    alt="Logo"
                    className="h-8 max-w-[140px] object-contain"
                  />
                  <div>
                    <h3 className="text-sm font-black leading-tight text-slate-900">
                      {data.heroHeadlinePrefix}{" "}
                      <span className="text-primary block">{data.heroHeadlineHighlight}</span>
                    </h3>
                    <p className="text-[10px] text-slate-600 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {data.heroTagline}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {data.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="bg-white/90 border border-slate-200 rounded px-2 py-1 text-[9px] font-bold text-slate-800 text-center truncate shadow-2xs"
                      >
                        {feat.title}
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 text-white rounded p-2 text-[9px] space-y-0.5 shadow-sm">
                    <p className="font-bold text-amber-300">{data.trustBadgeTitle}</p>
                    <p className="text-slate-300 text-[8px] leading-tight line-clamp-2">
                      {data.trustBadgeDescription}
                    </p>
                  </div>
                </div>

                {/* Mockup Right Login Card */}
                <div className="bg-white rounded-xl p-3.5 shadow-xl border border-slate-200 space-y-2.5">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{data.cardTitle}</h4>
                    <p className="text-[9px] text-slate-500 font-medium">{data.cardSubtitle}</p>
                  </div>

                  <div className="space-y-1.5 pointer-events-none opacity-85">
                    <div className="h-7 bg-slate-100 rounded border border-slate-200 px-2 flex items-center text-[9px] text-slate-400">
                      Enter email or mobile
                    </div>
                    <div className="h-7 bg-slate-100 rounded border border-slate-200 px-2 flex items-center text-[9px] text-slate-400">
                      ••••••••
                    </div>
                    <div className="h-7 bg-[#0D1F3D] text-white rounded font-bold text-[10px] flex items-center justify-center">
                      Login →
                    </div>
                  </div>

                  {data.showDownloadApp && (
                    <div className="h-6 border border-slate-200 rounded flex items-center justify-center text-[9px] font-bold text-slate-700 bg-slate-50">
                      <Smartphone className="size-3 mr-1 text-slate-500" />
                      {data.downloadAppLabel}
                    </div>
                  )}

                  {/* Mockup Support Box */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[9px] flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{data.supportTitle}</p>
                      <p className="text-[8px] text-slate-500">{data.supportSubtitle}</p>
                    </div>
                    <div className="text-right font-bold text-slate-800 text-[8px]">
                      <p className="flex items-center justify-end gap-1 text-primary">
                        <Phone className="size-2.5" /> {data.supportPhone}
                      </p>
                      <p className="text-slate-500 truncate max-w-[100px]">{data.supportEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-slate-600 gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Reset to Default
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving}
              className="gap-1.5 bg-[#0D1F3D] text-white hover:bg-[#0D1F3D]/90 font-bold"
            >
              {isSaving ? "Saving..." : <><Save className="size-3.5" /> Save Login Page CMS</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
