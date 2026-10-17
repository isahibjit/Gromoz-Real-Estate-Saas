import { displayReference } from "../../../../common/displayReference";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
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
  cn,
} from "ui";

import { LeadAssignmentFilters } from "./LeadAssignmentFilters";
import type { LeadPriority, UnassignedLead } from "./leadAssignmentTypes";

const priorityClass: Record<LeadPriority, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-primary/10 text-primary",
  Low: "bg-success/10 text-success",
};

interface UnassignedLeadsTableProps {
  leads: UnassignedLead[];
  selectedLeadIds: string[];
  onToggleLead: (leadId: string) => void;
  onToggleAll: () => void;
}

export function UnassignedLeadsTable({
  leads,
  selectedLeadIds,
  onToggleLead,
  onToggleAll,
}: UnassignedLeadsTableProps) {
  const allSelected = leads.every((lead) => selectedLeadIds.includes(lead.id));

  return (
    <Card className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,37,68,0.04)]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold text-foreground">
            Unassigned Leads
          </h2>
          <Badge className="border-0 bg-secondary/8 text-secondary">
            1,245 Leads
          </Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs"
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>
      <LeadAssignmentFilters />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 px-5">
                <Checkbox
                  aria-label="Select all leads"
                  checked={allSelected}
                  onChange={onToggleAll}
                />
              </TableHead>
              {[
                "Lead ID",
                "Customer Name",
                "Mobile Number",
                "Source",
                "Project Interest",
                "Priority",
                "Created On",
              ].map((heading) => (
                <TableHead
                  key={heading}
                  className="h-12 whitespace-nowrap px-4 text-xs font-extrabold text-foreground"
                >
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="px-5 py-3">
                  <Checkbox
                    aria-label={`Select ${lead.id}`}
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={() => onToggleLead(lead.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-extrabold text-secondary">
                  {displayReference(lead.id, "Lead")}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-bold">
                  {lead.customerName}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-bold">
                  {lead.mobileNumber}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-bold">
                  {lead.source}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-bold">
                  {lead.projectInterest}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge
                    className={cn(
                      "border-0 px-3 py-1 text-xs",
                      priorityClass[lead.priority],
                    )}
                  >
                    {lead.priority}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-bold">
                  {lead.createdOn}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <p className="text-xs font-semibold text-secondary">
          Showing 1 to 8 of 1,245 entries
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="10">
            <SelectTrigger className="h-10 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10"
          >
            <ChevronLeft className="size-4" />
          </Button>
          {["1", "2", "3"].map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === "1" ? "primary" : "outline"}
              className="size-10 px-0"
            >
              {page}
            </Button>
          ))}
          <Button type="button" variant="outline" className="size-10 px-0">
            ...
          </Button>
          <Button type="button" variant="outline" className="h-10 px-4">
            125
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
