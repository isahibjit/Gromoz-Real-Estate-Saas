export const TELECALLER_MY_LEADS_PATH = "/telecaller/leads/my";

export const TELECALLER_LEAD_TAB_VALUES = {
  ALL: "all",
  NEW_LEADS: "new-leads",
  FOLLOW_UPS: "follow-ups",
  HOT_LEADS: "hot-leads",
  COLD_LEADS: "cold-leads",
  INTERESTED: "interested",
  NOT_INTERESTED: "not-interested",
  CONVERTED: "converted",
} as const;

export const TELECALLER_FOLLOW_UP_FILTER_VALUES = {
  TODAY: "today",
  MISSED: "missed",
} as const;

export const TELECALLER_LEAD_TAB_CONFIG = {
  [TELECALLER_LEAD_TAB_VALUES.ALL]: {
    label: "All Leads",
    sidebarChild: "My Leads",
    tabValue: TELECALLER_LEAD_TAB_VALUES.ALL,
    status: undefined,
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.NEW_LEADS]: {
    label: "New Leads",
    sidebarChild: "New Leads Queue",
    tabValue: TELECALLER_LEAD_TAB_VALUES.NEW_LEADS,
    status: "New Lead",
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.FOLLOW_UPS]: {
    label: "Follow-ups",
    sidebarChild: "Today's Follow-ups", // Default, will be overridden dynamically if followUp is "missed"
    tabValue: TELECALLER_LEAD_TAB_VALUES.FOLLOW_UPS,
    status: "Follow-up",
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.HOT_LEADS]: {
    label: "Hot Leads",
    sidebarChild: "Hot Leads",
    tabValue: TELECALLER_LEAD_TAB_VALUES.HOT_LEADS,
    status: "Hot Lead",
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.COLD_LEADS]: {
    label: "Cold Leads",
    sidebarChild: "Cold Leads",
    tabValue: TELECALLER_LEAD_TAB_VALUES.COLD_LEADS,
    status: "Cold Lead",
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.INTERESTED]: {
    label: "Interested",
    sidebarChild: "Interested Leads",
    tabValue: TELECALLER_LEAD_TAB_VALUES.INTERESTED,
    status: "Interested",
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.NOT_INTERESTED]: {
    label: "Not Interested",
    sidebarChild: "Not Interested Leads",
    tabValue: TELECALLER_LEAD_TAB_VALUES.NOT_INTERESTED,
    status: "Not Interested",
    followUp: undefined,
  },
  [TELECALLER_LEAD_TAB_VALUES.CONVERTED]: {
    label: "Converted",
    sidebarChild: "My Leads",
    tabValue: TELECALLER_LEAD_TAB_VALUES.CONVERTED,
    status: "Converted",
    followUp: undefined,
  },
} as const;

export type TelecallerLeadTabValue =
  (typeof TELECALLER_LEAD_TAB_VALUES)[keyof typeof TELECALLER_LEAD_TAB_VALUES];

export function buildTelecallerMyLeadsPath(params: {
  tab?: TelecallerLeadTabValue | string;
  followUp?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.tab) searchParams.set("tab", params.tab);
  if (params.followUp) searchParams.set("followUp", params.followUp);

  return `${TELECALLER_MY_LEADS_PATH}?${searchParams.toString()}`;
}

export function getTelecallerLeadFiltersFromSearchParams(
  searchParams: URLSearchParams,
) {
  const tab = (searchParams.get("tab") ||
    TELECALLER_LEAD_TAB_VALUES.ALL) as TelecallerLeadTabValue;
  const followUp = searchParams.get("followUp") || undefined;

  const config =
    TELECALLER_LEAD_TAB_CONFIG[tab] ||
    TELECALLER_LEAD_TAB_CONFIG[TELECALLER_LEAD_TAB_VALUES.ALL];

  let sidebarChild: string = config.sidebarChild;
  if (tab === TELECALLER_LEAD_TAB_VALUES.FOLLOW_UPS) {
    if (followUp === TELECALLER_FOLLOW_UP_FILTER_VALUES.MISSED) {
      sidebarChild = "Missed Follow-ups";
    } else {
      // Default follow-ups in sidebar is "Today's Follow-ups"
      sidebarChild = "Today's Follow-ups";
    }
  }

  return {
    tab,
    followUp,
    status: config.status,
    sidebarChild,
    label: config.label,
  };
}
