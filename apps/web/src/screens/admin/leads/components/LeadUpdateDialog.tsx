import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SearchableSelect,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "ui";
import { api } from "../../../../common/api";
import { getApiErrorMessage } from "../../../../common/apiError";

interface RemarkNote {
  id: string;
  text?: string | null;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: string | null;
  isPinned?: boolean | null;
}

interface Props {
  selectedLeads: ReadonlyArray<{ id: string; name: string }>;
  children: ReactNode;
  isSaving: boolean;
  canUpdate: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function formatRemarkTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** One update form and read-only history, regardless of the entry point. */
export function LeadUpdateDialog({
  selectedLeads,
  children,
  isSaving,
  canUpdate,
  onClose,
  onSubmit,
}: Props) {
  const [activeTab, setActiveTab] = useState("update");
  const [historyLeadId, setHistoryLeadId] = useState("");
  const historyLead =
    selectedLeads.find((lead) => lead.id === historyLeadId) ?? selectedLeads[0];
  const historyQuery = useQuery({
    queryKey: ["lead-remarks", historyLead?.id],
    enabled: activeTab === "history" && Boolean(historyLead?.id),
    queryFn: async () => {
      const { data } = await api.get<{ notes?: RemarkNote[] }>(
        `/leads/${historyLead?.id}`,
      );
      return data;
    },
  });
  const notes: RemarkNote[] = historyQuery.data?.notes ?? [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!isSaving}
        className="flex h-[88vh] max-h-[88vh] max-w-2xl flex-col overflow-hidden rounded-xl bg-white p-0"
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-secondary">
            Update reminder, status & remark
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            Changing a status or remark requires a follow-up date. Statuses
            configured without follow-ups remain exempt.
          </DialogDescription>
          {selectedLeads.length === 1 ? (
            <p className="break-words text-sm font-semibold text-secondary">
              {selectedLeads[0].name}
            </p>
          ) : null}
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 px-6 pt-4">
            <TabsList
              aria-label="Lead update and remarks history"
              className="grid w-full grid-cols-2"
            >
              <TabsTrigger value="update">Update lead</TabsTrigger>
              <TabsTrigger value="history">Remarks history</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="update" className="mt-0 space-y-4">
              {canUpdate ? (
                children
              ) : (
                <p className="text-sm text-muted-foreground">
                  You have read-only access. Open Remarks history to view
                  previous remarks.
                </p>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-0 space-y-4">
              {selectedLeads.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">View history for</p>
                  <SearchableSelect
                    ariaLabel="Lead for remarks history"
                    value={historyLead?.id ?? ""}
                    onValueChange={setHistoryLeadId}
                    options={selectedLeads.map((lead) => ({
                      value: lead.id,
                      label: lead.name,
                    }))}
                    searchPlaceholder="Search selected leads..."
                    modal={false}
                    portaled={false}
                  />
                </div>
              ) : null}
              {!historyLead ? (
                <p className="text-sm text-muted-foreground">
                  Select a lead to view its remarks history.
                </p>
              ) : historyQuery.isLoading ? (
                <p
                  role="status"
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  Loading remarks history...
                </p>
              ) : historyQuery.isError ? (
                <div className="space-y-3 py-4">
                  <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(
                      historyQuery.error,
                      "Could not load remarks history. Please try again.",
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={historyQuery.isFetching}
                    onClick={() => void historyQuery.refetch()}
                  >
                    {historyQuery.isFetching ? "Loading..." : "Try again"}
                  </Button>
                </div>
              ) : notes.length ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage
                              src={note.authorImage ?? undefined}
                              alt={note.authorName ?? "Team Member"}
                            />
                            <AvatarFallback>
                              {String(note.authorName ?? "TM")
                                .split(" ")
                                .filter(Boolean)
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-extrabold text-secondary">
                              {note.authorName ?? "Team Member"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRemarkTimestamp(note.createdAt)}
                            </p>
                          </div>
                        </div>
                        {note.isPinned ? (
                          <Badge variant="neutral">Pinned</Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-secondary">
                        {note.text?.trim() || "Internal remark"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground">
                  No remarks history available yet.
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onClose}
          >
            Close
          </Button>
          {activeTab === "update" && canUpdate ? (
            <Button type="button" disabled={isSaving} onClick={onSubmit}>
              {isSaving ? "Updating..." : "Update Lead"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
