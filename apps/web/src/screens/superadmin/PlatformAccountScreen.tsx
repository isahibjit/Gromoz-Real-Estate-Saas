import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, Card } from "ui";
import { PageHeader, WorkspacePage } from "../../components/layout/PageHeader";
import { api } from "../../common/api";
import { queryKeys } from "../../common/queryKeys";
import { getSessionUser } from "../../common/services/auth.api";
import { getUserRoleLabel } from "../../common/roleLabels";

export function PlatformAccountScreen() {
  const account = useQuery({
    queryKey: queryKeys.auth.sessionUser,
    queryFn: getSessionUser,
  });
  const security = useQuery<{ role: string; enabled: boolean }[]>({
    queryKey: ["auth", "two-factor-settings"],
    queryFn: async () =>
      (
        await api.get<{ data: { role: string; enabled: boolean }[] }>(
          "/auth/two-factor-settings",
        )
      ).data.data,
  });
  const twoFactor = security.data?.find(
    (setting: { role: string; enabled: boolean }) =>
      setting.role === "SUPER_ADMIN",
  );

  return (
    <WorkspacePage>
      <PageHeader
        title="Platform account"
        subtitle="Your administrator identity and platform access."
      />
      {account.isError ? (
        <p role="alert">
          Unable to load your account. Please refresh and try again.
        </p>
      ) : (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">My profile</h2>
          {account.isPending ? (
            <p role="status">Loading account…</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd>{account.data.fullName || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="break-all">{account.data.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd>
                  {account.data.role === "SUPER_ADMIN"
                    ? "Platform Super Admin"
                    : getUserRoleLabel(account.data.role)}
                </dd>
              </div>
            </dl>
          )}
        </Card>
      )}
      <Card id="security" className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">
          Security and access
        </h2>
        <p className="text-sm text-muted-foreground">
          Your platform account manages organizations independently of their
          employee records. Select a workspace only when inspecting that
          customer&apos;s CRM.
        </p>
        {security.isError ? (
          <p role="alert">Unable to load the platform sign-in policy.</p>
        ) : (
          <p className="text-sm">
            Role-based two-factor authentication:{" "}
            {security.isPending
              ? "Loading…"
              : twoFactor?.enabled
              ? "Required"
              : "Not required"}
            .
          </p>
        )}
        <Button asChild variant="outline">
          <Link to="/superadmin/tenants">Manage workspaces</Link>
        </Button>
      </Card>
    </WorkspacePage>
  );
}
