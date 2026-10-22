import React, { useState } from "react";
import {
  Settings,
  Shield,
  CreditCard,
  Mail,
  Smartphone,
  Globe,
  Save,
  CheckCircle2,
  Server,
  Lock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "ui";
import { InvoiceSettingsCard } from './InvoiceSettingsCard';

export function PlatformSettingsScreen() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platformName: "Truroot Realty CRM Platform",
    supportEmail: "support@truerootcrm.com",
    supportPhone: "+91 98700 66177",
    defaultCurrency: "INR (₹)",
    razorpayKeyId: "rzp_live_••••••••••••••••",
    razorpaySecret: "••••••••••••••••••••••••",
    enableSelfRegistration: true,
    maintenanceMode: false,
    defaultTrialDays: 14,
    defaultStorageGb: 20,
    smsGatewayProvider: "Twilio / Gupshup",
    smtpHost: "smtp.sendgrid.net",
    smtpPort: 587,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Platform settings saved successfully!");
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-primary">Platform Settings</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Settings className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Configure global SaaS infrastructure, commercial defaults, payment gateways, and system parameters
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 font-bold bg-primary text-white hover:bg-[#132d56] shadow-xs"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Platform Settings"}
        </Button>
      </div>

      <InvoiceSettingsCard />
      <form onSubmit={handleSave} className="space-y-6">
        {/* General Global Config */}
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-primary">Global Platform Identity</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Platform Brand Name</label>
              <input
                type="text"
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Default Currency</label>
              <input
                type="text"
                value={form.defaultCurrency}
                disabled
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Platform Support Email</label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Platform Support Hotline</label>
              <input
                type="text"
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Commercial Payment Gateway */}
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-primary">Commercial Billing & Payment Gateway</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Razorpay Key ID</label>
              <input
                type="text"
                value={form.razorpayKeyId}
                onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-mono font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Razorpay Key Secret</label>
              <input
                type="password"
                value={form.razorpaySecret}
                onChange={(e) => setForm({ ...form, razorpaySecret: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-mono font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Default Trial Duration (Days)</label>
              <input
                type="number"
                value={form.defaultTrialDays}
                onChange={(e) => setForm({ ...form, defaultTrialDays: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Default Tenant Storage Quota (GB)</label>
              <input
                type="number"
                value={form.defaultStorageGb}
                onChange={(e) => setForm({ ...form, defaultStorageGb: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Global Messaging / Communication Gateway */}
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Mail className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-primary">Global Communication & Delivery Gateways</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">System SMTP Host</label>
              <input
                type="text"
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">System SMS Gateway</label>
              <input
                type="text"
                value={form.smsGatewayProvider}
                onChange={(e) => setForm({ ...form, smsGatewayProvider: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
