import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bell, MessageCircle } from "lucide-react";
import { api } from "../../common/api";
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/ui/Checkbox";
import { useAppSelector } from "../../store";
import { crmError } from "../../features/crm/crm.state";

interface Settings {
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  followUpAssignedPush: boolean;
  followUpDuePush: boolean;
  followUpCompletedPush: boolean;
  fcmConfigured: boolean;
  whatsappConfigured: boolean;
  updatedAt: string | null;
}

const endpoint = "/platform/notifications/settings";

export function NotificationChannelSettingsPage() {
  const canManage = useAppSelector(
    (state) =>
      state.authorization.platform?.permissions?.includes(
        "platform.notifications.settings.manage",
      ) ?? false,
  );
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Settings>(endpoint, { signal });
      if (signal?.aborted) return;
      setSaved(response.data);
      setDraft(response.data);
    } catch (failure) {
      if (!signal?.aborted) setError(crmError(failure).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  function change(
    key: "pushEnabled" | "followUpAssignedPush" | "followUpDuePush" | "followUpCompletedPush",
    checked: boolean,
  ) {
    setDraft((current) => (current ? { ...current, [key]: checked } : current));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await api.patch<Settings>(endpoint, {
        pushEnabled: draft.pushEnabled,
        whatsappEnabled: draft.whatsappEnabled,
        followUpAssignedPush: draft.followUpAssignedPush,
        followUpDuePush: draft.followUpDuePush,
        followUpCompletedPush: draft.followUpCompletedPush,
      });
      setSaved(response.data);
      setDraft(response.data);
      toast.success("Notification settings saved");
    } catch (failure) {
      setError(crmError(failure).message);
    } finally {
      setSaving(false);
    }
  }

  const dirty = Boolean(
    saved &&
    draft &&
    (saved.pushEnabled !== draft.pushEnabled ||
      saved.followUpAssignedPush !== draft.followUpAssignedPush ||
      saved.followUpDuePush !== draft.followUpDuePush ||
      saved.followUpCompletedPush !== draft.followUpCompletedPush),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-16 text-left font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0D1F3D]">
          Notification channel & trigger settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Control master notification delivery channels and event triggers for
          all workspaces.
        </p>
      </div>
      {loading && (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
        >
          Loading notification settings...
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}{" "}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reload
          </Button>
        </div>
      )}
      {draft && !loading && (
        <form onSubmit={save} className="space-y-4">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Bell className="mt-1 h-5 w-5 text-[#0D1F3D]" />
              <div>
                <h2 className="text-base font-bold text-[#0D1F3D]">
                  Mobile push notifications (FCM)
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Global master switch for native push notifications delivered
                  to registered user devices. When disabled, zero push messages
                  are sent across any event.
                </p>
              </div>
            </div>
            <Checkbox
              label={draft.pushEnabled ? "Enabled" : "Disabled"}
              checked={draft.pushEnabled}
              disabled={!canManage || !draft.fcmConfigured}
              onChange={(checked) => change("pushEnabled", checked)}
            />
            {!draft.fcmConfigured && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Firebase credentials are not configured on the API. Push cannot
                be enabled until a service account is connected.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Device tokens are registered per signed-in user and workspace.
              Push only targets active registrations for the assigned user.
            </p>
          </section>
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-[#0D1F3D]">
              Follow-up triggers
            </h2>
            <p className="text-sm text-slate-600">
              These settings apply only when mobile push is enabled.
            </p>
            <Checkbox
              label="Notify the assignee when a follow-up is assigned"
              checked={draft.followUpAssignedPush}
              disabled={!canManage}
              onChange={(checked) => change("followUpAssignedPush", checked)}
            />
            <Checkbox
              label="Remind the assignee when a follow-up is due"
              checked={draft.followUpDuePush}
              disabled={!canManage}
              onChange={(checked) => change("followUpDuePush", checked)}
            />
            <Checkbox
              label="Notify the assignee when a follow-up is completed"
              checked={draft.followUpCompletedPush}
              disabled={!canManage}
              onChange={(checked) => change("followUpCompletedPush", checked)}
            />
          </section>
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-1 h-5 w-5 text-[#0D1F3D]" />
              <div>
                <h2 className="text-base font-bold text-[#0D1F3D]">
                  WhatsApp Business API
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Business messaging is unavailable until a sender is connected.
                  No WhatsApp messages are sent from notification campaigns.
                </p>
              </div>
            </div>
            <Checkbox
              label="Disabled"
              checked={draft.whatsappEnabled}
              disabled
              onChange={() => undefined}
            />
          </section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {saved?.updatedAt
                ? `Last saved ${new Date(saved.updatedAt).toLocaleString()}`
                : "Using default disabled settings"}
            </p>
            {canManage && (
              <Button
                type="submit"
                variant="accent"
                isLoading={saving}
                disabled={!dirty}
              >
                Save notification settings
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
