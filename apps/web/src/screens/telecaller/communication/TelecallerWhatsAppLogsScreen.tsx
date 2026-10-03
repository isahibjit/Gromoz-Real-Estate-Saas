import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Send,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquareText,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  Button,
  Card,
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
  Badge,
  Checkbox,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  cn,
} from "ui";

import { DashboardHeader } from "../../admin/dashboard/DashboardHeader";
import { DashboardSidebar } from "../../admin/dashboard/DashboardSidebar";
import { telecallerSidebarItems } from "../dashboard/telecallerDashboardData";
import { WorkspacePage } from "../../../components/layout/PageHeader";

const MOCK_WHATSAPP_LOGS = [
  {
    id: "l1",
    leadName: "Rahul Sharma",
    initials: "RS",
    mobile: "+91 98765 43210",
    messageType: "Template",
    title: "Project Brochure",
    subtext: "Brochure_3BHK_Primus",
    sentDate: "20 May 2025",
    sentTime: "10:15 AM",
    deliveryStatus: "Delivered",
    readDate: "20 May 2025",
    readTime: "10:17 AM",
    response: "Interested in site visit",
  },
  {
    id: "l2",
    leadName: "Neha Kapoor",
    initials: "NK",
    mobile: "+91 98123 45678",
    messageType: "Template",
    title: "Payment Plan",
    subtext: "PaymentPlan_Primus",
    sentDate: "20 May 2025",
    sentTime: "09:48 AM",
    deliveryStatus: "Read",
    readDate: "20 May 2025",
    readTime: "09:52 AM",
    response: "Asked for location",
  },
  {
    id: "l3",
    leadName: "Vikram Singh",
    initials: "VS",
    mobile: "+91 98234 56789",
    messageType: "Text",
    message: "Hi Vikram, sharing details of Godrej Air Project.",
    sentDate: "20 May 2025",
    sentTime: "09:15 AM",
    deliveryStatus: "Read",
    readDate: "20 May 2025",
    readTime: "09:20 AM",
    response: "Thanks, will check",
  },
  {
    id: "l4",
    leadName: "Anjali Mehta",
    initials: "AM",
    mobile: "+91 98345 67890",
    messageType: "Template",
    title: "Site Visit Invite",
    subtext: "SiteVisit_Invite",
    sentDate: "20 May 2025",
    sentTime: "08:50 AM",
    deliveryStatus: "Delivered",
    readDate: "--",
    readTime: "--",
    response: "--",
  },
  {
    id: "l5",
    leadName: "Karan Patel",
    initials: "KP",
    mobile: "+91 98712 34567",
    messageType: "Template",
    title: "Price List",
    subtext: "PriceList_3BHK",
    sentDate: "20 May 2025",
    sentTime: "08:32 AM",
    deliveryStatus: "Failed",
    readDate: "--",
    readTime: "--",
    response: "--",
  },
  {
    id: "l6",
    leadName: "Pooja Verma",
    initials: "PV",
    mobile: "+91 97123 45678",
    messageType: "Text",
    message: "Hi Pooja, let us know your preferred time for visit.",
    sentDate: "19 May 2025",
    sentTime: "07:10 PM",
    deliveryStatus: "Read",
    readDate: "19 May 2025",
    readTime: "07:22 PM",
    response: "Visit on Saturday",
  },
  {
    id: "l7",
    leadName: "Rohit Agarwal",
    initials: "RA",
    mobile: "+91 98998 76543",
    messageType: "Template",
    title: "New Launch Alert",
    subtext: "NewLaunch_Godrej",
    sentDate: "19 May 2025",
    sentTime: "06:05 PM",
    deliveryStatus: "Delivered",
    readDate: "--",
    readTime: "--",
    response: "--",
  },
  {
    id: "l8",
    leadName: "Sneha Iyer",
    initials: "SI",
    mobile: "+91 91234 56789",
    messageType: "Text",
    message: "Hi Sneha, how can we assist you today?",
    sentDate: "19 May 2025",
    sentTime: "05:20 PM",
    deliveryStatus: "Read",
    readDate: "19 May 2025",
    readTime: "05:35 PM",
    response: "Requested call back",
  },
  {
    id: "l9",
    leadName: "Deepak Sharma",
    initials: "DP",
    mobile: "+91 98701 23456",
    messageType: "Template",
    title: "Brochure + Price",
    subtext: "Brochure_Price",
    sentDate: "19 May 2025",
    sentTime: "04:10 PM",
    deliveryStatus: "Failed",
    readDate: "--",
    readTime: "--",
    response: "--",
  },
  {
    id: "l10",
    leadName: "Meera Joshi",
    initials: "MJ",
    mobile: "+91 98100 11223",
    messageType: "Text",
    message: "Thanks for showing interest in our project.",
    sentDate: "19 May 2025",
    sentTime: "03:30 PM",
    deliveryStatus: "Delivered",
    readDate: "19 May 2025",
    readTime: "03:45 PM",
    response: "Very interested",
  },
];

export function TelecallerWhatsAppLogsScreen() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const toggleAll = () => {
    if (selectedRows.length === MOCK_WHATSAPP_LOGS.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(MOCK_WHATSAPP_LOGS.map((log) => log.id));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const handleExportSelected = () => {
    toast.success(`${selectedRows.length} logs exported successfully`);
    setSelectedRows([]);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Read":
        return "neutral"; // Use neutral/primary blue for read
      case "Delivered":
        return "success";
      case "Failed":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <>
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCollapse={() => setSidebarCollapsed((c) => !c)}
        onMobileClose={() => setMobileMenuOpen(false)}
        items={telecallerSidebarItems}
        activeItem="Communication"
        activeChild="WhatsApp Logs"
      />
      <DashboardHeader
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onDesktopSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          search={searchQuery}
          onSearchChange={setSearchQuery}
          breadcrumbs={
            <div className="flex items-center text-sm font-semibold text-muted-foreground">
              <span className="text-secondary cursor-pointer hover:underline">
                Dashboard
              </span>
              <span className="text-secondary cursor-pointer hover:underline mx-1">
                &gt;
              </span>
              <span className="text-secondary cursor-pointer hover:underline">
                Communication
              </span>
              <span className="text-secondary cursor-pointer hover:underline mx-1">
                &gt;
              </span>
              <span className="text-foreground">WhatsApp Logs</span>
            </div>
          }
      />

      <WorkspacePage>
          <div className="mx-auto space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-secondary">
                  WhatsApp Logs
                </h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  Manage all WhatsApp communication with customers.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="h-10 px-4 font-bold bg-white rounded-[var(--radius-control)]"
                >
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  20 May 2025 - 20 May 2025
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4 font-bold bg-white rounded-[var(--radius-control)]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4 font-bold bg-white rounded-[var(--radius-control)]"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card className="p-4 bg-white border-border shadow-sm rounded-[var(--radius-card)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                      Messages Sent Today
                    </p>
                    <h3 className="text-2xl font-extrabold text-secondary">
                      238
                    </h3>
                    <p className="text-xs font-bold text-green-600 mt-2">
                      ↑ 18% vs yesterday
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm rounded-[var(--radius-card)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                      Delivered
                    </p>
                    <h3 className="text-2xl font-extrabold text-secondary">
                      214
                    </h3>
                    <p className="text-xs font-bold text-green-600 mt-2">
                      ↑ 16% vs yesterday
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm rounded-[var(--radius-card)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                      Read
                    </p>
                    <h3 className="text-2xl font-extrabold text-secondary">
                      152
                    </h3>
                    <p className="text-xs font-bold text-green-600 mt-2">
                      ↑ 12% vs yesterday
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm rounded-[var(--radius-card)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                      Failed
                    </p>
                    <h3 className="text-2xl font-extrabold text-secondary">
                      12
                    </h3>
                    <p className="text-xs font-bold text-red-600 mt-2">
                      ↓ 8% vs yesterday
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm rounded-[var(--radius-card)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                      Templates Used
                    </p>
                    <h3 className="text-2xl font-extrabold text-secondary">
                      16
                    </h3>
                    <p className="text-xs font-bold text-green-600 mt-2">
                      ↑ 14% vs yesterday
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm rounded-[var(--radius-card)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                      Responses Received
                    </p>
                    <h3 className="text-2xl font-extrabold text-secondary">
                      48
                    </h3>
                    <p className="text-xs font-bold text-green-600 mt-2">
                      ↑ 10% vs yesterday
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <MessageSquareText className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Filter and Action Rows */}
            <div className="bg-white p-4 rounded-[var(--radius-card)] border border-border shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search lead name or mobile number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 font-semibold text-[13px] rounded-[var(--radius-control)] border-border bg-slate-50"
                  />
                </div>

                <div className="space-y-1.5 hidden lg:block">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full h-10 font-semibold text-[13px] rounded-[var(--radius-control)] border-border bg-slate-50">
                      <SelectValue placeholder="All Templates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      <SelectItem value="brochure">Project Brochure</SelectItem>
                      <SelectItem value="payment">Payment Plan</SelectItem>
                      <SelectItem value="invite">Site Visit Invite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 hidden lg:block">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full h-10 font-semibold text-[13px] rounded-[var(--radius-control)] border-border bg-slate-50">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 hidden lg:block">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full h-10 font-semibold text-[13px] rounded-[var(--radius-control)] border-border bg-slate-50">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="m3m">M3M Capital</SelectItem>
                      <SelectItem value="godrej">Godrej Air</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 hidden lg:block">
                  <Button
                    variant="outline"
                    className="w-full h-10 justify-start font-semibold text-[13px] rounded-[var(--radius-control)] border-border bg-slate-50 text-muted-foreground"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    20 May 2025 - 20 May 2025
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  className="h-9 px-4 font-bold rounded-[var(--radius-control)] text-muted-foreground border-border bg-white"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  Reset Filters
                </Button>
                <div className="flex items-center gap-3">
                  {selectedRows.length > 0 && (
                    <Button
                      onClick={handleExportSelected}
                      variant="outline"
                      className="h-9 px-4 font-bold rounded-[var(--radius-control)] bg-white"
                    >
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Export Selected
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsSendModalOpen(true)}
                    className="h-9 px-4 font-bold bg-green-600 text-white hover:bg-green-700 rounded-[var(--radius-control)] shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-2" />
                    Send WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Table */}
            <Card className="rounded-[var(--radius-card)] border-border shadow-sm overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-border">
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={
                            selectedRows.length === MOCK_WHATSAPP_LOGS.length &&
                            MOCK_WHATSAPP_LOGS.length > 0
                          }
                          onChange={toggleAll}
                          className="mx-auto border-slate-300"
                        />
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider">
                        Lead Details
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider">
                        Mobile
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider">
                        Message Type
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider w-64">
                        Template / Message
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider">
                        Sent On
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider">
                        Delivery Status
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider">
                        Read Time
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider w-40">
                        Response
                      </TableHead>
                      <TableHead className="font-extrabold text-secondary text-xs uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_WHATSAPP_LOGS.map((log) => (
                      <TableRow
                        key={log.id}
                        className="border-b border-border hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedRows.includes(log.id)}
                            onChange={() => toggleRow(log.id)}
                            className="mx-auto border-slate-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                                {log.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-[13px] text-secondary">
                              {log.leadName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[13px] text-muted-foreground">
                              {log.mobile}
                            </span>
                            <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="neutral"
                            className="bg-slate-100 text-slate-600 border-none font-bold text-xs"
                          >
                            {log.messageType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.messageType === "Template" ? (
                            <div>
                              <p className="font-bold text-[13px] text-secondary">
                                {log.title}
                              </p>
                              <p className="font-semibold text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                {log.subtext}
                              </p>
                            </div>
                          ) : (
                            <p className="font-semibold text-[13px] text-secondary truncate max-w-[200px]">
                              {log.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold text-[13px] text-secondary">
                              {log.sentDate}
                            </p>
                            <p className="font-semibold text-xs text-muted-foreground mt-0.5">
                              {log.sentTime}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(log.deliveryStatus)}
                            className={cn(
                              "font-bold text-[11px] px-2 py-0.5 uppercase tracking-wide",
                              log.deliveryStatus === "Read" &&
                                "bg-blue-50 text-blue-600 border-blue-200",
                            )}
                          >
                            {log.deliveryStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.readDate === "--" ? (
                            <span className="font-bold text-[13px] text-muted-foreground/50">
                              --
                            </span>
                          ) : (
                            <div>
                              <p className="font-bold text-[13px] text-secondary">
                                {log.readDate}
                              </p>
                              <p className="font-semibold text-xs text-muted-foreground mt-0.5">
                                {log.readTime}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-semibold text-[13px]",
                              log.response === "--"
                                ? "text-muted-foreground/50 font-bold"
                                : "text-secondary",
                            )}
                          >
                            {log.response}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-secondary hover:bg-slate-100"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="sr-only">View Message</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-secondary hover:bg-slate-100"
                            >
                              <Send className="w-4 h-4" />
                              <span className="sr-only">Resend Message</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-secondary hover:bg-slate-100"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="font-semibold text-[13px]">
                                  View Lead Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="font-semibold text-[13px]">
                                  Copy Message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-slate-50/50">
                <span className="text-sm font-semibold text-muted-foreground">
                  Showing 1 to 10 of 238 WhatsApp logs
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Rows per page:
                    </span>
                    <Select defaultValue="10">
                      <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-sm font-semibold border-slate-200 bg-white"
                      disabled
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-sm font-extrabold bg-secondary text-white hover:bg-secondary/90 hover:text-white border-secondary"
                    >
                      1
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-sm font-semibold border-slate-200 bg-white text-muted-foreground hover:text-secondary"
                    >
                      2
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-sm font-semibold border-slate-200 bg-white text-muted-foreground hover:text-secondary hidden sm:inline-flex"
                    >
                      3
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-sm font-semibold border-slate-200 bg-white text-muted-foreground hover:text-secondary hidden sm:inline-flex"
                    >
                      4
                    </Button>
                    <span className="px-2 text-sm font-semibold text-muted-foreground hidden sm:inline-block">
                      ...
                    </span>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-sm font-semibold border-slate-200 bg-white text-muted-foreground hover:text-secondary hidden sm:inline-flex"
                    >
                      24
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-sm font-semibold border-slate-200 bg-white hover:text-secondary"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
      </WorkspacePage>

      {/* Send WhatsApp Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-[var(--radius-card)] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border bg-slate-50/50">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Send WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">
                Lead / Mobile *
              </label>
              <Input
                placeholder="Enter mobile number or select lead"
                className="h-10 font-semibold text-[13px] rounded-[var(--radius-control)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">
                Message Type *
              </label>
              <Select defaultValue="template">
                <SelectTrigger className="w-full h-10 font-semibold text-[13px] rounded-[var(--radius-control)]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="text">Custom Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">
                Select Template *
              </label>
              <Select>
                <SelectTrigger className="w-full h-10 font-semibold text-[13px] rounded-[var(--radius-control)]">
                  <SelectValue placeholder="Search template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brochure">Project Brochure</SelectItem>
                  <SelectItem value="price">Price List</SelectItem>
                  <SelectItem value="visit">Site Visit Invite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex justify-end gap-3 sm:gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="h-10 px-6 font-bold text-secondary bg-white rounded-[var(--radius-control)] shadow-sm"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                toast.success("Message queued for sending");
                setIsSendModalOpen(false);
              }}
              className="h-10 px-6 font-bold bg-green-600 hover:bg-green-700 text-white rounded-[var(--radius-control)] shadow-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
