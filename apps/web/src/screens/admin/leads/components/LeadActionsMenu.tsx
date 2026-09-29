import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CalendarPlus,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Button,
  ConfirmDeleteDialog,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "ui";

import { api } from "../../../../common/api";
import { scheduledInputToIso } from "../../../../common/time";
import {
  buildFieldExecutiveLeadPath,
  isFieldExecutivePath,
} from "../../../field-executive/fieldExecutiveRouteContext";
import { ClockTimePicker } from "../assignment/ClockTimePicker";
import { CreateSiteVisitActionDialog } from "../site-visits/CreateSiteVisitActionDialog";

export interface LeadActionTarget {
  id: string;
  name: string;
  mobile?: string;
  requirement?: string;
  ownerId?: string;
  telecallerId?: string;
  fieldExecutiveId?: string;
  preferredProjectId?: string;
}

const followUpTimes = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

export function CreateFollowUpDialog({
  lead,
  open,
  onOpenChange,
  onCreated,
}: {
  lead: LeadActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00 AM");
  const [type, setType] = useState("Call");
  const [nextAction, setNextAction] = useState("");
  const [notes, setNotes] = useState("");
  const createFollowUp = useMutation({
    mutationFn: async () =>
      api.post(`/leads/${lead.id}/follow-ups`, {
        scheduledAt: scheduledInputToIso(date, time),
        followUpType: type,
        assignedToId:
          lead.telecallerId ?? lead.fieldExecutiveId ?? lead.ownerId,
        status: "Scheduled",
        nextAction,
        remarks: notes || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      [
        "leads",
        "dashboard",
        "site-visits",
        "projects",
        "follow-ups",
        "notifications",
        "lead-remarks",
      ].forEach(
        (key) => void queryClient.invalidateQueries({ queryKey: [key] }),
      );
      void queryClient.invalidateQueries({
        queryKey: ["lead-timeline", lead.id],
      });
      toast.success(`Follow-up created for ${lead.name}`);
      onCreated?.();
      onOpenChange(false);
      setDate("");
      setTime("10:00 AM");
      setType("Call");
      setNextAction("");
      setNotes("");
    },
    onError: () => toast.error("Could not create the follow-up"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(92vw,34rem)] max-w-[34rem] flex-col overflow-hidden rounded-[14px] bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="text-xl font-extrabold text-secondary">
            Create Follow-Up
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-muted-foreground">
            Schedule the next CRM action for this lead.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-extrabold text-secondary">{lead.name}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {[lead.mobile, lead.requirement].filter(Boolean).join(" · ") ||
                "Lead record"}
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary">
                Follow-Up Type *
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger
                  aria-label="Follow-up type"
                  className="h-10 rounded-[10px] text-sm font-semibold shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Call", "WhatsApp", "Email", "SMS"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary">
                Follow-Up Date *
              </label>
              <DatePicker
                aria-label="Follow-up date"
                value={date}
                className="h-10 rounded-[10px]"
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary">
                Follow-Up Time *
              </label>
              <ClockTimePicker
                value={time}
                options={followUpTimes}
                widthClassName="h-10 rounded-[10px]"
                onChange={setTime}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary">
                Next Action *
              </label>
              <Input
                aria-label="Next action"
                value={nextAction}
                placeholder="Discuss property options"
                className="h-10 rounded-[10px]"
                onChange={(event) => setNextAction(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-extrabold text-secondary">
                Remarks
              </label>
              <Textarea
                aria-label="Follow-up remarks"
                value={notes}
                placeholder="Context, objections, and expected outcome..."
                className="min-h-[96px] rounded-[10px]"
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[10px] px-5 shadow-none"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-[10px] px-5"
            disabled={
              createFollowUp.isPending || !date || !time || !nextAction.trim()
            }
            onClick={() => createFollowUp.mutate()}
          >
            <CalendarPlus className="size-4" />
            {createFollowUp.isPending ? "Scheduling..." : "Create Follow-Up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LeadActionsMenu({
  lead,
  allowEdit = true,
  allowDelete = true,
  onEdit,
}: {
  lead: LeadActionTarget;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onEdit?: (lead: LeadActionTarget) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [siteVisitOpen, setSiteVisitOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const deleteLead = useMutation({
    mutationFn: async () =>
      (await api.delete(`/leads/${lead.id}`, { data: {} })).data,
    onSuccess: () => {
      toast.success("Lead moved to Deleted Leads");
      setDeleteOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("Could not delete lead"),
  });
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);
  const telecallerRoute = location.pathname.startsWith("/telecaller/");
  const leadDetailsPath = fieldExecutiveRoute
    ? buildFieldExecutiveLeadPath(lead.id)
    : telecallerRoute
    ? `/telecaller/leads/${lead.id}`
    : `/leads/${lead.id}`;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${lead.name}`}
            className="size-8 rounded-md"
          >
            <MoreVertical className="size-4 text-blue-700" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[240px] rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,37,68,0.16)]"
        >
          <DropdownMenuLabel className="px-3 py-2">
            <span className="block text-xs font-extrabold text-secondary">
              {lead.name}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-foreground">
              {lead.mobile ?? lead.id}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
            onSelect={() =>
              navigate(leadDetailsPath, { state: { from: location.pathname } })
            }
          >
            <Eye className="size-4 text-blue-700" /> View
          </DropdownMenuItem>
          {allowEdit ? (
            <DropdownMenuItem
              className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
              onSelect={() =>
                onEdit
                  ? onEdit(lead)
                  : navigate(leadDetailsPath, {
                      state: { from: location.pathname, openEditLead: true },
                    })
              }
            >
              <Pencil className="size-4 text-blue-700" /> Edit
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
            onSelect={() => setSiteVisitOpen(true)}
          >
            <CalendarPlus className="size-4 text-blue-700" /> Create Site Visit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
            onSelect={() => setFollowUpOpen(true)}
          >
            <CalendarPlus className="size-4 text-blue-700" /> Create Follow-Up
          </DropdownMenuItem>
          {allowDelete ? <DropdownMenuSeparator /> : null}
          {allowDelete ? (
            <DropdownMenuItem
              className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-red-600 focus:bg-red-50 focus:text-red-700"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateFollowUpDialog
        lead={lead}
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
      />
      {siteVisitOpen ? (
        <CreateSiteVisitActionDialog
          lead={lead}
          open={siteVisitOpen}
          onOpenChange={setSiteVisitOpen}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete lead?"
        description={`${lead.name} will be moved to Deleted Leads. You can restore it later.`}
        entityName={lead.name}
        confirmLabel="Delete Lead"
        isLoading={deleteLead.isPending}
        onConfirm={() => deleteLead.mutate()}
        onCancel={() => setDeleteOpen(false)}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
