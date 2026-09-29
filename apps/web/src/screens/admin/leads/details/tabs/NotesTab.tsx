import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../../common/api";
import { scheduledInputToIso } from "../../../../../common/time";
import { useLeadListFilterOptions } from "../../all/useAllLeads";
import { ClockTimePicker } from "../../assignment/ClockTimePicker";
import toast from "react-hot-toast";
import {
  Filter,
  History,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pin,
  Plus,
  Search,
  Send,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SearchableSelect,
  Textarea,
} from "ui";
import type { LeadDetailsData, NoteItem } from "../leadDetailsTypes";
import { Panel } from "./OverviewTab";

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

function NotesStatsCards({ notes }: { notes: NoteItem[] }) {
  const total = notes.length;
  const pinned = notes.filter((n) => n.isPinned).length;

  const stats = [
    {
      label: "Total Notes",
      value: total,
      icon: MessageSquare,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      label: "Pinned Notes",
      value: pinned,
      icon: Pin,
      tone: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Panel key={stat.label} title="">
            <div className="-mt-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-secondary">
                  {stat.value}
                </p>
              </div>
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-md ${stat.tone}`}
              >
                <Icon className="h-6 w-6" />
              </span>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function RemarkHistoryPanel({ notes }: { notes: NoteItem[] }) {
  if (!notes.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
        <History className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm font-semibold text-muted-foreground">
          No remarks yet
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {notes.slice(0, 10).map((note) => (
        <div
          key={note.id}
          className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={note.avatarUrl} alt={note.author} />
              <AvatarFallback className="bg-blue-50 text-xs text-blue-700">
                {note.author.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-extrabold text-secondary">
              {note.author}
            </span>
            <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
              {note.date}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-secondary">
            {note.text}
          </p>
        </div>
      ))}
    </div>
  );
}

function CreateRemarkModal({
  open,
  onOpenChange,
  leadId,
  notes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  notes: NoteItem[];
}) {
  const queryClient = useQueryClient();
  const filterOptionsQuery = useLeadListFilterOptions();

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00 AM");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("");
  const [selectedConfiguration, setSelectedConfiguration] = useState("");
  const [remark, setRemark] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const budgetSearchOptions = filterOptionsQuery.options.budgetOptions.map(
    (option) => ({
      label: option.label,
      value: option.value,
    }),
  );

  const configurationSearchOptions =
    filterOptionsQuery.options.configurationOptions.map((option) => ({
      label: option.label,
      value: option.value,
    }));

  const resetForm = () => {
    setFollowUpDate("");
    setFollowUpTime("10:00 AM");
    setSelectedBudgetRange("");
    setSelectedConfiguration("");
    setRemark("");
    setShowHistory(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedRemark = remark.trim();
      if (!trimmedRemark) throw new Error("Remark is required");

      const payload: Record<string, string> = {
        remarks: trimmedRemark,
      };

      if (followUpDate) {
        try {
          payload.nextFollowUpAt = scheduledInputToIso(
            followUpDate,
            followUpTime,
          );
        } catch {
          throw new Error("Select a valid follow-up date and time");
        }
      }

      if (selectedBudgetRange) {
        payload.budgetRange = selectedBudgetRange;
      }

      if (selectedConfiguration) {
        payload.configuration = selectedConfiguration;
      }

      // Patch lead with remark + optional fields
      await api.patch(`/leads/${leadId}`, payload);

      // Also create a note entry for the remark
      await api.post(`/leads/${leadId}/notes`, {
        text: trimmedRemark,
        isPinned: false,
      });
    },
    onSuccess: () => {
      toast.success("Remark added successfully");
      resetForm();
      onOpenChange(false);
      void queryClient.invalidateQueries({
        queryKey: ["lead-details", leadId],
      });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["lead-details"] });
    },
    onError: (err: any) => {
      toast.error(
        err.message ?? err.response?.data?.message ?? "Failed to add remark",
      );
    },
  });

  const handleSubmit = () => {
    if (!remark.trim()) {
      toast.error("Enter a remark before saving");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden rounded-xl bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-extrabold text-secondary">
                Update reminder, status & remark
              </DialogTitle>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Changing a status or remark requires a follow-up date. Statuses
                configured without follow-ups remain exempt.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 rounded-md px-3 text-xs font-extrabold shadow-none"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
              {showHistory ? "Hide History" : "Remark History"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {showHistory ? (
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-secondary">
                Recent remarks
              </p>
              <RemarkHistoryPanel notes={notes} />
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Showing up to 10 most recent remarks.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <p className="text-xs font-extrabold text-secondary">
                  Follow-up reminder
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Required when you change status or remark. These details
                  create the next follow-up.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Follow-up date
                  </span>
                  <DatePicker
                    aria-label="Follow-up date"
                    value={followUpDate}
                    className="h-11 bg-white"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setFollowUpDate(event.target.value)
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Follow-up time
                  </span>
                  <ClockTimePicker
                    value={followUpTime}
                    options={followUpTimes}
                    widthClassName="w-full bg-white"
                    onChange={setFollowUpTime}
                  />
                </label>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Budget
              </span>
              <SearchableSelect
                value={selectedBudgetRange}
                onValueChange={setSelectedBudgetRange}
                options={budgetSearchOptions}
                placeholder="Select budget"
                searchPlaceholder="Search budgets..."
                noOptionsText="No budget ranges found"
                className="h-11 bg-white"
                modal={false}
                portaled={false}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Configuration
              </span>
              <SearchableSelect
                value={selectedConfiguration}
                onValueChange={setSelectedConfiguration}
                options={configurationSearchOptions}
                placeholder="Select configuration"
                searchPlaceholder="Search configurations..."
                noOptionsText="No configurations found"
                className="h-11 bg-white"
                modal={false}
                portaled={false}
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-extrabold text-secondary">
                Remark
              </span>
              <Textarea
                value={remark}
                onChange={(event) => setRemark(event.currentTarget.value)}
                placeholder="Enter new remark..."
                className="min-h-20 bg-white"
              />
            </label>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            This lead will receive the filled updates.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={handleSubmit}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Update Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NotesFeed({ notes }: { notes: NoteItem[] }) {
  return (
    <Panel title="Internal Notes">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-md px-3 text-xs font-extrabold shadow-none"
        >
          <Filter className="h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-muted-foreground">
            No notes found.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="relative rounded-md border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
            >
              {note.isPinned && (
                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600 shadow-sm">
                  <Pin className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={note.avatarUrl} alt={note.author} />
                    <AvatarFallback className="bg-blue-50 text-blue-700">
                      {note.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      {note.author}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {note.authorRole}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {note.date}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-secondary"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-sm font-semibold leading-relaxed text-secondary">
                {note.text}
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

export function NotesTab({
  data,
  leadId,
}: {
  data: LeadDetailsData;
  leadId: string;
}) {
  const notes = data.fullNotesList || [];
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <NotesStatsCards notes={notes} />

      <div className="flex justify-end">
        <Button
          className="h-10 gap-2 rounded-md px-4 text-sm font-extrabold"
          onClick={() => setRemarkModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Remark
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <NotesFeed notes={notes} />
      </div>

      <CreateRemarkModal
        open={remarkModalOpen}
        onOpenChange={setRemarkModalOpen}
        leadId={leadId}
        notes={notes}
      />
    </div>
  );
}
