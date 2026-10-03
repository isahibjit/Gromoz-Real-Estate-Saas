import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../../dashboard/DashboardHeader";
import {
  PageHeader,
  WorkspacePage,
} from "../../../../../components/layout/PageHeader";
import { InfoNote } from "../../../../../components/ui/InfoNote";
import { AuditLogFiltersCard } from "./components/AuditLogFiltersCard";
import { AuditLogTableCard } from "./components/AuditLogTableCard";
import { auditLogRecords, AuditLogRecord } from "./auditLogData";
import { ViewAuditLogDetailsModal } from "./components/ViewAuditLogDetailsModal";

export function AuditLogScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const [selectedAuditRecord, setSelectedAuditRecord] =
    useState<AuditLogRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleRowClick = (record: AuditLogRecord) => {
    setSelectedAuditRecord(record);
    setIsAuditModalOpen(true);
  };

  return (
    <>
      <DashboardSidebar
        activeItem="Masters"
        activeChild="Leads"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <DashboardHeader
        onMobileMenuOpen={() => setMobileOpen(true)}
        onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
        breadcrumbs={<span>Audit log</span>}
      />

      <WorkspacePage>
        <PageHeader
          title="Audit log"
          subtitle="Track all changes and activities performed in lead masters."
          actions={
            <Button
              variant="outline"
              onClick={() => navigate("/leads/masters")}
              className="h-10 gap-2 bg-white text-sm font-bold text-blue-600 border-blue-200 hover:bg-blue-50 shadow-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to lead masters
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
      </WorkspacePage>
    </>
  );
}
