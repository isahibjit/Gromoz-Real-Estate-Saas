import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Filter,
  Search,
  Calendar,
  MoreVertical,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  RefreshCcw,
  Info,
} from "lucide-react";
import {
  Button,
  Card,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  cn,
} from "ui";

import { DashboardHeader } from "../../admin/dashboard/DashboardHeader";
import { DashboardSidebar } from "../../admin/dashboard/DashboardSidebar";
import { telecallerSidebarItems } from "../dashboard/telecallerDashboardData";

const MOCK_REQUESTS = [
  {
    id: "LTR-2025-00125",
    leadName: "Rahul Sharma",
    mobile: "+91 98765 43210",
    requestType: "Single Lead",
    toTarget: "Vikram Singh",
    reason: "High workload",
    requestedDate: "20 May 2025",
    requestedTime: "04:25 PM",
    status: "Pending",
  },
  {
    id: "LTR-2025-00124",
    leadName: "Neha Kapoor",
    mobile: "+91 98123 45678",
    requestType: "Multiple Leads (5)",
    toTarget: "Amit Kumar",
    reason: "Not in my working area",
    requestedDate: "20 May 2025",
    requestedTime: "03:30 PM",
    status: "Approved",
  },
  {
    id: "LTR-2025-00123",
    leadName: "Vikram Singh",
    mobile: "+91 98234 56789",
    requestType: "Single Lead",
    toTarget: "Neha Sharma",
    reason: "Lead already handled",
    requestedDate: "19 May 2025",
    requestedTime: "06:45 PM",
    status: "Rejected",
  },
  {
    id: "LTR-2025-00122",
    leadName: "Anjali Mehta",
    mobile: "+91 98345 67890",
    requestType: "Multiple Leads (3)",
    toTarget: "Team Noida",
    reason: "Project not assigned",
    requestedDate: "19 May 2025",
    requestedTime: "02:30 PM",
    status: "Pending",
  },
  {
    id: "LTR-2025-00121",
    leadName: "Karan Patel",
    mobile: "+91 98712 34567",
    requestType: "Single Lead",
    toTarget: "Pooja Verma",
    reason: "On leave",
    requestedDate: "18 May 2025",
    requestedTime: "11:15 AM",
    status: "Approved",
  },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Pending":
      return "warning";
    case "Approved":
      return "success";
    case "Rejected":
      return "danger";
    default:
      return "neutral";
  }
};

export function TelecallerLeadTransferRequestScreen() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  // New Request Form State
  const [transferType, setTransferType] = useState("single");
  const [transferTo, setTransferTo] = useState("");
  const [project, setProject] = useState("");
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsNewRequestModalOpen(false);
    setTransferType("single");
    setTransferTo("");
    setProject("");
    setReason("");
    setComments("");
    setPreferredDate("");
    setPreferredTime("");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCollapse={() => setSidebarCollapsed((c) => !c)}
        onMobileClose={() => setMobileMenuOpen(false)}
        items={telecallerSidebarItems}
        activeItem="Others"
        activeChild="Lead Transfer Request"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          search="Search leads, customers, projects..."
          onSearchChange={() => {}}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onDesktopSidebarToggle={() => setSidebarCollapsed((c) => !c)}
          breadcrumbs={
            <div className="flex items-center gap-2">
              <span className="text-primary cursor-pointer hover:underline font-semibold text-sm">
                Dashboard
              </span>
              <span className="text-muted-foreground font-semibold text-sm">
                &gt;
              </span>
              <span className="text-primary cursor-pointer hover:underline font-semibold text-sm">
                Others
              </span>
              <span className="text-muted-foreground font-semibold text-sm">
                &gt;
              </span>
              <span className="text-foreground font-semibold text-sm">
                Lead Transfer Request
              </span>
            </div>
          }
        />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-secondary tracking-tight">
                  Lead Transfer Request
                </h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  Request to transfer your leads to another executive or team.
                </p>
              </div>
              <Button
                className="font-bold rounded-[var(--radius-control)] bg-secondary text-white hover:bg-secondary/90 shadow-sm"
                onClick={() => setIsNewRequestModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Transfer Request
              </Button>
            </div>

            <Tabs defaultValue="my-requests" className="w-full">
              <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-6">
                <TabsTrigger
                  value="my-requests"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm font-bold text-muted-foreground data-[state=active]:text-primary"
                >
                  My Requests
                </TabsTrigger>
                <TabsTrigger
                  value="received-requests"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm font-bold text-muted-foreground data-[state=active]:text-primary"
                >
                  Received Requests
                </TabsTrigger>
                <TabsTrigger
                  value="transfer-history"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm font-bold text-muted-foreground data-[state=active]:text-primary"
                >
                  Transfer History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-requests" className="mt-6 space-y-6">
                {/* Filter Row */}
                <div className="flex flex-col lg:flex-row items-end gap-3 bg-white p-4 rounded-[var(--radius-card)] border border-border shadow-sm">
                  <div className="flex-1 w-full lg:w-auto">
                    <label className="block text-[11px] font-bold text-secondary mb-1.5">
                      Status
                    </label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-9 rounded-[var(--radius-control)] text-xs font-semibold bg-white border-border shadow-sm">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 w-full lg:w-auto">
                    <label className="block text-[11px] font-bold text-secondary mb-1.5">
                      Request Type
                    </label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-9 rounded-[var(--radius-control)] text-xs font-semibold bg-white border-border shadow-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="single">Single Lead</SelectItem>
                        <SelectItem value="multiple">Multiple Leads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 w-full lg:w-auto">
                    <label className="block text-[11px] font-bold text-secondary mb-1.5">
                      From Date
                    </label>
                    <Button
                      variant="outline"
                      className="w-full h-9 justify-start text-left font-semibold text-xs rounded-[var(--radius-control)] border-border bg-white text-muted-foreground hover:text-foreground"
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      Select Date
                    </Button>
                  </div>

                  <div className="flex-1 w-full lg:w-auto">
                    <label className="block text-[11px] font-bold text-secondary mb-1.5">
                      To Date
                    </label>
                    <Button
                      variant="outline"
                      className="w-full h-9 justify-start text-left font-semibold text-xs rounded-[var(--radius-control)] border-border bg-white text-muted-foreground hover:text-foreground"
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      Select Date
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="h-9 px-4 rounded-[var(--radius-control)] text-xs font-bold text-secondary bg-slate-50 border-border shadow-sm shrink-0 w-full lg:w-auto mt-2 lg:mt-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                    Reset Filters
                  </Button>
                </div>

                {/* Table */}
                <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            Request ID
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            Lead Name / Mobile
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            Request Type
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            To Executive / Team
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            Reason
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            Requested On
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                            Status
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-bold text-center whitespace-nowrap">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MOCK_REQUESTS.map((row) => (
                          <TableRow
                            key={row.id}
                            className="border-b border-border hover:bg-slate-50/50"
                          >
                            {/* Request ID */}
                            <TableCell className="px-4 py-4 whitespace-nowrap">
                              <p className="text-xs font-extrabold text-secondary">
                                {row.id}
                              </p>
                            </TableCell>

                            {/* Lead Name / Mobile */}
                            <TableCell className="px-4 py-4 whitespace-nowrap">
                              <p className="text-xs font-extrabold text-secondary leading-none">
                                {row.leadName}
                              </p>
                              <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                                {row.mobile}
                              </p>
                            </TableCell>

                            {/* Request Type */}
                            <TableCell className="px-4 py-4 whitespace-nowrap">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {row.requestType}
                              </p>
                            </TableCell>

                            {/* To Executive / Team */}
                            <TableCell className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-[10px] font-bold text-slate-500">
                                  {row.toTarget.substring(0, 2).toUpperCase()}
                                </div>
                                <p className="text-xs font-bold text-secondary">
                                  {row.toTarget}
                                </p>
                              </div>
                            </TableCell>

                            {/* Reason */}
                            <TableCell className="px-4 py-4">
                              <p
                                className="text-xs font-semibold text-muted-foreground max-w-[200px] truncate"
                                title={row.reason}
                              >
                                {row.reason}
                              </p>
                            </TableCell>

                            {/* Requested On */}
                            <TableCell className="px-4 py-4 whitespace-nowrap">
                              <p className="text-xs font-bold text-secondary leading-none">
                                {row.requestedDate}
                              </p>
                              <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                                {row.requestedTime}
                              </p>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="px-4 py-4 whitespace-nowrap">
                              <Badge
                                variant={getStatusVariant(row.status)}
                                className="text-[10px] font-bold px-2.5 py-0.5"
                              >
                                {row.status}
                              </Badge>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="px-4 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-7 h-7 rounded-md border-slate-200 bg-white hover:bg-slate-50 shadow-none text-primary"
                                  title="View Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                {row.status === "Pending" && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7 rounded-md border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-none text-muted-foreground transition-colors"
                                    title="Cancel Request"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {row.status === "Rejected" && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7 rounded-md border-slate-200 bg-white hover:bg-slate-50 shadow-none text-muted-foreground"
                                    title="Retry Request"
                                  >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-t border-border gap-4">
                    <p className="text-xs font-bold text-secondary">
                      Showing 1 to 5 of 18 requests
                    </p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1">
                        <button className="h-8 px-2 rounded-md text-xs font-bold hover:text-secondary hover:bg-slate-100 transition-colors flex items-center gap-1 text-muted-foreground">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m15 18-6-6 6-6" />
                          </svg>
                          Previous
                        </button>
                        <button className="h-8 w-8 rounded-md text-xs font-bold bg-secondary text-white border-0 flex items-center justify-center shadow-sm">
                          1
                        </button>
                        <button className="h-8 w-8 rounded-md text-xs font-bold hover:text-secondary border border-border flex items-center justify-center text-muted-foreground bg-white">
                          2
                        </button>
                        <button className="h-8 w-8 rounded-md text-xs font-bold hover:text-secondary border border-border flex items-center justify-center text-muted-foreground bg-white">
                          3
                        </button>
                        <button className="h-8 w-8 rounded-md text-xs font-bold hover:text-secondary border border-border flex items-center justify-center text-muted-foreground bg-white">
                          4
                        </button>
                        <button className="h-8 px-2 rounded-md text-xs font-bold hover:text-secondary hover:bg-slate-100 transition-colors flex items-center gap-1 text-muted-foreground">
                          Next
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-secondary">
                          Rows per page:
                        </span>
                        <Select defaultValue="10">
                          <SelectTrigger className="h-8 w-[60px] text-xs font-bold rounded-md border-border bg-white shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="received-requests" className="mt-6">
                <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <RefreshCw className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-black text-secondary">
                    No Received Requests
                  </h3>
                  <p className="text-sm font-semibold text-muted-foreground mt-1 max-w-sm">
                    You have not received any lead transfer requests from other
                    team members yet.
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="transfer-history" className="mt-6">
                <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-black text-secondary">
                    No Transfer History
                  </h3>
                  <p className="text-sm font-semibold text-muted-foreground mt-1 max-w-sm">
                    There is no historical data available for your lead
                    transfers.
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* New Transfer Request Modal */}
      <Dialog
        open={isNewRequestModalOpen}
        onOpenChange={setIsNewRequestModalOpen}
      >
        <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden rounded-[var(--radius-card)]">
          <DialogHeader className="px-6 py-4 border-b border-border bg-white">
            <DialogTitle className="text-lg font-black text-secondary">
              New Transfer Request
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-8 bg-white max-h-[80vh] overflow-y-auto"
          >
            {/* Section 1: Select Leads */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-secondary">
                1. Select Leads
              </h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-secondary">
                  Select Leads <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search lead name or mobile number..."
                      className="pl-9 h-10 font-semibold border-border rounded-[var(--radius-control)] shadow-sm"
                      required
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    0 lead(s) selected
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Transfer Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-secondary">
                2. Transfer Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">
                    Request Type <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={transferType}
                    onValueChange={setTransferType}
                    required
                  >
                    <SelectTrigger className="w-full h-10 font-semibold border-border rounded-[var(--radius-control)] shadow-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Lead</SelectItem>
                      <SelectItem value="multiple">Multiple Leads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">
                    To Executive / Team{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={transferTo}
                    onValueChange={setTransferTo}
                    required
                  >
                    <SelectTrigger className="w-full h-10 font-semibold border-border rounded-[var(--radius-control)] shadow-sm">
                      <SelectValue placeholder="Select Executive / Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amit">Amit Kumar</SelectItem>
                      <SelectItem value="neha">Neha Sharma</SelectItem>
                      <SelectItem value="vikram">Vikram Singh</SelectItem>
                      <SelectItem value="noida">Team Noida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">
                    Project (Optional)
                  </label>
                  <Select value={project} onValueChange={setProject}>
                    <SelectTrigger className="w-full h-10 font-semibold border-border rounded-[var(--radius-control)] shadow-sm">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m3m">M3M Crown</SelectItem>
                      <SelectItem value="dlf">DLF Arbour</SelectItem>
                      <SelectItem value="godrej">Godrej Icon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">
                    Reason for Transfer{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Select value={reason} onValueChange={setReason} required>
                    <SelectTrigger className="w-full h-10 font-semibold border-border rounded-[var(--radius-control)] shadow-sm">
                      <SelectValue placeholder="Select Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workload">High workload</SelectItem>
                      <SelectItem value="area">
                        Not in my working area
                      </SelectItem>
                      <SelectItem value="handled">
                        Lead already handled
                      </SelectItem>
                      <SelectItem value="project">
                        Project not assigned
                      </SelectItem>
                      <SelectItem value="leave">On leave</SelectItem>
                      <SelectItem value="customer">
                        Customer requested another executive
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-secondary">
                    Additional Comments (Optional)
                  </label>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {comments.length} / 500
                  </span>
                </div>
                <Textarea
                  placeholder="Write any additional information..."
                  className="resize-none h-24 font-semibold text-sm border-border rounded-[var(--radius-control)] shadow-sm"
                  maxLength={500}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </div>

            {/* Section 3: Preferred Transfer Date */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-secondary">
                3. Preferred Transfer Date (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">
                    Preferred Date
                  </label>
                  <Button
                    variant="outline"
                    className="w-full h-10 justify-between font-semibold text-[13px] rounded-[var(--radius-control)] border-border bg-white text-muted-foreground"
                  >
                    <span className="flex items-center">Select Date</span>
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">
                    Preferred Time
                  </label>
                  <Select
                    value={preferredTime}
                    onValueChange={setPreferredTime}
                  >
                    <SelectTrigger className="w-full h-10 font-semibold border-border rounded-[var(--radius-control)] shadow-sm">
                      <SelectValue placeholder="Select Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">
                        Morning (9 AM - 12 PM)
                      </SelectItem>
                      <SelectItem value="afternoon">
                        Afternoon (12 PM - 4 PM)
                      </SelectItem>
                      <SelectItem value="evening">
                        Evening (4 PM - 7 PM)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="rounded-md bg-blue-50/50 border border-blue-100 p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="text-sm">
                <span className="font-extrabold text-secondary block">
                  Note:
                </span>
                <span className="font-semibold text-muted-foreground">
                  Your request will be reviewed by the manager. You will be
                  notified once the request is approved or rejected.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row pt-4 border-t border-border sm:justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewRequestModalOpen(false)}
                className="font-bold border-border shadow-sm rounded-[var(--radius-control)] h-10 px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="font-bold bg-secondary text-white hover:bg-secondary/90 shadow-sm rounded-[var(--radius-control)] h-10 px-6"
              >
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
