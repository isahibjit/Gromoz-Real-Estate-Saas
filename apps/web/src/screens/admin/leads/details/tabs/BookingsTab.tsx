import { displayReference } from "../../../../../common/displayReference";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  IndianRupee,
  MoreVertical,
  Pencil,
  Plus,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";

import {
  CreateBookingDialog,
  type CreateBookingDialogDefaults,
} from "../../../bookings/CreateBookingDialog";
import {
  canConfirmBooking,
  formatBookingAmount,
  getBookingMutationErrorMessage,
  isBookingUnitBlocked,
  useBookingMutations,
  useLeadBookings,
  type BookingStatus,
  type BookingWorkspaceRow,
} from "../../../bookings/useBookings";
import { useSiteVisitOptions } from "../../site-visits/useSiteVisits";
import type { LeadDetailsData } from "../leadDetailsTypes";

const statusClass: Record<string, string> = {
  Scheduled: "bg-blue-50 text-blue-700",
  Booked: "bg-green-50 text-success",
  Cancelled: "bg-red-50 text-red-700",
};

function BookingStatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
  tone: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-extrabold text-secondary sm:text-2xl">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md sm:size-11",
            tone,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

export function BookingsTab({
  data,
  leadId,
}: {
  data: LeadDetailsData;
  leadId: string;
}) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBooking, setEditingBooking] =
    useState<BookingWorkspaceRow | null>(null);
  const bookingsQuery = useLeadBookings(leadId);
  const optionsQuery = useSiteVisitOptions();
  const bookingMutations = useBookingMutations();
  const rows = bookingsQuery.data ?? [];
  const confirmedValue = rows
    .filter((row) => row.status === "Booked")
    .reduce((sum, row) => sum + row.amount, 0);
  const scheduled = rows.filter((row) => row.status === "Scheduled").length;
  const confirmed = rows.filter((row) => row.status === "Booked").length;
  const cancelled = rows.filter((row) => row.status === "Cancelled").length;
  const primaryMatchingProject =
    data.matchingProjects?.find((project) => project.matchScore > 0) ??
    data.matchingProjects?.[0];
  const requirementValue = (label: string) => {
    const value = data.requirements.find((item) => item.label === label)?.value;
    return value && !value.toLowerCase().includes("not ") ? value : undefined;
  };
  const bookingEditDefaults = (
    booking: BookingWorkspaceRow,
  ): CreateBookingDialogDefaults => ({
    bookingId: booking.id,
    status: booking.status,
    projectId: booking.projectId,
    unitId: booking.unitId,
    flatNo: booking.flatNo,
    bookingAmount: String(booking.bookingAmount || booking.amount || ""),
    agreementValue: booking.agreementValue
      ? String(booking.agreementValue / 100000)
      : "",
    agreementValueUnit: "Lakh",
    bookingDate: booking.bookingDate,
    notes: booking.remarks,
    preferredProjectName: booking.projectName,
    preferredLocation: booking.projectLocation,
    preferredConfiguration: booking.configuration,
    baseBrokerageAmount: booking.brokerage?.baseAmount,
    ladderBrokerageAmount: booking.brokerage?.ladderAmount,
    aopBrokerageAmount: booking.brokerage?.aopAmount,
  });

  const updateStatus = async (
    booking: (typeof rows)[number],
    status: BookingStatus,
  ) => {
    if (status === "Booked" && !canConfirmBooking(booking)) {
      toast.error(
        "This unit is already booked or sold. Select another unit before confirming.",
      );
      return;
    }

    try {
      await bookingMutations.updateBooking.mutateAsync({
        leadId,
        bookingId: booking.id,
        status,
      });
      toast.success(
        status === "Booked"
          ? "Booking confirmed and unit blocked."
          : "Booking updated.",
      );
    } catch (error) {
      toast.error(
        getBookingMutationErrorMessage(
          error,
          status === "Booked"
            ? "Could not confirm booking"
            : "Could not update booking",
        ),
      );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold text-secondary">Bookings</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Scheduled reservations and confirmed inventory handoffs for this
            lead.
          </p>
        </div>
        <Button
          type="button"
          className="h-10 rounded-md px-5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Schedule booking
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        <BookingStatCard
          label="Scheduled"
          value={String(scheduled)}
          icon={CalendarCheck}
          tone="bg-blue-50 text-blue-700"
        />
        <BookingStatCard
          label="Confirmed"
          value={String(confirmed)}
          icon={CheckCircle2}
          tone="bg-green-50 text-success"
        />
        <BookingStatCard
          label="Cancelled"
          value={String(cancelled)}
          icon={XCircle}
          tone="bg-red-50 text-red-700"
        />
        <BookingStatCard
          label="Confirmed Value"
          value={formatBookingAmount(confirmedValue)}
          icon={IndianRupee}
          tone="bg-orange-50 text-primary"
        />
      </div>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
        <Table className="min-w-[920px]">
          <TableHeader className="bg-slate-50/70 text-[11px] font-extrabold text-secondary">
            <TableRow>
              <TableHead className="px-4 py-3">Booking</TableHead>
              <TableHead className="px-4 py-3">Project & Unit</TableHead>
              <TableHead className="px-4 py-3">Date</TableHead>
              <TableHead className="px-4 py-3">Amount</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                >
                  No bookings have been scheduled for this lead.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-slate-50/60">
                  <TableCell className="px-4 py-3">
                    <p className="text-xs font-extrabold text-secondary">
                      {displayReference(booking.id, "Booking")}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      {booking.status === "Booked"
                        ? "Confirmed booking"
                        : "Scheduled reservation"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-xs font-extrabold text-secondary">
                      {booking.projectName ?? "Project"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      {booking.unitLabel ?? "Unit pending"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                    {new Date(booking.bookingDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {formatBookingAmount(booking.amount)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 px-3 py-1 text-xs font-extrabold",
                        statusClass[booking.status],
                      )}
                    >
                      {booking.status === "Booked"
                        ? "Confirmed"
                        : booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-auto size-8 rounded-md"
                        >
                          <MoreVertical className="size-4 text-blue-700" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuLabel>Booking Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setEditingBooking(booking)}
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit Booking
                        </DropdownMenuItem>
                        {booking.projectId ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate(`/projects/${booking.projectId}`)
                            }
                          >
                            Open Project
                          </DropdownMenuItem>
                        ) : null}
                        {booking.projectId && booking.unitId ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate(
                                `/projects/${booking.projectId}/inventory/${booking.unitId}`,
                              )
                            }
                          >
                            Open Unit
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        {booking.status === "Scheduled" ? (
                          canConfirmBooking(booking) ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                void updateStatus(booking, "Booked")
                              }
                            >
                              Confirm Booking
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              {isBookingUnitBlocked(booking)
                                ? "Unit already booked/sold"
                                : "Confirm unavailable"}
                            </DropdownMenuItem>
                          )
                        ) : null}
                        <DropdownMenuItem
                          disabled={booking.status === "Cancelled"}
                          onSelect={() =>
                            void updateStatus(booking, "Cancelled")
                          }
                        >
                          Cancel Booking
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateBookingDialog
        open={createOpen}
        lead={{
          id: leadId,
          name: data.profile.name,
          mobile: data.profile.phone,
        }}
        defaults={{
          projectId:
            primaryMatchingProject?.projectId ?? data.preferredProjectId,
          preferredProjectName:
            primaryMatchingProject?.name ??
            requirementValue("Preferred Project"),
          preferredLocation:
            primaryMatchingProject?.location ??
            requirementValue("Preferred Location"),
          preferredConfiguration:
            primaryMatchingProject?.configuration ??
            requirementValue("Configuration"),
          preferredBudget: primaryMatchingProject?.priceRange,
          preferredProjectImage: primaryMatchingProject?.imageUrl,
        }}
        projects={optionsQuery.data?.projects ?? []}
        onOpenChange={setCreateOpen}
        onCreated={() => void bookingsQuery.refetch()}
      />
      {editingBooking ? (
        <CreateBookingDialog
          open={Boolean(editingBooking)}
          lead={{
            id: leadId,
            name: data.profile.name,
            mobile: data.profile.phone,
          }}
          defaults={bookingEditDefaults(editingBooking)}
          projects={optionsQuery.data?.projects ?? []}
          onOpenChange={(open) => {
            if (!open) setEditingBooking(null);
          }}
          onCreated={() => {
            setEditingBooking(null);
            void bookingsQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
