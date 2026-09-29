import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Phone } from "lucide-react";
import {
  Button,
  Card,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "ui";

import { api } from "../../common/api";
import { scheduledInputToIso } from "../../common/time";
import { ClockTimePicker } from "../admin/leads/assignment/ClockTimePicker";
import { SiteVisitsScreen } from "../admin/leads/site-visits/SiteVisitsScreen";
import { useFieldExecutiveChrome } from "./useFieldExecutiveChrome";
import { useFieldExecutiveLeads } from "./useFieldExecutive";

const toTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
const toDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export function FieldExecutiveLeadsScreen() {
  const [search, setSearch] = useState("");
  const leads = useFieldExecutiveLeads(search);
  useFieldExecutiveChrome({
    activeItem: "My Leads",
    search,
    onSearchChange: setSearch,
    breadcrumbs: <span>My Leads</span>,
  });
  const rows = leads.data?.data ?? [];
  return (
    <main className="space-y-5 p-4 sm:p-6">
      <section>
        <h1 className="text-2xl font-extrabold text-secondary">My Leads</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Leads linked to your assigned site visits.
        </p>
      </section>
      <Card className="overflow-hidden rounded-lg border border-slate-200 shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead>Preferred Location</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((lead: any) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link
                    to={`/field-executive/leads/${lead.id}`}
                    className="font-extrabold text-secondary hover:text-primary"
                  >
                    {lead.name}
                  </Link>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {lead.displayId} · {lead.mobileCountryCode} {lead.mobile}
                  </p>
                </TableCell>
                <TableCell className="font-semibold">
                  {lead.requirement?.configuration ?? "Requirement pending"}
                </TableCell>
                <TableCell>
                  {lead.requirement?.preferredLocation ?? "-"}
                </TableCell>
                <TableCell>
                  {lead.nextFollowUpAt
                    ? `${toDate(lead.nextFollowUpAt)} ${toTime(
                        lead.nextFollowUpAt,
                      )}`
                    : "Not scheduled"}
                </TableCell>
                <TableCell>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link to={`/field-executive/leads/${lead.id}`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!leads.isLoading && !rows.length ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No visit-linked leads found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}

export function FieldExecutiveLeadDetailsScreen() {
  const { leadId = "" } = useParams();
  const lead = useQuery({
    queryKey: ["field-executive", "lead", leadId],
    queryFn: async () => (await api.get(`/leads/${leadId}`)).data,
    enabled: Boolean(leadId),
  });
  useFieldExecutiveChrome({
    activeItem: "My Leads",
    breadcrumbs: <span>My Leads / Lead Context</span>,
  });
  if (lead.isLoading)
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Loading lead context...
      </main>
    );
  if (!lead.data)
    return (
      <main className="p-6 text-sm text-destructive">
        This lead is unavailable for your field handoff.
      </main>
    );
  const data = lead.data;
  return (
    <main className="space-y-5 p-4 sm:p-6">
      <Link
        to="/field-executive/leads"
        className="text-sm font-bold text-primary"
      >
        Back to My Leads
      </Link>
      <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary">
            {data.name}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {data.displayId} · {data.mobileCountryCode} {data.mobile}
          </p>
        </div>
        <Button type="button" asChild>
          <a href={`tel:${data.mobileCountryCode}${data.mobile}`}>
            <Phone className="size-4" /> Call Lead
          </a>
        </Button>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-lg border border-slate-200 p-5 shadow-card">
          <h2 className="font-extrabold text-secondary">Visit Context</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-muted-foreground">
                Configuration
              </dt>
              <dd className="mt-1 font-semibold text-secondary">
                {data.requirement?.configuration ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground">
                Preferred location
              </dt>
              <dd className="mt-1 font-semibold text-secondary">
                {data.requirement?.preferredLocation ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground">
                Budget
              </dt>
              <dd className="mt-1 font-semibold text-secondary">
                {data.requirement?.minBudget ?? "-"} -{" "}
                {data.requirement?.maxBudget ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground">
                Remarks
              </dt>
              <dd className="mt-1 font-semibold text-secondary">
                {data.remarks ?? "-"}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="rounded-lg border border-slate-200 p-5 shadow-card">
          <h2 className="font-extrabold text-secondary">Assigned Visits</h2>
          <div className="mt-4 space-y-3">
            {data.siteVisits?.map((visit: any) => (
              <div key={visit.id} className="rounded-md bg-slate-50 p-3">
                <p className="font-bold text-secondary">
                  {visit.displayId ?? "Site Visit"} ·{" "}
                  {toDate(visit.scheduledAt)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {visit.status} ·{" "}
                  {visit.meetingPoint ?? "Meeting point pending"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

export function FieldExecutiveSiteVisitsScreen() {
  return <SiteVisitsScreen />;
}

function CreateFollowUpDialog({
  leads,
  open,
  onOpenChange,
}: {
  leads: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00 AM");
  const [nextAction, setNextAction] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: async () =>
      api.post(`/leads/${leadId}/follow-ups`, {
        scheduledAt: scheduledInputToIso(date, time),
        followUpType: "Call",
        status: "Scheduled",
        nextAction,
        remarks: notes,
        notes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["field-executive"] });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", "field-executive"],
      });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      void queryClient.invalidateQueries({ queryKey: ["lead-timeline"] });
      void queryClient.invalidateQueries({ queryKey: ["lead-details"] });
      void queryClient.invalidateQueries({ queryKey: ["lead-remarks"] });
      toast.success("Follow-up created");
      onOpenChange(false);
    },
    onError: () => toast.error("Unable to create follow-up"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Follow-Up</DialogTitle>
          <DialogDescription>
            Schedule the next action against a visit-linked lead.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger aria-label="Lead">
              <SelectValue placeholder="Select lead" />
            </SelectTrigger>
            <SelectContent>
              {leads.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.name} · {lead.displayId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker
              aria-label="Follow-up date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <ClockTimePicker
              value={time}
              options={[
                "09:00 AM",
                "10:00 AM",
                "11:00 AM",
                "12:00 PM",
                "01:00 PM",
                "02:00 PM",
                "03:00 PM",
                "04:00 PM",
                "05:00 PM",
              ]}
              onChange={setTime}
            />
          </div>
          <Input
            aria-label="Next action"
            value={nextAction}
            placeholder="Confirm visit outcome"
            onChange={(event) => setNextAction(event.target.value)}
          />
          <Textarea
            aria-label="Remarks"
            value={notes}
            placeholder="Remarks for the next action"
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!leadId || !date || !nextAction || create.isPending}
            onClick={() => create.mutate()}
          >
            <CalendarPlus className="size-4" /> Create Follow-Up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
