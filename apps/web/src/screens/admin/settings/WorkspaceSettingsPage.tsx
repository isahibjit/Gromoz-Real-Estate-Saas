import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Building2,
  Globe,
  Sliders,
  Shield,
  Lock,
  MapPin,
  Check,
  Languages,
  Banknote,
  Settings,
  Plug,
  AlertCircle,
  RotateCcw,
  Save,
  CheckCircle2,
  Upload,
  Trash2,
  Edit3,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Select,
} from "ui";
import { api } from "../../../common/api";
import {
  LoginPageCmsModal,
  LoginPageCmsData,
  defaultLoginPageCms,
} from "./LoginPageCmsModal";
import { SidebarLogoCustomizerModal } from "../../../components/ui/SidebarLogoCustomizerModal";

const COUNTRY_OPTIONS = [
  { value: "India", label: "India" },
  { value: "United States", label: "United States" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Singapore", label: "Singapore" },
  { value: "Australia", label: "Australia" },
  { value: "Other", label: "Other" },
];

const STATE_OPTIONS = [
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Delhi", label: "Delhi" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Telangana", label: "Telangana" },
  { value: "West Bengal", label: "West Bengal" },
  { value: "Haryana", label: "Haryana" },
  { value: "Other", label: "Other" },
];

const INDUSTRY_OPTIONS = [
  { value: "Real Estate & Construction", label: "Real Estate & Construction" },
  { value: "Property Advisory & Brokerage", label: "Property Advisory & Brokerage" },
  { value: "Commercial Real Estate", label: "Commercial Real Estate" },
  { value: "Technology & Enterprise SaaS", label: "Technology & Enterprise SaaS" },
  { value: "Financial Services", label: "Financial Services" },
  { value: "Other", label: "Other" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +05:30)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST -05:00)" },
  { value: "Europe/London", label: "Europe/London (GMT +00:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +04:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +08:00)" },
];

const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 17/09/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 09/17/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-09-17)" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY (e.g. 17 Sep 2026)" },
];

const TIME_FORMAT_OPTIONS = [
  { value: "12-Hour", label: "12-Hour Format (hh:mm A)" },
  { value: "24-Hour", label: "24-Hour Format (HH:mm)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "hi-IN", label: "Hindi (हिंदी)" },
];

const WEEK_START_OPTIONS = [
  { value: "Monday", label: "Monday" },
  { value: "Sunday", label: "Sunday" },
];

const NUMBER_FORMAT_OPTIONS = [
  { value: "lakhs", label: "1,23,456.78 (Indian Lakhs / Crores)" },
  { value: "standard", label: "123,456.78 (International Standard)" },
];

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR (₹ - Indian Rupee)" },
  { value: "USD", label: "USD ($ - US Dollar)" },
  { value: "AED", label: "AED (AED - UAE Dirham)" },
  { value: "GBP", label: "GBP (£ - British Pound)" },
];

const FY_START_OPTIONS = [
  { value: "April", label: "April (Apr 1 - Mar 31)" },
  { value: "January", label: "January (Jan 1 - Dec 31)" },
];

const LANDING_PAGE_OPTIONS = [
  { value: "/dashboard", label: "Executive Dashboard" },
  { value: "/leads/all", label: "All Leads Pipeline" },
  { value: "/site-visits", label: "Site Visits Manager" },
  { value: "/projects", label: "Projects & Inventory" },
];

const SESSION_TIMEOUT_OPTIONS = [
  { value: "30", label: "30 Minutes" },
  { value: "60", label: "1 Hour (Recommended)" },
  { value: "240", label: "4 Hours" },
  { value: "480", label: "8 Hours" },
];

const PASSWORD_LENGTH_OPTIONS = [
  { value: "8", label: "8 Characters (Minimum)" },
  { value: "10", label: "10 Characters (Recommended)" },
  { value: "12", label: "12 Characters (Strict)" },
];

const PASSWORD_EXPIRY_OPTIONS = [
  { value: "90", label: "90 Days" },
  { value: "180", label: "180 Days" },
  { value: "never", label: "Never Expire" },
];

const MAX_ATTEMPTS_OPTIONS = [
  { value: "3", label: "3 Failed Attempts (Lock Account)" },
  { value: "5", label: "5 Failed Attempts (Recommended)" },
  { value: "10", label: "10 Failed Attempts" },
];

export function WorkspaceSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collapsedFileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<any>(null);
  const [loginCms, setLoginCms] = useState<LoginPageCmsData | null>(null);
  const [isLoginCmsModalOpen, setIsLoginCmsModalOpen] = useState(false);
  const [isLogoCustomizerOpen, setIsLogoCustomizerOpen] = useState(false);
  const [customizerImageUrl, setCustomizerImageUrl] = useState("");
  const [customizerCollapsedUrl, setCustomizerCollapsedUrl] = useState("");

  // Form states
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    website: "",
    primaryEmail: "",
    primaryPhone: "",
    primaryColor: "#0D1F3D",
    secondaryColor: "#E20613",
    address1: "",
    city: "",
    state: "Maharashtra",
    country: "India",
    pincode: "",
    logoUrl: "",
    collapsedLogoUrl: "",
    showLogoInSidebar: true,
    showLogoInLogin: true,
    sidebarLogoHeight: 42,
    sidebarLogoObjectFit: "contain" as "contain" | "cover",
    sidebarLogoBg: "transparent",
    sidebarLogoRadius: 6,
    sidebarLogoAlign: "left" as "left" | "center" | "right",
    sidebarHeaderBg: "transparent",
    subdomain: "",
    customDomain: "",
    customDomainVerified: false,
    customDomainSslStatus: "PENDING",
  });

  const [localizationForm, setLocalizationForm] = useState({
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-Hour",
    language: "en-US",
    weekStart: "Monday",
    numberFormat: "lakhs",
  });

  const [financialForm, setFinancialForm] = useState({
    currency: "INR",
    fyStart: "April",
    gstNumber: "27AAAAA0000A1Z5",
    panNumber: "ABCDE1234F",
    billingAddress: "Suite 402, Business Park",
    autoInvoice: true,
  });

  const [preferencesForm, setPreferencesForm] = useState({
    defaultLandingPage: "/dashboard",
    sessionTimeout: "60",
    emailNotifications: true,
    dailyDigest: true,
    showMapView: true,
    compactTable: false,
  });

  const [securityForm, setSecurityForm] = useState({
    enforce2FA: false,
    passwordMinLength: "8",
    passwordExpiry: "never",
    maxLoginAttempts: "5",
    ipWhitelist: false,
    geoFenceAttendance: true,
    forceLogoutOnInactivity: false,
  });

  const [integrationsForm, setIntegrationsForm] = useState({
    googleMapsApiKey: "••••••••••••••••••••••••••••••••",
    whatsappWebhookUrl: "https://api.yourcrm.com/webhooks/whatsapp",
    enableWebhooks: true,
    enableMetaLeadsSync: true,
    enableIndiamartSync: true,
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organizations/workspace-settings");
      const d = res.data;
      setSettings(d);

      if (d.loginCms) {
        setLoginCms(d.loginCms);
      }

      if (d.profile) {
        setForm({
          companyName: d.profile.companyName || "",
          industry: d.profile.industry || "",
          website: d.profile.website || "",
          primaryEmail: d.profile.primaryEmail || "",
          primaryPhone: d.profile.primaryPhone || "",
          primaryColor: d.profile.primaryColor || "#0D1F3D",
          secondaryColor: d.profile.secondaryColor || "#E20613",
          address1: d.profile.address1 || "",
          city: d.profile.city || "",
          state: d.profile.state || "Maharashtra",
          country: d.profile.country || "India",
          pincode: d.profile.pincode || "",
          logoUrl: d.profile.logoUrl || "",
          collapsedLogoUrl: d.profile.collapsedLogoUrl || "",
          showLogoInSidebar: d.profile.showLogoInSidebar ?? true,
          showLogoInLogin: d.profile.showLogoInLogin ?? true,
          sidebarLogoHeight: d.profile.sidebarLogoHeight ?? 42,
          sidebarLogoObjectFit: d.profile.sidebarLogoObjectFit || "contain",
          sidebarLogoBg: d.profile.sidebarLogoBg || "transparent",
          sidebarLogoRadius: d.profile.sidebarLogoRadius ?? 6,
          sidebarLogoAlign: d.profile.sidebarLogoAlign || "left",
          sidebarHeaderBg: d.profile.sidebarHeaderBg || "transparent",
          subdomain: d.profile.subdomain || "",
          customDomain: d.profile.customDomain || "",
          customDomainVerified: Boolean(d.profile.customDomainVerified),
          customDomainSslStatus: d.profile.customDomainSslStatus || "PENDING",
        });
      }

      if (d.localization) setLocalizationForm(d.localization);
      if (d.financial) setFinancialForm(d.financial);
      if (d.preferences) setPreferencesForm(d.preferences);
      if (d.security) setSecurityForm(d.security);
      if (d.integrations) setIntegrationsForm(d.integrations);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load workspace settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFieldChange = (field: string, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCustomizerImageUrl(reader.result as string);
        setCustomizerCollapsedUrl(form.collapsedLogoUrl || "");
        setIsLogoCustomizerOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCollapsedLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 3 * 1024 * 1024) {
        toast.error("Icon file size must be less than 3MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCustomizerImageUrl(form.logoUrl || (reader.result as string));
        setCustomizerCollapsedUrl(reader.result as string);
        setIsLogoCustomizerOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCustomizer = () => {
    setCustomizerImageUrl(form.logoUrl || "");
    setCustomizerCollapsedUrl(form.collapsedLogoUrl || "");
    setIsLogoCustomizerOpen(true);
  };

  const handleApplyCustomizer = (newBranding: {
    logoUrl: string;
    collapsedLogoUrl?: string;
    showLogoInSidebar: boolean;
    sidebarLogoHeight: number;
    sidebarLogoObjectFit: "contain" | "cover";
    sidebarLogoBg: string;
    sidebarLogoRadius: number;
    sidebarLogoAlign: "left" | "center" | "right";
    sidebarHeaderBg: string;
  }) => {
    setForm((prev) => ({
      ...prev,
      logoUrl: newBranding.logoUrl,
      collapsedLogoUrl: newBranding.collapsedLogoUrl || "",
      showLogoInSidebar: newBranding.showLogoInSidebar,
      sidebarLogoHeight: newBranding.sidebarLogoHeight,
      sidebarLogoObjectFit: newBranding.sidebarLogoObjectFit,
      sidebarLogoBg: newBranding.sidebarLogoBg,
      sidebarLogoRadius: newBranding.sidebarLogoRadius,
      sidebarLogoAlign: newBranding.sidebarLogoAlign,
      sidebarHeaderBg: newBranding.sidebarHeaderBg,
    }));

    const activeOrgId = localStorage.getItem("active_organization_id") || "default";
    const brandingPayload = {
      ...newBranding,
    };
    localStorage.setItem(`visiblo_workspace_branding_${activeOrgId}`, JSON.stringify(brandingPayload));
    localStorage.setItem("truroot_workspace_branding", JSON.stringify(brandingPayload));
    window.dispatchEvent(new Event("workspace_branding_updated"));
    window.dispatchEvent(new Event("storage"));

    setIsLogoCustomizerOpen(false);
    toast.success("Sidebar branding customized and applied live! Click 'Save Workspace Changes' to persist.");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (collapsedFileInputRef.current) collapsedFileInputRef.current.value = "";
  };

  const handleSaveProfile = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company Name is required.");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/organizations/workspace-settings", {
        ...form,
        loginCms: loginCms,
        localization: localizationForm,
        financial: financialForm,
        preferences: preferencesForm,
        security: securityForm,
        integrations: integrationsForm,
      });

      const activeOrgId = localStorage.getItem("active_organization_id") || "default";
      const brandingPayload = {
        logoUrl: form.logoUrl,
        collapsedLogoUrl: form.collapsedLogoUrl,
        showLogoInSidebar: form.showLogoInSidebar,
        sidebarLogoHeight: form.sidebarLogoHeight,
        sidebarLogoObjectFit: form.sidebarLogoObjectFit,
        sidebarLogoBg: form.sidebarLogoBg,
        sidebarLogoRadius: form.sidebarLogoRadius,
        sidebarLogoAlign: form.sidebarLogoAlign,
        sidebarHeaderBg: form.sidebarHeaderBg,
      };
      localStorage.setItem(`visiblo_workspace_branding_${activeOrgId}`, JSON.stringify(brandingPayload));
      localStorage.setItem("truroot_workspace_branding", JSON.stringify(brandingPayload));
      window.dispatchEvent(new Event("workspace_branding_updated"));
      window.dispatchEvent(new Event("storage"));

      toast.success("Workspace profile and branding settings updated!");
      fetchSettings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update workspace profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoginCms = async (updatedCms: LoginPageCmsData) => {
    setSaving(true);
    try {
      await api.patch("/organizations/workspace-settings", {
        ...form,
        loginCms: updatedCms,
        localization: localizationForm,
        financial: financialForm,
        preferences: preferencesForm,
        security: securityForm,
        integrations: integrationsForm,
      });

      setLoginCms(updatedCms);
      localStorage.setItem("truroot_login_cms", JSON.stringify(updatedCms));
      window.dispatchEvent(new Event("storage"));
      toast.success("Login page CMS customized and published!");
      setIsLoginCmsModalOpen(false);
      fetchSettings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save Login CMS settings");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCustomDomain = async () => {
    if (!form.customDomain) {
      toast.error("Please enter a custom domain to verify.");
      return;
    }

    setVerifyingDomain(true);
    try {
      const res = await api.post("/organizations/custom-domain/verify");
      if (res.data?.verified) {
        toast.success(res.data.message);
        setForm((prev) => ({
          ...prev,
          customDomainVerified: true,
          customDomainSslStatus: "ACTIVE",
        }));
      } else {
        toast(res.data.message, { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Custom domain verification failed.");
    } finally {
      setVerifyingDomain(false);
    }
  };

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const tabs = [
    { id: "profile", label: "Workspace Profile & Domains" },
    { id: "login-cms", label: "Login Page CMS" },
    { id: "localization", label: "Localization" },
    { id: "financial", label: "Business & Financial" },
    { id: "preferences", label: "Preferences" },
    { id: "security", label: "Policies & Security" },
    { id: "integrations", label: "Integrations & APIs" },
  ];

  if (isLoading) {
    return (
      <div className="w-full space-y-5 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-2">
            <div className="h-3 w-40 bg-muted/70 rounded" />
            <div className="h-7 w-64 bg-muted/80 rounded-md" />
            <div className="h-3.5 w-96 max-w-full bg-muted/50 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-44 bg-muted/70 rounded-lg" />
            <div className="h-9 w-24 bg-muted/50 rounded-lg" />
          </div>
        </div>

        {/* Tab Strip Skeleton */}
        <div className="flex items-center gap-6 border-b border-border pb-3 overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 w-28 bg-muted/60 rounded shrink-0" />
          ))}
        </div>

        {/* Card 1 Skeleton: Domains */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
            <div className="size-4 bg-muted/70 rounded" />
            <div className="space-y-1">
              <div className="h-4 w-48 bg-muted/70 rounded" />
              <div className="h-3 w-72 bg-muted/40 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 rounded-lg bg-muted/20 border border-border p-4 space-y-3">
              <div className="h-3.5 w-32 bg-muted/50 rounded" />
              <div className="h-10 bg-muted/40 rounded-md" />
              <div className="h-3 w-44 bg-muted/30 rounded" />
            </div>
            <div className="h-32 rounded-lg bg-muted/20 border border-border p-4 space-y-3">
              <div className="h-3.5 w-36 bg-muted/50 rounded" />
              <div className="h-10 bg-muted/40 rounded-md" />
              <div className="h-3 w-48 bg-muted/30 rounded" />
            </div>
          </div>
        </div>

        {/* Card 2 Skeleton: Branding & Company Info */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
            <div className="size-4 bg-muted/70 rounded" />
            <div className="space-y-1">
              <div className="h-4 w-56 bg-muted/70 rounded" />
              <div className="h-3 w-80 bg-muted/40 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-4">
              <div className="h-44 rounded-lg bg-muted/20 border border-border p-4 space-y-3">
                <div className="h-3.5 w-36 bg-muted/50 rounded" />
                <div className="h-20 bg-muted/30 rounded-md" />
                <div className="h-8 bg-muted/40 rounded-md" />
              </div>
              <div className="h-36 rounded-lg bg-muted/20 border border-border p-4 space-y-3">
                <div className="h-3.5 w-40 bg-muted/50 rounded" />
                <div className="h-16 bg-muted/30 rounded-md" />
              </div>
            </div>
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-muted/60 rounded" />
                  <div className="h-9 bg-muted/40 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 text-foreground">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLogoFileChange}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={collapsedFileInputRef}
        onChange={handleCollapsedLogoFileChange}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Admin & Settings</span>
            <span>›</span>
            <span className="font-bold text-foreground">Workspace Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Workspace Configuration
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Branding, sidebar logos, subdomains, white-label custom domains, and organizational policies for{" "}
            <strong>{settings?.profile?.companyName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProfile}
            disabled={saving}
            className="gap-1.5 font-bold shadow-xs"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Workspace Changes"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSettings} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Card 1: Domains & Subdomains */}
          <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Workspace Domains & URLs</h3>
                <p className="text-xs text-muted-foreground">
                  Branded cloud subdomain and white-label custom domain mapping.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cloud Subdomain */}
              <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Cloud Subdomain</span>
                  <Badge variant="success" className="text-[10px]">
                    Active & SSL Secured
                  </Badge>
                </div>
                <div className="flex rounded-md border border-border bg-card overflow-hidden h-10 shadow-xs">
                  <input
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => handleFieldChange("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="company-slug"
                    className="flex-1 px-3 text-xs font-semibold text-foreground bg-transparent focus:outline-none"
                  />
                  <span className="inline-flex items-center px-3 bg-muted border-l border-border text-xs font-mono text-muted-foreground select-none">
                    .yourcrm.com
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your team access URL: <strong className="text-primary font-mono">https://{form.subdomain || "workspace"}.yourcrm.com</strong>
                </p>
              </div>

              {/* Custom Domain */}
              <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Custom White-Label Domain</span>
                  <Badge
                    variant={form.customDomainVerified ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {form.customDomainVerified ? "SSL Active" : "Verification Required"}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. crm.yourcompany.com"
                    value={form.customDomain}
                    onChange={(e) => handleFieldChange("customDomain", e.target.value)}
                    className="flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyCustomDomain}
                    disabled={verifyingDomain || !form.customDomain}
                    className="gap-1 text-xs shrink-0"
                  >
                    {verifyingDomain ? "Checking DNS..." : "Verify DNS"}
                  </Button>
                </div>

                {form.customDomain && !form.customDomainVerified && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs space-y-1 text-amber-600">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> DNS CNAME Mapping
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Add a <strong>CNAME</strong> record in your DNS manager (Cloudflare, GoDaddy, Route53):
                    </p>
                    <div className="font-mono text-[11px] bg-background/80 p-2 rounded border border-border text-foreground">
                      <div><strong>Host:</strong> {form.customDomain.split(".")[0] || "crm"}</div>
                      <div><strong>Target:</strong> cname.yourcrm.com</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Card 2: Company Info & Dual Sidebar Logos */}
          <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Company Information & Sidebar Branding</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload your full brand logo and compact collapsed icon for the navigation sidebar.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCustomizer}
                className="gap-1.5 text-xs font-bold text-primary border-primary/40 bg-primary/5 hover:bg-primary/10 shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Open Sidebar Brand Customizer
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Dual Logo Upload Column */}
              <div className="md:col-span-5 space-y-4">
                {/* 1. Main Expanded Sidebar Logo */}
                <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Expanded Sidebar Logo</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">Recommended: 220×55px (PNG/SVG)</span>
                  </div>

                  <div
                    className="flex h-20 w-full items-center justify-center rounded-md border border-border p-2 shadow-xs overflow-hidden"
                    style={{
                      backgroundColor: form.sidebarLogoBg !== "transparent" ? form.sidebarLogoBg : "var(--card)",
                      borderRadius: `${form.sidebarLogoRadius || 6}px`,
                    }}
                  >
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Company Logo"
                        style={{
                          height: `${form.sidebarLogoHeight || 42}px`,
                          maxHeight: "56px",
                          maxWidth: "210px",
                          objectFit: form.sidebarLogoObjectFit || "contain",
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <p className="font-bold text-foreground text-xs">
                          {form.companyName || "Workspace logo"}
                        </p>
                        <p className="text-[9px] font-semibold text-muted-foreground">Default logo</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 gap-1.5 text-xs font-semibold"
                    >
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      {form.logoUrl ? "Change Main Logo" : "Upload Main Logo"}
                    </Button>
                    {form.logoUrl && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleFieldChange("logoUrl", "")}
                        className="text-xs px-2"
                        title="Remove custom logo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {form.logoUrl && (
                    <div className="w-full space-y-1 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-muted-foreground">Sidebar Logo Height</span>
                        <span className="font-mono text-primary font-bold text-xs">
                          {form.sidebarLogoHeight}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="24"
                        max="56"
                        value={form.sidebarLogoHeight}
                        onChange={(e) => handleFieldChange("sidebarLogoHeight", Number(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Collapsed Sidebar Mini Icon */}
                <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Collapsed Sidebar Mini Icon</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">1:1 Square (e.g. 40×40px)</span>
                  </div>

                  <div
                    className="flex h-16 w-full items-center justify-center rounded-md border border-border p-2 shadow-xs"
                    style={{
                      backgroundColor: form.sidebarLogoBg !== "transparent" ? form.sidebarLogoBg : "var(--card)",
                      borderRadius: `${form.sidebarLogoRadius || 6}px`,
                    }}
                  >
                    {form.collapsedLogoUrl ? (
                      <img
                        src={form.collapsedLogoUrl}
                        alt="Collapsed Sidebar Icon"
                        className="h-10 w-10 object-contain rounded"
                      />
                    ) : form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Fallback Logo"
                        className="h-9 w-9 object-contain opacity-70"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                        {(form.companyName || "W").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => collapsedFileInputRef.current?.click()}
                      className="flex-1 gap-1.5 text-xs font-semibold"
                    >
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      {form.collapsedLogoUrl ? "Change Mini Icon" : "Upload Mini Icon"}
                    </Button>
                    {form.collapsedLogoUrl && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleFieldChange("collapsedLogoUrl", "")}
                        className="text-xs px-2"
                        title="Remove mini icon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Fields */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Company Name *</label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => handleFieldChange("companyName", e.target.value)}
                    placeholder="e.g. Skyline Realty"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Industry</label>
                  <Select
                    value={form.industry}
                    onChange={(e) => handleFieldChange("industry", e.target.value)}
                    options={INDUSTRY_OPTIONS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Website</label>
                  <Input
                    value={form.website}
                    onChange={(e) => handleFieldChange("website", e.target.value)}
                    placeholder="https://company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Contact Email</label>
                  <Input
                    value={form.primaryEmail}
                    onChange={(e) => handleFieldChange("primaryEmail", e.target.value)}
                    placeholder="contact@company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                  <Input
                    value={form.primaryPhone}
                    onChange={(e) => handleFieldChange("primaryPhone", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-9 w-9 rounded border border-border shrink-0 shadow-xs"
                      style={{ backgroundColor: form.primaryColor }}
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => handleFieldChange("primaryColor", e.target.value)}
                      placeholder="#0D1F3D"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3: Login Screen Visual CMS & Support Center */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">Login Page Visual CMS & Support Center</h3>
                    <Badge variant="primary" className="text-[10px]">
                      Live multi-tenant
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Customize login headlines, support hotline number, hero features, security badges & logo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsLoginCmsModalOpen(true)}
                  className="gap-1.5 font-bold shadow-xs text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Customize Login Page (CMS)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs font-semibold"
                >
                  <a href="/login" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview Live
                  </a>
                </Button>
              </div>
            </div>

            {/* CMS Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Login headline & tagline
                </span>
                <p className="text-xs font-bold text-foreground line-clamp-1">
                  {loginCms?.heroHeadlinePrefix || "Welcome to"}{" "}
                  <span className="text-primary">{loginCms?.heroHeadlineHighlight || form.companyName || "Trueroot Realty CRM"}</span>
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {loginCms?.heroTagline || "Streamline your leads, follow-ups, site visits and sales - all in one place."}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Support center & hotline
                </span>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-primary">📞</span>
                    {loginCms?.supportPhone || form.primaryPhone || "+91 98765 43210"}
                  </p>
                  <p className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <span className="text-primary">✉️</span>
                    {loginCms?.supportEmail || form.primaryEmail || "support@truerootrealty.com"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Feature badges & mobile app
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(loginCms?.features || [
                    { title: "Manage Leads" },
                    { title: "Track Activities" },
                    { title: "Close More Deals" },
                    { title: "Boost Productivity" },
                  ]).slice(0, 4).map((f, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                      {f.title}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Android App Download:{" "}
                  <strong className={loginCms?.showDownloadApp ?? true ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                    {loginCms?.showDownloadApp ?? true ? "Enabled" : "Hidden"}
                  </strong>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Dedicated Login Page CMS */}
      {activeTab === "login-cms" && (
        <div className="space-y-6">
          <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">
                    White-Label Login Page CMS Customizer
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Craft your custom branded welcome portal, support hotline numbers, security guarantees, and mobile app download actions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  onClick={() => setIsLoginCmsModalOpen(true)}
                  className="gap-2 font-bold shadow-xs text-xs"
                >
                  <Edit3 className="h-4 w-4" />
                  Launch Visual CMS Editor
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="gap-2 text-xs font-semibold"
                >
                  <a href="/login" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Public Login Page
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Overview */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground">
                  Current configuration
                </h4>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Hero headline</span>
                    <p className="text-sm font-extrabold text-foreground">
                      {loginCms?.heroHeadlinePrefix || "Welcome to"}{" "}
                      <span className="text-primary">{loginCms?.heroHeadlineHighlight || form.companyName || "Trueroot Realty CRM"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {loginCms?.heroTagline || "Streamline your leads, follow-ups, site visits and sales - all in one place."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Support center & contact</span>
                    <div className="flex items-center gap-4 text-xs font-bold text-foreground pt-1">
                      <span>📞 {loginCms?.supportPhone || form.primaryPhone || "+91 98765 43210"}</span>
                      <span>✉️ {loginCms?.supportEmail || form.primaryEmail || "support@truerootrealty.com"}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Security trust badge</span>
                    <p className="text-xs font-bold text-foreground">
                      🛡️ {loginCms?.trustBadgeTitle || "Secure. Reliable. Always with You."}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {loginCms?.trustBadgeDescription || "Your data is protected with enterprise grade security."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Live Preview Box */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground">
                  Live snapshot preview
                </h4>
                <div className="rounded-xl border border-border bg-slate-950 p-4 text-white overflow-hidden relative shadow-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-amber-400">
                      {form.companyName || "Brand preview"}
                    </span>
                    <span className="text-[10px] bg-primary/20 text-blue-300 font-bold px-2 py-0.5 rounded">
                      Live modal
                    </span>
                  </div>

                  <div className="py-4 space-y-2">
                    <h5 className="text-base font-extrabold text-white leading-tight">
                      {loginCms?.heroHeadlinePrefix || "Welcome to"}{" "}
                      <span className="text-amber-400">
                        {loginCms?.heroHeadlineHighlight || form.companyName || "Trueroot Realty CRM"}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-300 line-clamp-2">
                      {loginCms?.heroTagline || "Streamline your leads, follow-ups, site visits and sales - all in one place."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Need help? {loginCms?.supportPhone || form.primaryPhone || "+91 98765 43210"}</span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsLoginCmsModalOpen(true)}
                      className="text-[11px] h-7 px-2.5 font-bold"
                    >
                      Edit in CMS Modal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Localization */}
      {activeTab === "localization" && (
        <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Languages className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Localization & Regional Standards</h3>
              <p className="text-xs text-muted-foreground">Timezone, date formats, and currency display.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Timezone</label>
              <Select
                value={localizationForm.timezone}
                onChange={(e) => setLocalizationForm({ ...localizationForm, timezone: e.target.value })}
                options={TIMEZONE_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Date Format</label>
              <Select
                value={localizationForm.dateFormat}
                onChange={(e) => setLocalizationForm({ ...localizationForm, dateFormat: e.target.value })}
                options={DATE_FORMAT_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Time Format</label>
              <Select
                value={localizationForm.timeFormat}
                onChange={(e) => setLocalizationForm({ ...localizationForm, timeFormat: e.target.value })}
                options={TIME_FORMAT_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Language</label>
              <Select
                value={localizationForm.language}
                onChange={(e) => setLocalizationForm({ ...localizationForm, language: e.target.value })}
                options={LANGUAGE_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Week Start Day</label>
              <Select
                value={localizationForm.weekStart}
                onChange={(e) => setLocalizationForm({ ...localizationForm, weekStart: e.target.value })}
                options={WEEK_START_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Number Format</label>
              <Select
                value={localizationForm.numberFormat}
                onChange={(e) => setLocalizationForm({ ...localizationForm, numberFormat: e.target.value })}
                options={NUMBER_FORMAT_OPTIONS}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Business & Financial */}
      {activeTab === "financial" && (
        <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Banknote className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Financial & Tax Profile</h3>
              <p className="text-xs text-muted-foreground">Currency standards, GST/PAN IDs, and billing address.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Base Currency</label>
              <Select
                value={financialForm.currency}
                onChange={(e) => setFinancialForm({ ...financialForm, currency: e.target.value })}
                options={CURRENCY_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Financial Year Start</label>
              <Select
                value={financialForm.fyStart}
                onChange={(e) => setFinancialForm({ ...financialForm, fyStart: e.target.value })}
                options={FY_START_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">GST / Tax ID</label>
              <Input
                value={financialForm.gstNumber}
                onChange={(e) => setFinancialForm({ ...financialForm, gstNumber: e.target.value })}
                placeholder="27AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">PAN Number</label>
              <Input
                value={financialForm.panNumber}
                onChange={(e) => setFinancialForm({ ...financialForm, panNumber: e.target.value })}
                placeholder="ABCDE1234F"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Registered Billing Address</label>
              <Input
                value={financialForm.billingAddress}
                onChange={(e) => setFinancialForm({ ...financialForm, billingAddress: e.target.value })}
                placeholder="Suite, Building, City, PIN"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Preferences */}
      {activeTab === "preferences" && (
        <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Settings className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">System Preferences & Notifications</h3>
              <p className="text-xs text-muted-foreground">Default landing views and automated summaries.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Default Landing Screen</label>
              <Select
                value={preferencesForm.defaultLandingPage}
                onChange={(e) => setPreferencesForm({ ...preferencesForm, defaultLandingPage: e.target.value })}
                options={LANDING_PAGE_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Session Timeout</label>
              <Select
                value={preferencesForm.sessionTimeout}
                onChange={(e) => setPreferencesForm({ ...preferencesForm, sessionTimeout: e.target.value })}
                options={SESSION_TIMEOUT_OPTIONS}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Policies & Security */}
      {activeTab === "security" && (
        <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Security Policies & Governance</h3>
              <p className="text-xs text-muted-foreground">Password rules, 2FA, and access controls.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Min Password Length</label>
              <Select
                value={securityForm.passwordMinLength}
                onChange={(e) => setSecurityForm({ ...securityForm, passwordMinLength: e.target.value })}
                options={PASSWORD_LENGTH_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Password Expiry</label>
              <Select
                value={securityForm.passwordExpiry}
                onChange={(e) => setSecurityForm({ ...securityForm, passwordExpiry: e.target.value })}
                options={PASSWORD_EXPIRY_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Max Login Attempts</label>
              <Select
                value={securityForm.maxLoginAttempts}
                onChange={(e) => setSecurityForm({ ...securityForm, maxLoginAttempts: e.target.value })}
                options={MAX_ATTEMPTS_OPTIONS}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Integrations */}
      {activeTab === "integrations" && (
        <Card className="border border-border bg-card shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Plug className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Integrations & API Connectors</h3>
              <p className="text-xs text-muted-foreground">Google Maps, WhatsApp webhooks, and Lead Ads sync.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Google Maps API Key</label>
              <Input
                type="password"
                value={integrationsForm.googleMapsApiKey}
                onChange={(e) => setIntegrationsForm({ ...integrationsForm, googleMapsApiKey: e.target.value })}
                placeholder="AIzaSy..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">WhatsApp Business Webhook URL</label>
              <Input
                value={integrationsForm.whatsappWebhookUrl}
                onChange={(e) => setIntegrationsForm({ ...integrationsForm, whatsappWebhookUrl: e.target.value })}
                placeholder="https://api.yourdomain.com/webhooks/whatsapp"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Login Page Visual CMS Modal */}
      <LoginPageCmsModal
        isOpen={isLoginCmsModalOpen}
        onClose={() => setIsLoginCmsModalOpen(false)}
        initialData={loginCms || undefined}
        onSave={handleSaveLoginCms}
        orgName={form.companyName || "Trueroot Realty CRM"}
        orgLogo={form.logoUrl || ""}
        orgPhone={form.primaryPhone || "+91 98765 43210"}
        orgEmail={form.primaryEmail || "support@truerootrealty.com"}
      />

      {/* Sidebar Brand Logo & Live Sidebar Customizer Modal */}
      <SidebarLogoCustomizerModal
        isOpen={isLogoCustomizerOpen}
        imageUrl={customizerImageUrl || form.logoUrl || ""}
        collapsedLogoUrl={customizerCollapsedUrl || form.collapsedLogoUrl || ""}
        initialSettings={{
          showLogoInSidebar: form.showLogoInSidebar,
          sidebarLogoHeight: form.sidebarLogoHeight,
          sidebarLogoObjectFit: form.sidebarLogoObjectFit,
          sidebarLogoBg: form.sidebarLogoBg,
          sidebarLogoRadius: form.sidebarLogoRadius,
          sidebarLogoAlign: form.sidebarLogoAlign,
          sidebarHeaderBg: form.sidebarHeaderBg,
        }}
        onClose={() => {
          setIsLogoCustomizerOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (collapsedFileInputRef.current) collapsedFileInputRef.current.value = "";
        }}
        onApply={handleApplyCustomizer}
      />
    </div>
  );
}
