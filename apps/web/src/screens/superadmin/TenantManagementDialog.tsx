import { useState, type FormEvent } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "ui";
import { api } from "../../common/api";
import { getApiErrorMessage } from "../../common/apiError";

interface ManagedTenant {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  allocatedSeats: number;
  setupFeePaid: boolean;
  memberships?: Array<{
    isOwner: boolean;
    isActive: boolean;
    role: string;
    user: { fullName: string; email: string };
  }>;
}

export function TenantManagementDialog({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: ManagedTenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const owner =
    tenant.memberships?.find((member) => member.isOwner && member.isActive) ??
    tenant.memberships?.find(
      (member) => member.role === "ADMIN" && member.isActive,
    );
  const [name, setName] = useState(tenant.name);
  const [planTier, setPlanTier] = useState(tenant.planTier);
  const [seats, setSeats] = useState(String(tenant.allocatedSeats));
  const [adminName, setAdminName] = useState(owner?.user.fullName ?? "");
  const [adminEmail, setAdminEmail] = useState(owner?.user.email ?? "");
  const [password, setPassword] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const base = `/organizations/tenants/${tenant.id}`;

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (failure: unknown) {
      setError(
        getApiErrorMessage(
          failure,
          "The request could not be completed. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await api.patch(base, {
        name: name.trim(),
        planTier,
        allocatedSeats: Number(seats),
        adminFullName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      });
      setMessage("Workspace and administrator details saved.");
      onSaved();
    });
  }
  function reset(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const { data } = await api.post<{ emailSent: boolean }>(
        `${base}/reset-admin-password`,
        { newPassword: password, notifyEmail: notify },
      );
      setMessage(
        data.emailSent
          ? "Password updated. The credentials email was accepted for delivery."
          : "Password updated. Credentials email was not sent. Share the new password with the administrator securely.",
      );
      onSaved();
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="flex h-[min(38rem,calc(100dvh_-_2rem))] flex-col sm:max-w-2xl"
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>Manage {tenant.name}</DialogTitle>
          <DialogDescription>
            Workspace profile, administrator access, and onboarding delivery.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="profile"
          className="flex min-h-0 flex-1 flex-col"
          onValueChange={() => {
            setError("");
            setMessage("");
          }}
        >
          <TabsList className="mb-4 shrink-0 self-start">
            <TabsTrigger value="profile" disabled={busy}>
              Workspace
            </TabsTrigger>
            <TabsTrigger value="password" disabled={busy}>
              Password
            </TabsTrigger>
            <TabsTrigger value="onboarding" disabled={busy}>
              Onboarding
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="tenant-name">Workspace name</label>
                <Input
                  id="tenant-name"
                  required
                  maxLength={160}
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Workspace address: {tenant.slug}.gromoze.com
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="tenant-plan">Plan</label>
                  <select
                    id="tenant-plan"
                    value={planTier}
                    disabled={busy}
                    onChange={(event) => setPlanTier(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="tenant-seats">Allocated seats</label>
                  <Input
                    id="tenant-seats"
                    type="number"
                    required
                    min={1}
                    max={100000}
                    step={1}
                    value={seats}
                    disabled={busy}
                    onChange={(event) => setSeats(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="tenant-admin-name">Administrator name</label>
                  <Input
                    id="tenant-admin-name"
                    required
                    maxLength={160}
                    value={adminName}
                    disabled={busy}
                    onChange={(event) => setAdminName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="tenant-admin-email">
                    Administrator email
                  </label>
                  <Input
                    id="tenant-admin-email"
                    type="email"
                    required
                    maxLength={254}
                    value={adminEmail}
                    disabled={busy}
                    onChange={(event) => setAdminEmail(event.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="password" className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={reset} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set a new password for the workspace administrator. The login
                email is {adminEmail}.
              </p>
              <div className="space-y-2">
                <label htmlFor="tenant-new-password">
                  New administrator password
                </label>
                <Input
                  id="tenant-new-password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div>
                <Checkbox
                  id="tenant-password-notify"
                  checked={notify}
                  disabled={busy}
                  onChange={(event) => setNotify(event.currentTarget.checked)}
                  label="Email the updated credentials to the administrator"
                  className="flex w-full items-start"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Updating…" : "Update administrator password"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="onboarding" className="min-h-0 flex-1 space-y-5 overflow-y-auto">
            <div className="space-y-3">
              <h3 className="font-semibold">Welcome kit</h3>
              <p className="text-sm text-muted-foreground">
                Send workspace access details to the saved administrator email.
                Credentials are included when recoverable; an old password hash
                requires a password reset first.
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const { data } = await api.post<{
                      emailSent: boolean;
                      credentialsIncluded: boolean;
                    }>(`${base}/welcome-email`);
                    setMessage(
                      data.emailSent
                        ? `Welcome email accepted for delivery.${
                            data.credentialsIncluded
                              ? " Credentials included."
                              : " Set a new password in the Password tab to provide new credentials."
                          }`
                        : "Welcome email was not sent.",
                    );
                  })
                }
              >
                Resend welcome kit
              </Button>
            </div>
            {!tenant.setupFeePaid && (
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="font-semibold">Setup payment</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a Razorpay link using the workspace’s current seat
                  allocation.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const { data } = await api.post<{
                        paymentLinkUrl?: string;
                        checkoutError?: string;
                      }>(`${base}/setup-checkout`);
                      if (!data.paymentLinkUrl)
                        throw new Error(
                          data.checkoutError ||
                            "Razorpay did not return a payment link.",
                        );
                      setPaymentLink(data.paymentLinkUrl);
                      setMessage("Payment link generated.");
                    })
                  }
                >
                  Generate payment link
                </Button>
                {paymentLink && (
                  <a
                    className="block break-all text-sm text-primary underline"
                    href={paymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {paymentLink}
                  </a>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        {busy && (
          <p role="status" className="text-sm text-muted-foreground">
            Processing your request…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
