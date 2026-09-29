import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { TopHeader } from "../../../../../components/layout/TopHeader";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { InfoNote } from "../../../../../components/ui/InfoNote";
import { AuditLogFiltersCard } from "./components/AuditLogFiltersCard";
import { AuditLogTableCard } from "./components/AuditLogTableCard";
import { auditLogRecords, AuditLogRecord } from "./auditLogData";
import { ViewAuditLogDetailsModal } from "./components/ViewAuditLogDetailsModal";

export function AuditLogScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const [selectedAuditRecord, setSelectedAuditRecord] =
    useState<AuditLogRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleRowClick = (record: AuditLogRecord) => {
    setSelectedAuditRecord(record);
    setIsAuditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <DashboardSidebar
        activeItem="Masters"
        activeChild="Leads"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={[
            { label: "Masters" },
            { label: "Leads" },
            { label: "Audit Log", isLast: true },
          ]}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <div className="mx-auto">
            <PageHeader
              title="Audit Log"
              subtitle="Track all changes and activities performed in Lead Masters."
              actions={
                <Button
                  variant="outline"
                  onClick={() => navigate("/leads/masters")}
                  className="h-10 gap-2 bg-white text-sm font-bold text-blue-600 border-blue-200 hover:bg-blue-50 shadow-none"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Lead Masters
                </Button>
              }
            />

            <AuditLogFiltersCard />

            <AuditLogTableCard
              data={auditLogRecords}
              onRowClick={handleRowClick}
            />

            <InfoNote>Audit logs are retained for 180 days.</InfoNote>

            <ViewAuditLogDetailsModal
              open={isAuditModalOpen}
              onOpenChange={setIsAuditModalOpen}
              record={selectedAuditRecord}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
