import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  Home,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from "ui";

import { SlaBadge } from "../../../common/sla/SlaBadge";
import { WorkspacePage } from "../../../components/layout/PageHeader";
import { getTelecallerLeadSla } from "../../../common/sla/slaData";
import { useDashboardLayout } from "../../admin/dashboard/DashboardLayoutContext";
import { telecallerSidebarItems } from "../dashboard/telecallerDashboardData";

const MOCK_LEAD_DATA = {
  id: "LTR1250",
  name: "Rahul Sharma",
  avatarSeed: "rahul",
  status: "Hot Lead",
  phone: "+91 98765 43210",
  email: "rahul.sharma12@gmail.com",
  location: "Gurgaon, Haryana",
  leadSource: "MagicBricks",
  projectInterested: "The Primus",
  assignedTo: "Amit Kumar (You)",
  nextFollowUp: "Today, 11:00 AM",
  followUpSubtext: "(Due in 30 mins)",
  budget: "₹ 75 L - 1 Cr",
  requirement: "2 BHK",
  possession: "Within 6 Months",
  preferredLocation: "Sohna Road, Gurgaon",
  occupation: "Private Job",
  sourceCampaign: "Spring Campaign",
  createdOn: "18 May 2025, 10:15 AM",
  score: 85,
  scoreLabel: "Excellent",
  scoreSubtext: "High conversion potential",
};

function CircularScore({ score }: { score: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: 90,
        height: 90,
        background: `conic-gradient(#00a76f ${score * 3.6}deg, #e8edf4 0deg)`,
      }}
    >
      <div className="grid h-[75%] w-[75%] place-items-center rounded-full bg-white text-center">
        <span className="text-2xl font-black text-secondary leading-none">
          {score}
        </span>
        <span className="text-[10px] font-bold text-secondary -mt-1">/100</span>
      </div>
    </div>
  );
}

export function TelecallerLeadDetailsScreen() {
  const [activeTab, setActiveTab] = useState("Overview");
  const navigate = useNavigate();

  const data = MOCK_LEAD_DATA;
  const sla = getTelecallerLeadSla(data.id);

  const tabs = [
    "Overview",
    "Activity Timeline",
    "Follow-ups (3)",
    "Calls (4)",
    "WhatsApp (3)",
    "Emails (2)",
    "Notes (2)",
    "Site Visits (1)",
    "Documents (1)",
  ];

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: telecallerSidebarItems,
        activeItem: "My Leads",
      },
      header: {
        search: "Search leads, customers, projects...",
        onSearchChange: () => {},
        breadcrumbs: "Lead Management > My Leads > Lead Details",
      },
    },
    [],
  );

  return (
    <>
      <WorkspacePage className="crm-main-scrollbar space-y-6 overflow-x-hidden">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Main Column */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {/* Top Action Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/telecaller/leads/my")}
                  className="text-sm font-bold text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-2 -ml-2 h-10"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to My Leads
                </Button>
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 px-4 font-bold rounded-[var(--radius-control)] shadow-none text-secondary"
                      >
                        Actions{" "}
                        <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-[var(--radius-menu)] shadow-md"
                    >
                      <DropdownMenuItem className="text-xs font-bold text-secondary">
                        Add Follow-up
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-bold text-secondary">
                        Schedule Visit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-bold text-secondary">
                        Update Status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button className="h-10 px-6 font-bold rounded-[var(--radius-control)] bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
                    Edit Lead
                  </Button>
                </div>
              </div>

              {/* Profile Summary Card */}
              <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left Contact Block */}
                    <div className="p-6 flex gap-5 border-b md:border-b-0 md:border-r border-border md:w-[45%] lg:w-[40%]">
                      <Avatar className="w-[84px] h-[84px] shrink-0 border border-slate-100">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${data.avatarSeed}`}
                        />
                        <AvatarFallback>RS</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-xl font-extrabold text-secondary truncate">
                            {data.name}
                          </h1>
                          <Badge className="bg-red-50 text-destructive border-0 hover:bg-red-50 font-extrabold text-[10px] px-2 py-0.5 rounded shadow-none">
                            {data.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-secondary">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          {data.phone}
                          <MessageCircle className="w-3.5 h-3.5 text-green-500 ml-1" />
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          {data.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {data.location}
                        </div>
                      </div>
                    </div>

                    {/* Middle Info Block */}
                    <div className="p-6 border-b md:border-b-0 md:border-r border-border md:w-[30%] lg:w-[30%] flex flex-col justify-center gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Lead ID
                        </span>
                        <span className="font-extrabold text-secondary">
                          {data.id}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Lead Source
                        </span>
                        <span className="font-extrabold text-secondary">
                          {data.leadSource}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Project Interested
                        </span>
                        <span className="font-extrabold text-secondary">
                          {data.projectInterested}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Assigned To
                        </span>
                        <span className="font-extrabold text-secondary">
                          {data.assignedTo}
                        </span>
                      </div>
                    </div>

                    {/* Right Info Block */}
                    <div className="p-6 md:flex-1 flex flex-col justify-center gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Status
                        </span>
                        <div className="flex items-center gap-1.5 font-extrabold text-destructive">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                          {data.status}
                        </div>
                      </div>
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Next Follow-up
                        </span>
                        <div className="text-right">
                          <p className="font-extrabold text-destructive">
                            {data.nextFollowUp}
                          </p>
                          <p className="font-extrabold text-destructive text-[10px] mt-0.5">
                            {data.followUpSubtext}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attribute Strip */}
              <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white p-5 overflow-x-auto">
                <div className="flex items-start gap-8 min-w-max">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Budget
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.budget}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Requirement
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.requirement}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Possession
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.possession}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Preferred Location
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.preferredLocation}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Occupation
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.occupation}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Source Campaign
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.sourceCampaign}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Created On
                    </p>
                    <p className="text-sm font-extrabold text-secondary">
                      {data.createdOn}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <div className="bg-transparent">
                <div className="overflow-x-auto crm-main-scrollbar border-b border-border mb-6">
                  <div className="flex min-w-max gap-8 px-1">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "pb-3.5 pt-1 text-sm font-extrabold transition-colors relative",
                          activeTab === tab
                            ? "text-[#FF6B00]"
                            : "text-muted-foreground hover:text-secondary",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {tab.includes("Overview") && (
                            <UserCheck className="w-4 h-4" />
                          )}
                          {tab.includes("Activity") && (
                            <Clock className="w-4 h-4" />
                          )}
                          {tab}
                        </div>
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FF6B00] rounded-t-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === "Overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Lead Requirement */}
                      <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                        <CardHeader className="p-5 pb-3">
                          <CardTitle className="text-sm font-extrabold text-secondary">
                            Lead Requirement
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 space-y-5">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <Home className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                Interested In
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                {data.projectInterested}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                Property Type
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                Apartment
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                BHK
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                {data.requirement}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <IndianRupee className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                Budget
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                {data.budget}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                Preferred Location
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                {data.preferredLocation}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <CalendarDays className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                Possession Timeline
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                {data.possession}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-muted-foreground">
                              <Target className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground">
                                Purpose
                              </p>
                              <p className="text-xs font-extrabold text-secondary">
                                End Use
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Activity Timeline */}
                      <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white flex flex-col">
                        <CardHeader className="p-5 pb-3">
                          <CardTitle className="text-sm font-extrabold text-secondary">
                            Activity Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 flex-1 flex flex-col">
                          <div className="space-y-6 flex-1 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            <div className="relative flex items-start gap-4">
                              <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-200 z-10 text-success">
                                <PhoneCall className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <p className="text-xs font-extrabold text-secondary">
                                    Called Rahul Sharma{" "}
                                    <Badge className="ml-1 bg-green-50 text-success border-0 px-1.5 py-0 text-[9px] rounded font-extrabold">
                                      Connected
                                    </Badge>
                                  </p>
                                  <div className="text-right shrink-0">
                                    <p className="text-[9px] font-bold text-muted-foreground">
                                      20 May 2025, 10:15 AM
                                    </p>
                                    <p className="text-[9px] font-semibold text-muted-foreground">
                                      Amit Kumar
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] font-semibold text-secondary leading-relaxed">
                                  Discussed about 2 BHK options in The Primus.
                                  He is interested in site visit.
                                </p>
                              </div>
                            </div>

                            <div className="relative flex items-start gap-4">
                              <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-200 z-10 text-success">
                                <MessageCircle className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <p className="text-xs font-extrabold text-secondary">
                                    WhatsApp message sent
                                  </p>
                                  <div className="text-right shrink-0">
                                    <p className="text-[9px] font-bold text-muted-foreground">
                                      20 May 2025, 10:18 AM
                                    </p>
                                    <p className="text-[9px] font-semibold text-muted-foreground">
                                      Amit Kumar
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] font-semibold text-secondary leading-relaxed">
                                  Brochure and pricing details shared.
                                </p>
                              </div>
                            </div>

                            <div className="relative flex items-start gap-4">
                              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-200 z-10 text-blue-600">
                                <Calendar className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <p className="text-xs font-extrabold text-secondary">
                                    Follow-up scheduled
                                  </p>
                                  <div className="text-right shrink-0">
                                    <p className="text-[9px] font-bold text-muted-foreground">
                                      20 May 2025, 10:20 AM
                                    </p>
                                    <p className="text-[9px] font-semibold text-muted-foreground">
                                      Amit Kumar
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] font-semibold text-secondary leading-relaxed">
                                  Next follow-up scheduled for today at 11:00 AM
                                </p>
                              </div>
                            </div>

                            <div className="relative flex items-start gap-4">
                              <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0 border border-orange-200 z-10 text-primary">
                                <Users className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <p className="text-xs font-extrabold text-secondary">
                                    Site visit scheduled{" "}
                                    <Badge className="ml-1 bg-orange-50 text-primary border-0 px-1.5 py-0 text-[9px] rounded font-extrabold">
                                      Upcoming
                                    </Badge>
                                  </p>
                                  <div className="text-right shrink-0">
                                    <p className="text-[9px] font-bold text-muted-foreground">
                                      20 May 2025, 10:25 AM
                                    </p>
                                    <p className="text-[9px] font-semibold text-muted-foreground">
                                      Amit Kumar
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] font-semibold text-secondary leading-relaxed">
                                  Site visit for The Primus on 22 May 2025,
                                  04:00 PM
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 text-center">
                            <Button
                              variant="ghost"
                              className="h-8 text-xs font-extrabold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            >
                              View Full Timeline
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Interested Projects */}
                      <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white flex flex-col">
                        <CardHeader className="p-5 pb-3">
                          <CardTitle className="text-sm font-extrabold text-secondary">
                            Interested Projects
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 flex-1 flex flex-col gap-4">
                          <div className="border border-slate-100 rounded-md p-3 flex gap-3 shadow-sm relative overflow-hidden bg-slate-50/50">
                            <div className="w-[72px] h-[72px] rounded bg-slate-200 shrink-0 overflow-hidden">
                              <img
                                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=150&h=150&fit=crop"
                                alt="The Primus"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1 py-0.5">
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-extrabold text-secondary">
                                  The Primus
                                </h4>
                                <Badge className="bg-green-50 text-success border-0 px-1.5 py-0 text-[9px] rounded font-extrabold">
                                  Primary
                                </Badge>
                              </div>
                              <p className="text-[10px] font-semibold text-muted-foreground">
                                DLF Sector 82A, Gurgaon
                              </p>
                              <p className="text-[11px] font-bold text-secondary mt-1">
                                2 BHK, 3 BHK Apartments
                              </p>
                            </div>
                          </div>

                          <div className="border border-slate-100 rounded-md p-3 flex gap-3 shadow-sm bg-white">
                            <div className="w-[72px] h-[72px] rounded bg-slate-200 shrink-0 overflow-hidden">
                              <img
                                src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=150&h=150&fit=crop"
                                alt="M3M Capital"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1 py-0.5">
                              <h4 className="text-xs font-extrabold text-secondary">
                                M3M Capital
                              </h4>
                              <p className="text-[10px] font-semibold text-muted-foreground">
                                Sector 113, Gurgaon
                              </p>
                              <p className="text-[11px] font-bold text-secondary mt-1">
                                2 BHK, 3 BHK Apartments
                              </p>
                            </div>
                          </div>

                          <div className="mt-auto pt-2 text-center">
                            <Button
                              variant="ghost"
                              className="h-8 text-xs font-extrabold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add More
                              Projects
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Communication Summary */}
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary mb-4">
                        Communication Summary
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                          <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                              <PhoneCall className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xl font-black text-secondary leading-none mb-1">
                                4
                              </p>
                              <p className="text-[11px] font-bold text-muted-foreground mb-0.5">
                                Calls Made
                              </p>
                              <p className="text-[9px] font-semibold text-muted-foreground truncate">
                                Last: 20 May 10:15 AM
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                          <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 text-green-500">
                              <MessageCircle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xl font-black text-secondary leading-none mb-1">
                                3
                              </p>
                              <p className="text-[11px] font-bold text-muted-foreground mb-0.5">
                                WhatsApp Sent
                              </p>
                              <p className="text-[9px] font-semibold text-muted-foreground truncate">
                                Last: 20 May 10:18 AM
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                          <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xl font-black text-secondary leading-none mb-1">
                                2
                              </p>
                              <p className="text-[11px] font-bold text-muted-foreground mb-0.5">
                                Emails Sent
                              </p>
                              <p className="text-[9px] font-semibold text-muted-foreground truncate">
                                Last: 19 May 04:10 PM
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                          <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 text-primary">
                              <Briefcase className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xl font-black text-secondary leading-none mb-1">
                                2
                              </p>
                              <p className="text-[11px] font-bold text-muted-foreground mb-0.5">
                                Notes Added
                              </p>
                              <p className="text-[9px] font-semibold text-muted-foreground truncate">
                                Last: 19 May 04:20 PM
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar Panel */}
            <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 space-y-6 lg:sticky lg:top-[88px]">
              <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-extrabold text-secondary">
                      SLA Summary
                    </CardTitle>
                    <SlaBadge status={sla.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Current Deadline
                    </span>
                    <span className="font-extrabold text-secondary">
                      {sla.deadlineLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Response Time
                    </span>
                    <span className="font-extrabold text-secondary">
                      {sla.responseTimeLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Breach Duration
                    </span>
                    <span className="font-extrabold text-secondary">
                      {sla.breachDuration ?? "No active breach"}
                    </span>
                  </div>
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] font-semibold text-secondary">
                    {sla.lastActivityLabel}
                  </p>
                </CardContent>
              </Card>

              {/* Lead Score */}
              <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                <CardHeader className="p-5 pb-0 border-b-0">
                  <CardTitle className="text-sm font-extrabold text-secondary">
                    Lead Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <CircularScore score={data.score} />
                    <div>
                      <p className="text-sm font-extrabold text-success">
                        {data.scoreLabel}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-0.5 leading-snug">
                        {data.scoreSubtext}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-muted-foreground">
                        Interest Level
                      </span>
                      <span className="font-extrabold text-secondary">
                        High
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-muted-foreground">
                        Response Rate
                      </span>
                      <span className="font-extrabold text-secondary">
                        High
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-muted-foreground">
                        Engagement
                      </span>
                      <span className="font-extrabold text-secondary">
                        Very High
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs font-extrabold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                  >
                    View Score Details
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-sm font-extrabold text-secondary">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-none border-border hover:bg-slate-50 text-secondary"
                    >
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-bold">Call Lead</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-none border-border hover:bg-slate-50 text-secondary"
                    >
                      <MessageCircle className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-none border-border hover:bg-slate-50 text-secondary"
                    >
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold">
                        Add Follow-up
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-none border-border hover:bg-slate-50 text-secondary"
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="text-[10px] font-bold">
                        Schedule Visit
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-none border-border hover:bg-slate-50 text-secondary"
                    >
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-[10px] font-bold">Send Email</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-none border-border hover:bg-slate-50 text-secondary"
                    >
                      <RefreshCw className="w-4 h-4 text-success" />
                      <span className="text-[10px] font-bold">
                        Update Status
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Owner & Team */}
              <Card className="rounded-[var(--radius-card)] shadow-sm border-border bg-white">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-sm font-extrabold text-secondary">
                    Lead Owner & Team
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-2">
                      Assigned To
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=amit" />
                          <AvatarFallback>AK</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-extrabold text-secondary leading-tight">
                            Amit Kumar
                          </p>
                          <p className="text-[10px] font-semibold text-muted-foreground leading-tight">
                            Pre Sales
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-50 text-success border-0 px-1.5 py-0 text-[9px] rounded font-extrabold">
                        You
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-2">
                      Reporting To
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=neha" />
                        <AvatarFallback>NK</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-extrabold text-secondary leading-tight">
                          Neha Kapoor
                        </p>
                        <p className="text-[10px] font-semibold text-muted-foreground leading-tight">
                          Team Leader
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs font-extrabold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 mt-2"
                  >
                    Reassign Lead
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </WorkspacePage>
    </>
  );
}
