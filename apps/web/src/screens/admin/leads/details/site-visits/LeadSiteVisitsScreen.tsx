import { useParams } from "react-router-dom";

import { SiteVisitsScreen } from "../../site-visits/SiteVisitsScreen";

export function LeadSiteVisitsScreen() {
  const { leadId } = useParams();

  return <SiteVisitsScreen leadId={leadId} />;
}
