import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "ui";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  LifeBuoy,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api } from "../../common/api";
import { getApiErrorMessage } from "../../common/apiError";
import { currentOrganizationId } from "../../common/tenantRequestScope";
import type { BillingOverview } from "./workspace.types";
import { AddSeatsDialog } from "./AddSeatsDialog";
import { PaymentHistory } from "./PaymentHistory";
import { CreateTicketDialog, SupportTickets } from "./SupportTickets";
import { dateLabel, moneyLabel } from "./WorkspaceControls";
export function BillingOverviewScreen() {
  const organizationId = currentOrganizationId(),
    client = useQueryClient();
  const [seatsOpen, setSeatsOpen] = useState(false),
    [ticketKind, setTicketKind] = useState<"support" | "plan" | null>(null);
  const [tab, setTab] = useState("overview");
  const query = useQuery({
    queryKey: ["billing-overview", organizationId],
    queryFn: async () =>
      (await api.get<BillingOverview>("/billing/overview")).data,
    retry: false,
  });
  if (query.isPending)
    return (
      <div
        role="status"
        aria-label="Loading subscription workspace"
        className="space-y-5 animate-pulse"
      >
        <div className="h-8 w-64 max-w-full rounded-lg bg-muted" />
        <div className="h-56 rounded-xl border border-border bg-muted/50" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-48 rounded-xl bg-muted/50" />
          <div className="h-48 rounded-xl bg-muted/50" />
        </div>
        <span className="sr-only">Loading subscription workspace...</span>
      </div>
    );
  if (query.isError || !query.data)
    return (
      <Card className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Subscription & support</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {getApiErrorMessage(
            query.error,
            "Could not load the subscription workspace.",
          )}
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Card>
    );
  const data: BillingOverview = query.data;
  const needsAction =
    data.expiryState === "EXPIRED" || data.expiryState === "DUE_SOON";
  const availablePlans = data.availablePlans.filter(
    (plan) => plan.code !== data.planTier,
  );
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4" />
            {data.name}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Subscription & support
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan, people, payments, and a direct line to Gromoze.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </header>
      {needsAction && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">
                {data.expiryState === "EXPIRED"
                  ? `${
                      data.isTrial
                        ? "Your trial has ended"
                        : "Your subscription is past due"
                    }`
                  : `${data.isTrial ? "Trial ends" : "Renewal due"} in ${
                      data.daysRemaining
                    } day${data.daysRemaining === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dateLabel(data.expiresAt)} - Review your subscription and
                contact Gromoze for renewal assistance.
              </p>
            </div>
          </div>
          <Button onClick={() => setTicketKind("support")}>
            Request renewal assistance
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:h-10 sm:w-auto"
          aria-label="Subscription workspace sections"
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment history</TabsTrigger>
          <TabsTrigger value="support">Support tickets</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-5">
          <Card className="overflow-hidden">
            <div className="grid lg:grid-cols-3">
              <div className="space-y-5 p-6 lg:col-span-2 lg:border-r lg:border-border">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Current plan
                  </p>
                  <Badge
                    variant={
                      data.expiryState === "EXPIRED"
                        ? "warning"
                        : data.isTrial
                        ? "info"
                        : "neutral"
                    }
                  >
                    {data.expiryState === "EXPIRED"
                      ? "Action required"
                      : data.isTrial
                      ? "Trial"
                      : data.status === "ACTIVE"
                      ? "Active subscription"
                      : data.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-secondary">
                    {data.planName}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {moneyLabel(data.pricePerSeatMonth)} per seat / month -{" "}
                    {data.allocatedSeats} licensed seats
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={!availablePlans.length}
                    onClick={() => setTicketKind("plan")}
                  >
                    Request plan change
                    <ArrowUpRight className="size-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setSeatsOpen(true)}>
                    <Plus className="size-4" />
                    Add user seats
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Plan changes are reviewed by Gromoze. You will receive
                  confirmed pricing before any change.
                </p>
              </div>
              <div className="bg-muted/20 p-6">
                <CalendarClock className="size-6 text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {data.isTrial ? "Trial expiry" : "Renewal date"}
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {dateLabel(data.expiresAt)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.daysRemaining === null
                    ? "Contact support to confirm your subscription period."
                    : data.expiryState === "EXPIRED"
                    ? "Renewal requires your attention."
                    : `${data.daysRemaining} days remaining`}
                </p>
                <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <Mail className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Reminder emails at 14, 7, 3 and 1 days before expiry.
                  </span>
                </div>
              </div>
            </div>
          </Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Users className="size-5 text-primary" />
                <h2 className="font-semibold">Workspace seats</h2>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold">
                  {data.activeMembersCount}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {data.allocatedSeats} seats in use
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Seat utilization"
                aria-valuenow={data.activeMembersCount}
                aria-valuemin={0}
                aria-valuemax={Math.max(
                  data.allocatedSeats,
                  data.activeMembersCount,
                )}
                className="mt-4 h-2 overflow-hidden rounded-lg bg-muted"
              >
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(
                      100,
                      (data.activeMembersCount /
                        Math.max(1, data.allocatedSeats)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {data.remainingSeats} seats available -{" "}
                {data.pendingInvitations} reserved for pending invitations.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => setSeatsOpen(true)}
              >
                Manage seats
              </Button>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Workspace contact</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/settings">Edit details</Link>
                </Button>
              </div>
              <p className="mt-5 font-medium">
                {data.contact.ownerName || "Workspace owner"}
              </p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {data.contact.ownerEmail || "Owner email not configured"}
              </p>
              <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                <p className="flex items-center gap-2 break-all">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  {data.contact.email || "Company email not configured"}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  {data.contact.phone || "Company phone not configured"}
                </p>
              </div>
            </Card>
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <LifeBuoy className="size-5 text-primary" />
              <div>
                <h2 className="font-semibold">
                  Need a hand with your workspace?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a support ticket and track its progress here.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setTicketKind("support")}>
              Contact Gromoze
            </Button>
          </Card>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Subscription and support details are available to workspace owners
            and administrators.
          </p>
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentHistory />
        </TabsContent>
        <TabsContent value="support" className="mt-6">
          <SupportTickets onCreate={() => setTicketKind("support")} />
        </TabsContent>
      </Tabs>
      <AddSeatsDialog
        open={seatsOpen}
        onOpenChange={setSeatsOpen}
        onPurchased={() => toast.success("User seats added successfully")}
      />
      <CreateTicketDialog
        kind={ticketKind}
        plans={availablePlans}
        onClose={() => setTicketKind(null)}
        onCreated={() => {
          void client.invalidateQueries({
            queryKey: ["support-tickets", organizationId],
          });
          setTab("support");
          toast.success("Your request has been saved.");
        }}
      />
    </div>
  );
}
