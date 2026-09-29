import { useLocation } from "react-router-dom";

import { isFieldExecutivePath } from "../../../../field-executive/fieldExecutiveRouteContext";
import type { LeadDetailsData } from "../leadDetailsTypes";
import { SiteVisitsWorkspace } from "../../site-visits/SiteVisitsScreen";

export function SiteVisitsTab({
  data,
  leadId,
}: {
  data: LeadDetailsData;
  leadId?: string;
  onManageVisits?: () => void;
}) {
  const location = useLocation();
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);

  return (
    <SiteVisitsWorkspace
      leadId={leadId ?? data.profile.id}
      embedded
      fieldExecutiveRoute={fieldExecutiveRoute}
    />
  );
}
