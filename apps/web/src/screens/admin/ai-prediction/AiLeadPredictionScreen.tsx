import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Info,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCcw,
  Search,
  ArrowRight,
  Eye,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from "ui";

import { useAppSelector } from "../../../store";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { addLeadSidebarItems } from "../leads/add/addLeadData";

import {
  aiKpis,
  scoreDistributionData,
  aiScoreFactorsData,
  conversionProbabilityData,
  aiRecommendations,
  topAiScoreLeads,
  aiModelInfo,
  aiScoreInfluences,
} from "./aiPredictionData";



function Header({
  search,
  onSearchChange,
  onMobileMenuOpen,
  onDesktopSidebarToggle,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onMobileMenuOpen: () => void;
  onDesktopSidebarToggle: () => void;
}) {
  const user = useAppSelector((state) => state.auth.user);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={onMobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label="Toggle sidebar"
            onClick={onDesktopSidebarToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden items-center gap-2 text-sm font-bold text-muted-foreground md:flex">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span>Lead Management</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-secondary">AI Lead Prediction Center</span>
          </div>
        </div>
        <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search leads"
              value={search}
              placeholder="Search leads, customers, projects..."
              className="h-11 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
              ⌘ K
            </span>
          </div>
          <Select defaultValue="date">
            <SelectTrigger
              aria-label="Date range"
              className="h-11 rounded-md text-sm font-bold shadow-none"
            >
              <CalendarDays className="h-4 w-4 text-info" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">May 20, 2025</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-md border border-slate-200 bg-white"
            >
              <Bell className="h-4 w-4 text-secondary" />
              <Badge className="absolute -right-1 -top-1 min-w-4 border-0 bg-primary px-1 py-0 text-[9px] text-white bg-orange-500">
                12
              </Badge>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-md border border-slate-200 bg-white"
            >
              <MessageCircle className="h-4 w-4 text-secondary" />
              <Badge className="absolute -right-1 -top-1 min-w-4 border-0 bg-primary px-1 py-0 text-[9px] text-white bg-orange-500">
                5
              </Badge>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-auto rounded-md border border-slate-200 px-2 py-1.5"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-extrabold text-secondary">
                  {user?.fullName || "Amit Kumar"}
                </span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  Admin
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-secondary">
            AI Lead Prediction Center
          </h1>
          <Info className="h-4 w-4 text-blue-500" />
        </div>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          AI-powered insights to predict lead conversion probability and
          prioritize follow-ups for better results.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md border-slate-200 font-bold text-secondary shadow-none"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md border-slate-200 font-bold text-secondary shadow-none"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        <Button
          type="button"
          className="h-10 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white border-0 shadow-none hover:opacity-90"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh AI Scores
        </Button>
      </div>
    </div>
  );
}

function StatsRow() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {aiKpis.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col h-full justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    stat.tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-extrabold text-secondary mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </div>
              <div>
                {stat.change && (
                  <p
                    className={cn(
                      "text-[11px] font-extrabold",
                      stat.changeType === "positive"
                        ? "text-emerald-600"
                        : "text-red-500",
                    )}
                  >
                    {stat.change}
                  </p>
                )}
                {stat.helper && (
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {stat.helper}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function LeadScoreDistributionCard() {
  return (
    <Card className="flex flex-col justify-between rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-secondary">
        Lead Score Distribution
      </h2>
      <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-4 mt-4 flex-1">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={scoreDistributionData}
                innerRadius={45}
                outerRadius={65}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {scoreDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-extrabold text-secondary">
              12,458
            </span>
            <span className="text-[9px] font-semibold text-muted-foreground">
              Total Leads
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1 min-w-0 w-full">
          {scoreDistributionData.map((item) => (
            <div
              key={item.name}
              className="flex items-start sm:items-center justify-between text-[11px] font-semibold gap-2"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-secondary truncate">{item.name}</span>
              </div>
              <span className="text-muted-foreground shrink-0 whitespace-nowrap">
                {item.value.toLocaleString()} ({item.percent})
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[10px] font-semibold text-muted-foreground">
        Scores updated daily using AI model
      </p>
    </Card>
  );
}

const CustomTick = (props: any) => {
  const { payload, x, y, textAnchor } = props;
  const factor = aiScoreFactorsData.find((f) => f.subject === payload.value);
  if (!factor) return null;

  const width = 120;
  const height = 44;
  let tx = x;
  let justify = "center";

  if (textAnchor === "middle") {
    tx = x - width / 2;
  } else if (textAnchor === "start") {
    tx = x + 5; // slight padding
    justify = "start";
  } else if (textAnchor === "end") {
    tx = x - width - 5;
    justify = "end";
  }

  // Adjust y position to center the block vertically around the tick point
  const ty = y - height / 2;

  return (
    <foreignObject x={tx} y={ty} width={width} height={height}>
      <div
        className={cn(
          "flex flex-col gap-1 w-full h-full justify-center",
          justify === "center" && "items-center",
          justify === "start" && "items-start",
          justify === "end" && "items-end",
        )}
      >
        <span className="text-[10px] font-extrabold text-secondary leading-tight whitespace-nowrap">
          {payload.value}
        </span>
        <span
          className={cn(
            "inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold",
            factor.pillColor,
          )}
        >
          {factor.displayValue}
        </span>
      </div>
    </foreignObject>
  );
};

function AiScoreFactorsCard() {
  return (
    <Card className="flex flex-col justify-between rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-secondary">
        AI Score Factors
      </h2>
      <div className="relative h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="60%"
            data={aiScoreFactorsData}
          >
            <PolarGrid gridType="circle" stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={<CustomTick />} />
            <Radar
              name="Factors"
              dataKey="A"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="#8b5cf6"
              fillOpacity={0.3}
              dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-muted-foreground">
        AI score is calculated based on historical data and real-time behavior.
      </p>
    </Card>
  );
}

function ConversionProbabilityByScoreCard() {
  return (
    <Card className="flex flex-col justify-between rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-extrabold text-secondary">
          Conversion Probability by Score Range
        </h2>
        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
          Higher score = Higher chance of conversion
        </p>
      </div>
      <div className="mt-4 flex-1 space-y-4">
        <div className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-[10px] font-extrabold text-muted-foreground uppercase">
          <span>Score Range</span>
          <span>Leads</span>
          <span className="text-right">Conv. Probability</span>
        </div>
        {conversionProbabilityData.map((item) => (
          <div
            key={item.range}
            className="grid grid-cols-[110px_1fr_40px] items-center gap-3"
          >
            <span className="text-[11px] font-bold text-secondary">
              {item.range}
            </span>
            <div className="flex items-center gap-2">
              <span className="w-10 text-[11px] font-semibold text-muted-foreground">
                {item.leads}
              </span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn("h-full rounded-full", item.color)}
                  style={{ width: `${item.prob}%` }}
                />
              </div>
            </div>
            <span className="text-right text-[11px] font-extrabold text-secondary">
              {item.prob}%
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] font-semibold text-muted-foreground">
        Based on last 90 days conversion data
      </p>
    </Card>
  );
}

function RightSidebarCards() {
  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold text-secondary">
            AI Recommendation Engine
          </h2>
          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] px-1.5 py-0 font-bold">
            Beta
          </Badge>
        </div>
        <div className="space-y-4">
          {aiRecommendations.map((rec) => {
            const Icon = rec.icon;
            return (
              <div
                key={rec.title}
                className="grid grid-cols-[36px_1fr_auto] items-start gap-3"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    rec.iconTone,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-secondary">
                    {rec.title}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground leading-tight mt-0.5">
                    {rec.helper}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "border text-[9px] px-2 py-0 font-bold shadow-none",
                    rec.priorityTone,
                  )}
                >
                  {rec.priority}
                </Badge>
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          View All Recommendations <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Card>

      <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-extrabold text-secondary mb-4">
          AI Model Information
        </h2>
        <div className="space-y-3">
          {aiModelInfo.map((info) => (
            <div
              key={info.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="font-semibold text-muted-foreground">
                {info.label}
              </span>
              <span className="font-bold text-secondary">{info.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-semibold text-muted-foreground">
              Model Accuracy
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-secondary">87.6%</span>
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] px-1.5 py-0 font-extrabold shadow-none hover:bg-emerald-50 hover:text-emerald-600">
                ↑ 3.2%
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          View Model Details <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Card>

      <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-extrabold text-secondary mb-4">
          What Influences AI Score?
        </h2>
        <div className="space-y-3">
          {aiScoreInfluences.map((inf) => (
            <div
              key={inf.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="font-semibold text-muted-foreground">
                {inf.label}
              </span>
              <span className="font-bold text-secondary">{inf.value}</span>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          View Full Breakdown <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Card>
    </div>
  );
}

function TopAIScoreLeadsTable() {
  const navigate = useNavigate();
  return (
    <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-4 gap-4">
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold text-secondary">
            Top AI Score Leads
          </h2>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-transparent p-0 border-b border-transparent space-x-6 h-auto">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2 font-bold text-xs text-muted-foreground data-[state=active]:text-blue-600"
              >
                All Leads
              </TabsTrigger>
              <TabsTrigger
                value="high"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2 font-bold text-xs text-muted-foreground data-[state=active]:text-blue-600"
              >
                High Score (80-100)
              </TabsTrigger>
              <TabsTrigger
                value="needs"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2 font-bold text-xs text-muted-foreground data-[state=active]:text-blue-600"
              >
                Needs Attention (40-79)
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2 font-bold text-xs text-muted-foreground data-[state=active]:text-blue-600"
              >
                At Risk (0-39)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Select defaultValue="ai_score">
          <SelectTrigger className="w-[180px] h-9 text-xs font-semibold rounded-lg">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_score">Sort by: AI Score</SelectItem>
            <SelectItem value="recent">Sort by: Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="border-b border-slate-100 bg-white text-[11px] font-extrabold text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-extrabold">Lead</th>
              <th className="px-5 py-3 font-extrabold text-center">AI Score</th>
              <th className="px-5 py-3 font-extrabold">
                Conversion Probability
              </th>
              <th className="px-5 py-3 font-extrabold">Lead Temperature</th>
              <th className="px-5 py-3 font-extrabold">Top Reason</th>
              <th className="px-5 py-3 font-extrabold">Last Activity</th>
              <th className="px-5 py-3 font-extrabold">Owner</th>
              <th className="px-5 py-3 font-extrabold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {topAiScoreLeads.map((lead) => {
              const TempIcon = lead.tempIcon;
              const ActivityIcon = lead.activityIcon;
              return (
                <tr key={lead.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 bg-indigo-50 border border-indigo-100">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
                            lead.avatarSeed,
                          )}`}
                          alt={lead.name}
                        />
                        <AvatarFallback className="text-indigo-600 font-bold text-xs bg-indigo-50">
                          {lead.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-extrabold text-secondary">
                          {lead.name}
                        </p>
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {lead.propertyInfo}
                        </p>
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {lead.budget}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div
                      className={cn(
                        "mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-sm font-extrabold",
                        lead.scoreColor,
                      )}
                    >
                      {lead.aiScore}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-extrabold text-emerald-600">
                      {lead.conversionProb}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <TempIcon className={cn("h-3.5 w-3.5", lead.tempColor)} />
                      <span className={cn("text-xs font-bold", lead.tempColor)}>
                        {lead.temp}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-secondary">
                      {lead.reason1}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {lead.reason2}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-secondary">
                        {lead.lastActivity}
                      </p>
                      <ActivityIcon className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
                            lead.ownerAvatarSeed,
                          )}`}
                          alt={lead.ownerName}
                        />
                        <AvatarFallback>
                          {lead.ownerName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[11px] font-extrabold text-secondary leading-tight">
                          {lead.ownerName}
                        </p>
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {lead.ownerRole}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-blue-600 hover:bg-blue-50"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-secondary hover:bg-slate-100"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-xs font-bold text-blue-700"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-semibold text-muted-foreground">
          Showing 1 to 5 of 50 leads
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-7 w-7 rounded-md p-0 shadow-none border-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            className="h-7 w-7 rounded-md p-0 text-xs font-extrabold bg-secondary text-white shadow-none"
          >
            1
          </Button>
          {["2", "3", "4", "5", "...", "10"].map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              className="h-7 w-7 rounded-md p-0 text-xs font-bold shadow-none border-transparent text-secondary hover:bg-slate-100"
            >
              {p}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-7 w-7 rounded-md p-0 shadow-none border-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Rows per page
          </span>
          <Select defaultValue="5">
            <SelectTrigger className="h-7 w-16 rounded-md text-xs font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

export function AiLeadPredictionScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-slate-50/50 lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="All Leads" // Highlighting Lead Management. If AI Prediction has a dedicated item in sidebar config, use that.
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1 flex flex-col">
        <Header
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
        />
        <main className="flex-1 space-y-5">
          <PageHeader />
          <StatsRow />
          <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">
            <div className="space-y-6 min-w-0">
              <div className="grid gap-6 lg:grid-cols-3">
                <LeadScoreDistributionCard />
                <AiScoreFactorsCard />
                <ConversionProbabilityByScoreCard />
              </div>
              <TopAIScoreLeadsTable />
            </div>
            <div className="hidden xl:block">
              <RightSidebarCards />
            </div>
            {/* Show below table on smaller screens */}
            <div className="xl:hidden">
              <RightSidebarCards />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
