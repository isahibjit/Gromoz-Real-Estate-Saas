import { displayReference } from "../../../../common/displayReference";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  History,
  Info,
  LifeBuoy,
  MoreVertical,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Input,
  Progress,
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
  cn,
} from "ui";

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../assignment/leadAssignmentData";
import {
  approvalSteps,
  currentOwnerWorkload,
  newOwnerWorkload,
  ownerOptions,
  reassignmentRules,
  reasonOptions,
  recentReassignments,
  reassignFeatureCards,
  selectableLeads,
  suggestedReasons,
  successNotice,
  supportActions,
} from "./reassignLeadsData";
import type { OwnerWorkload } from "./reassignLeadsTypes";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SidebarFooter() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">Need Help?</p>
            <p className="text-xs font-semibold text-white/75">
              Contact Support
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <p className="text-sm font-extrabold">Trueroot Realty CRM</p>
        <p className="mt-1 text-sm font-bold text-[#ffc78f]">Premium Plan</p>
        <p className="mt-3 text-xs font-semibold text-white/75">
          Valid till 31 Dec 2025
        </p>
        <Button
          type="button"
          className="mt-4 h-10 w-full rounded-md bg-primary text-sm font-bold text-white hover:bg-primary/90"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}



function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function FeatureCards() {
  return (
    <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {reassignFeatureCards.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card
            key={feature.title}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-card"
          >
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                  feature.tone,
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-secondary">
                    {feature.title}
                  </p>
                  {feature.badge ? (
                    <Badge className="border-0 bg-green-50 text-success">
                      {feature.badge}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {feature.helper}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function SearchableLeadPicker() {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "TR001245",
    "TR001244",
    "TR001243",
  ]);
  const [open, setOpen] = useState(false);
  const selectedLeads = selectableLeads.filter((lead) =>
    selectedIds.includes(lead.id),
  );
  const filteredLeads = selectableLeads.filter((lead) => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      !normalizedQuery ||
      lead.name.toLowerCase().includes(normalizedQuery) ||
      lead.id.toLowerCase().includes(normalizedQuery) ||
      lead.mobile.toLowerCase().includes(normalizedQuery) ||
      lead.project.toLowerCase().includes(normalizedQuery) ||
      lead.stage.toLowerCase().includes(normalizedQuery)
    );
  });
  const toggleLead = (leadId: string) => {
    setSelectedIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId],
    );
    setQuery("");
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-extrabold text-secondary">
        Select Leads <span className="text-red-500">*</span>
      </span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          aria-label="Search and select leads"
          value={query}
          placeholder={
            selectedLeads.length > 0
              ? "Search more leads..."
              : "Search leads by name, ID, phone, project..."
          }
          className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-9 text-sm font-bold text-secondary outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-card">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left hover:bg-slate-50",
                    selectedIds.includes(lead.id) && "bg-blue-50",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleLead(lead.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-secondary">
                      {lead.name}
                    </span>
                    <span className="block truncate text-xs font-semibold text-muted-foreground">
                      {displayReference(lead.id, "Lead")} | {lead.mobile} | {lead.project}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge className="border-0 bg-blue-50 text-blue-700">
                      {lead.stage}
                    </Badge>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border border-slate-200",
                        selectedIds.includes(lead.id) &&
                          "border-blue-600 bg-blue-600 text-white",
                      )}
                    >
                      {selectedIds.includes(lead.id) ? (
                        <Check className="h-3 w-3" />
                      ) : null}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className=" py-2 text-xs font-semibold text-muted-foreground">
                No leads found
              </p>
            )}
          </div>
        ) : null}
      </div>
      {selectedLeads.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
          {selectedLeads.map((lead) => (
            <span
              key={lead.id}
              className="inline-flex max-w-full items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs font-extrabold text-secondary shadow-sm"
            >
              <span className="truncate">{lead.name}</span>
              <button
                type="button"
                aria-label={`Remove ${lead.name}`}
                className="rounded text-muted-foreground hover:text-red-500"
                onClick={() => toggleLead(lead.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex justify-between rounded-md bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700">
        <span>{selectedLeads.length} Leads Selected</span>
        <span>Preview Leads</span>
      </div>
    </div>
  );
}

function ReassignForm() {
  return (
    <Panel title="Select Leads & Reassign">
      <div className="grid gap-4 xl:grid-cols-4">
        <SearchableLeadPicker />
        <label className="space-y-2">
          <span className="text-xs font-extrabold text-secondary">
            Current Owner
          </span>
          <Select defaultValue="rahul-sharma">
            <SelectTrigger className="h-11 rounded-md text-sm font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ownerOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs font-extrabold text-red-500">3 Leads</p>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-extrabold text-secondary">
            New Owner <span className="text-red-500">*</span>
          </span>
          <Select>
            <SelectTrigger className="h-11 rounded-md text-sm font-bold shadow-none">
              <SelectValue placeholder="Select new owner" />
            </SelectTrigger>
            <SelectContent>
              {ownerOptions
                .filter((option) => option.id !== "rahul-sharma")
                .map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-extrabold text-secondary">
            Reassign Reason <span className="text-red-500">*</span>
          </span>
          <Select>
            <SelectTrigger className="h-11 rounded-md text-sm font-bold shadow-none">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {reasonOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <label className="space-y-2">
          <span className="text-xs font-extrabold text-secondary">
            Additional Notes (Optional)
          </span>
          <div className="relative">
            <Textarea
              className="min-h-[72px] rounded-md pr-14 text-sm font-semibold"
              placeholder="Add notes about this reassignment..."
              maxLength={300}
            />
            <span className="absolute bottom-3 right-3 text-xs font-bold text-muted-foreground">
              0/300
            </span>
          </div>
        </label>
        <div className="rounded-md bg-slate-50 p-4">
          <p className="mb-2 text-xs font-extrabold text-secondary">
            Effective Date & Time
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Select defaultValue="date">
              <SelectTrigger className="h-11 rounded-md text-sm font-bold shadow-none">
                <CalendarDays className="h-4 w-4 text-blue-700" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">May 20, 2025</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="time">
              <SelectTrigger className="h-11 rounded-md text-sm font-bold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">10:30 AM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 rounded-md border border-orange-200 bg-orange-50 p-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex items-center gap-2 text-xs font-bold text-primary">
          <Info className="h-4 w-4" />
          This reassignment will require approval from your manager before it is
          completed.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md border-blue-500 px-8 text-sm font-extrabold text-blue-700 shadow-none"
          >
            Preview Impact
          </Button>
          <Button
            type="button"
            className="h-10 rounded-md bg-primary px-8 text-sm font-extrabold text-white hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            Submit for Approval
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function WorkloadOwnerCard({ owner }: { owner: OwnerWorkload }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-blue-700">
            {owner.name}{" "}
            <span className="text-muted-foreground">({owner.role})</span>
          </p>
          <p className="mt-2 text-3xl font-extrabold text-secondary">
            {owner.totalLeads}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              Total Leads
            </span>
          </p>
        </div>
        <Avatar className="h-14 w-14">
          <AvatarImage src={owner.avatarUrl} alt={owner.name} />
          <AvatarFallback>{initials(owner.name)}</AvatarFallback>
        </Avatar>
      </div>
      <div className="space-y-2">
        {owner.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[10px_1fr_48px_48px] items-center gap-2 text-xs"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="font-semibold text-secondary">{row.label}</span>
            <span className="text-right font-extrabold text-secondary">
              {row.value}
            </span>
            <span className="text-right font-semibold text-muted-foreground">
              ({row.percent})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkloadAnalysis() {
  const NoticeIcon = successNotice.icon;
  return (
    <Panel
      title="Workload Analysis"
      action={
        <div className="rounded-md border border-slate-200 p-1">
          <Button
            type="button"
            variant="navy"
            size="sm"
            className="h-8 rounded px-3 text-xs"
          >
            Chart View
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded px-3 text-xs text-blue-700"
          >
            Table View
          </Button>
        </div>
      }
    >
      <p className="-mt-3 mb-4 text-xs font-semibold text-muted-foreground">
        Compare workload before and after reassignment
      </p>
      <div className="grid items-center gap-5 xl:grid-cols-[1fr_120px_1fr]">
        <WorkloadOwnerCard owner={currentOwnerWorkload} />
        <div className="grid place-items-center gap-2">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_55%,#8b5cf6_55%_100%)]">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
              <span className="text-2xl font-extrabold text-secondary">25</span>
              <span className="-mt-3 text-[10px] font-bold text-muted-foreground">
                Leads to be moved
              </span>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-700" />
        </div>
        <WorkloadOwnerCard owner={newOwnerWorkload} />
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-md border border-green-100 bg-green-50 p-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex items-center gap-2 text-xs font-bold text-success">
          <NoticeIcon className="h-4 w-4" />
          <span>
            <strong>{successNotice.title}</strong>
            <br />
            {successNotice.helper}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-md px-6 text-xs font-extrabold shadow-none"
        >
          View Details
        </Button>
      </div>
    </Panel>
  );
}

function ApprovalWorkflow() {
  return (
    <Panel title="Approval Workflow">
      <div className="space-y-4">
        {approvalSteps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "grid grid-cols-[36px_28px_minmax(0,1fr)_auto] gap-3 rounded-md p-3",
              step.status === "active" &&
                "border border-orange-200 bg-orange-50",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold",
                step.status === "done"
                  ? "bg-success text-white"
                  : step.status === "active"
                  ? "bg-primary text-white"
                  : "bg-slate-200 text-white",
              )}
            >
              {step.status === "done" ? <Check className="h-4 w-4" /> : step.id}
            </span>
            <span className="pt-1 text-sm font-extrabold text-secondary">
              {step.id}
            </span>
            <div>
              <p className="text-sm font-extrabold text-secondary">
                {step.title}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {step.helper}
              </p>
            </div>
            {step.status === "active" ? (
              <span className="self-center text-xs font-extrabold text-primary">
                Pending approval
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AiAssigneeCard() {
  return (
    <Panel
      title="Suggested Assignee"
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-xs text-blue-700"
        >
          Why this suggestion?
        </Button>
      }
    >
      <div className="text-center">
        <Avatar className="mx-auto h-24 w-24">
          <AvatarImage
            src={newOwnerWorkload.avatarUrl}
            alt={newOwnerWorkload.name}
          />
          <AvatarFallback>VS</AvatarFallback>
        </Avatar>
        <Badge className="mt-3 border-0 bg-green-50 text-success">
          Best Match
        </Badge>
        <h3 className="mt-3 text-xl font-extrabold text-secondary">
          Vikram Singh
        </h3>
        <p className="text-sm font-semibold text-muted-foreground">
          Senior Sales Executive
        </p>
      </div>
      <div className="mt-6">
        <p className="text-xs font-extrabold text-secondary">Match Score</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-3xl font-extrabold text-secondary">95%</span>
          <Progress
            value={95}
            className="h-2 flex-1 bg-slate-100"
            indicatorClassName="bg-success"
          />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <p className="text-sm font-extrabold text-secondary">
          Why Vikram is a good match?
        </p>
        {suggestedReasons.map((reason) => (
          <p
            key={reason}
            className="flex items-center gap-2 text-xs font-semibold text-secondary"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            {reason}
          </p>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-6 h-11 w-full rounded-md border-blue-500 text-sm font-extrabold text-blue-700 shadow-none"
      >
        Select Vikram Singh
      </Button>
    </Panel>
  );
}

function RulesCard() {
  return (
    <Panel title="Reassignment Rules">
      <div className="space-y-4">
        {reassignmentRules.map((rule) => {
          const Icon = rule.icon;
          return (
            <div
              key={rule.title}
              className="grid grid-cols-[36px_minmax(0,1fr)] gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-success">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-secondary">
                  {rule.title}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {rule.helper}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function RecentReassignments() {
  return (
    <Panel
      title="Recent Reassignments"
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-xs text-blue-700"
        >
          View All
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {[
                "Date & Time",
                "Leads",
                "From",
                "To",
                "Reason",
                "Status",
                "Approved By",
                "",
              ].map((head) => (
                <TableHead
                  key={head}
                  className="h-10 whitespace-nowrap px-4 text-xs font-extrabold text-secondary"
                >
                  {head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentReassignments.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-extrabold text-secondary">
                  {row.date}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-extrabold text-blue-700">
                  {row.leads}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={row.fromAvatarUrl} alt={row.from} />
                      <AvatarFallback>{initials(row.from)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-secondary">
                      {row.from}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={row.toAvatarUrl} alt={row.to} />
                      <AvatarFallback>{initials(row.to)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-secondary">
                      {row.to}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-secondary">
                  {row.reason}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge className="border-0 bg-green-50 text-success">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={row.approvedByAvatarUrl}
                        alt={row.approvedBy}
                      />
                      <AvatarFallback>
                        {initials(row.approvedBy)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-secondary">
                      {row.approvedBy}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function HelpCard() {
  return (
    <Panel title="Need Help?">
      <p className="text-sm font-semibold text-muted-foreground">
        Our support team is here to help you.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {supportActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              className="h-10 justify-start rounded-md text-xs font-extrabold shadow-none"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </Panel>
  );
}

export function ReassignLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Reassign Leads"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="size-3.5" />
              <span>Lead Management</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Reassign Leads</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                value={search}
                placeholder="Search leads, customers, projects, mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
            <Select defaultValue="date">
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <CalendarDays className="h-4 w-4 text-info mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">May 20 - May 20, 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </DashboardHeader>
      <WorkspacePage>
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-secondary">
                Reassign Leads
              </h1>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                Transfer leads from one owner to another. Ensure better workload
                distribution and faster follow-ups.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              >
                <History className="h-4 w-4" />
                Reassign History
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-md px-2 text-xs font-extrabold text-secondary"
              >
                <HelpCircle className="h-4 w-4" />
                How it works?
              </Button>
            </div>
          </section>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <FeatureCards />
              <ReassignForm />
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_520px]">
                <WorkloadAnalysis />
                <ApprovalWorkflow />
              </div>
              <RecentReassignments />
            </div>
            <aside className="space-y-5">
              <AiAssigneeCard />
              <RulesCard />
              <HelpCard />
            </aside>
          </section>
      </WorkspacePage>
    </>
  );
}
