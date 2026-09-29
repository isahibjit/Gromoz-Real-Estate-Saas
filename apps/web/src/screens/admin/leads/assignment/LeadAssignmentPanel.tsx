import { useId, useState } from "react";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "ui";

import { ClockTimePicker } from "./ClockTimePicker";
import { FollowUpDatePicker } from "./FollowUpDatePicker";
import type { TelecallerOption } from "./leadAssignmentTypes";
import { useBulkAssignLeadsMutation } from "./useLeadAssignment";

function RadioOption({
  checked,
  name,
  value,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  name: string;
  value: string;
  title: string;
  description?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();

  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        className="mt-0.5 size-4 shrink-0 cursor-pointer"
        onChange={() => onChange(value)}
      />
      <span>
        <span className="block text-[13px] font-extrabold leading-tight text-foreground">
          {title}
        </span>
        {description ? (
          <span className="mt-1 block text-xs font-semibold leading-tight text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function LeadAssignmentPanel({
  selectedCount,
  selectedLeadIds,
  telecallers,
  onClearAll,
}: {
  selectedCount: number;
  selectedLeadIds: string[];
  telecallers: TelecallerOption[];
  onClearAll: () => void;
}) {
  const selectedBadge = `${selectedCount} Selected`;
  const [assignmentMode, setAssignmentMode] = useState("telecaller");
  const [distributionMode, setDistributionMode] = useState("all");
  const [telecallerId, setTelecallerId] = useState("priya-singh");
  const [followUpDate, setFollowUpDate] = useState("03 May 2025");
  const [followUpTime, setFollowUpTime] = useState("11:00 AM");
  const [note, setNote] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const telecallerDisabled = assignmentMode === "auto";
  const selectedTelecaller = telecallers.find(
    (telecaller) => telecaller.id === telecallerId,
  );
  
  const bulkAssignMutation = useBulkAssignLeadsMutation();

  const resetForm = () => {
    setAssignmentMode("telecaller");
    setDistributionMode("all");
    setTelecallerId("priya-singh");
    setFollowUpDate("03 May 2025");
    setFollowUpTime("11:00 AM");
    setNote("");
    setSubmittedMessage("");
  };

  const submitAssignment = () => {
    if (selectedCount === 0) {
      return;
    }

    const assignee =
      assignmentMode === "auto"
        ? "round robin"
        : selectedTelecaller?.name ?? "selected Pre Sales user";

    bulkAssignMutation.mutate(
      {
        leadIds: selectedLeadIds,
        toUserId: assignmentMode === "telecaller" ? telecallerId : "system",
        assigneeId: assignmentMode === "telecaller" ? telecallerId : undefined,
        assigneeType: assignmentMode === "telecaller" ? "telecaller" : undefined,
        strategy: assignmentMode === "auto" ? "round-robin" : undefined,
        reason: note || undefined,
      },
      {
        onSuccess: () => {
          setSubmittedMessage(
            `${selectedCount} lead${
              selectedCount === 1 ? "" : "s"
            } successfully assigned to ${assignee}.`,
          );
        },
        onError: (error) => {
          setSubmittedMessage(`Failed to assign leads: ${error.message}`);
        },
      }
    );
  };

  return (
    <Card className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,37,68,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-foreground">
            Assign Leads
          </h2>
          <Badge className="h-6 border-0 bg-info/10 px-2 text-xs font-extrabold text-info">
            {selectedBadge}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-1 text-xs font-extrabold text-destructive hover:bg-destructive/5"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      </div>
      <div className="mt-5 space-y-6">
        {submittedMessage ? (
          <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{submittedMessage}</span>
          </div>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-xs font-extrabold text-foreground">Assign To</h3>
          <RadioOption
            name="assignment-mode"
            value="auto"
            checked={assignmentMode === "auto"}
            title="Auto Assign (Round Robin)"
            description="Automatically distribute leads equally"
            onChange={setAssignmentMode}
          />
          <RadioOption
            name="assignment-mode"
            value="telecaller"
            checked={assignmentMode === "telecaller"}
            title="Select Pre Sales"
            description="Manually assign to a specific Pre Sales user"
            onChange={setAssignmentMode}
          />
          <div className={cn("space-y-2", telecallerDisabled && "opacity-60")}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-foreground">
                Pre Sales <span className="text-destructive">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
              >
                View Workload
              </Button>
            </div>
            <Select
              value={telecallerId}
              onValueChange={setTelecallerId}
              disabled={telecallerDisabled}
            >
              <SelectTrigger className="h-10 rounded-[8px] text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {telecallers.map((telecaller) => (
                  <SelectItem key={telecaller.id} value={telecaller.id}>
                    {telecaller.name} ({telecaller.assignedLeads} Leads)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-extrabold text-foreground">
            Lead Distribution{" "}
            <Info className="size-3.5 text-muted-foreground" />
          </h3>
          <RadioOption
            name="distribution-mode"
            value="all"
            checked={distributionMode === "all"}
            title={`Assign All Selected Leads (${selectedCount})`}
            onChange={setDistributionMode}
          />
          <RadioOption
            name="distribution-mode"
            value="custom"
            checked={distributionMode === "custom"}
            title="Custom Distribution"
            onChange={setDistributionMode}
          />
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-extrabold text-foreground">
            Follow-up Settings{" "}
            <Info className="size-3.5 text-muted-foreground" />
          </h3>
          <label className="text-xs font-extrabold text-foreground">
            First Follow-up Date
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FollowUpDatePicker
              value={followUpDate}
              onChange={setFollowUpDate}
            />
            <ClockTimePicker
              value={followUpTime}
              onChange={setFollowUpTime}
              options={[
                "09:00 AM",
                "10:00 AM",
                "11:00 AM",
                "12:00 PM",
                "03:00 PM",
                "06:00 PM",
              ]}
            />
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Follow-up task will be created automatically
          </p>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-extrabold text-foreground">
            Assignment Note{" "}
            <span className="font-semibold text-muted-foreground">
              (Optional)
            </span>
          </label>
          <Textarea
            value={note}
            placeholder="Enter note here..."
            className="min-h-[74px] resize-none rounded-[8px] text-sm"
            onChange={(event) => setNote(event.target.value)}
          />
        </section>
      </div>
      <div className="mt-5 grid grid-cols-[0.9fr_1.7fr] gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-[8px] font-extrabold"
          onClick={resetForm}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={selectedCount === 0 || bulkAssignMutation.isPending}
          className="h-11 rounded-[8px] bg-gradient-to-r from-primary to-primary-hover font-extrabold"
          onClick={submitAssignment}
        >
          {bulkAssignMutation.isPending ? "Assigning..." : "Assign Leads"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
