import { FileSpreadsheet, Globe2, Megaphone, type LucideIcon } from "lucide-react";

import { cn } from "ui";

export type LeadSourceConnectorId =
  | "magicbricks"
  | "99acres"
  | "housing"
  | "meta"
  | "website";

export type ConnectorState =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "ACTIVE"
  | "PAUSED"
  | "ERROR";

export interface ConnectorSummary {
  readonly id: LeadSourceConnectorId;
  readonly state: ConnectorState;
  readonly leadCount: number;
  readonly lastLeadReceivedAt: string | null;
  readonly lastTestStatus: string | null;
}

export interface LeadSourceConnectorDefinition {
  readonly id: LeadSourceConnectorId;
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly icon: LucideIcon;
  readonly tone: string;
}

export const LEAD_SOURCE_CONNECTORS: readonly LeadSourceConnectorDefinition[] = [
  {
    id: "magicbricks",
    name: "MagicBricks",
    description: "Receive and route portal enquiries automatically.",
    route: "/leads/import/connect/magicbricks",
    icon: FileSpreadsheet,
    tone: "bg-red-600 text-white",
  },
  {
    id: "99acres",
    name: "99acres",
    description: "Connect webhook delivery and field mapping.",
    route: "/leads/import/connect/99acres",
    icon: FileSpreadsheet,
    tone: "bg-sky-500 text-white",
  },
  {
    id: "housing",
    name: "Housing.com",
    description: "Capture Housing.com leads in this workspace.",
    route: "/leads/import/connect/housing",
    icon: FileSpreadsheet,
    tone: "bg-violet-700 text-white",
  },
  {
    id: "meta",
    name: "Meta Lead Ads",
    description: "Sync Facebook and Instagram lead forms.",
    route: "/leads/import/connect/meta",
    icon: Megaphone,
    tone: "bg-white text-blue-700",
  },
  {
    id: "website",
    name: "Website Lead Capture",
    description: "Connect website forms and routing rules.",
    route: "/leads/import/connect/website",
    icon: Globe2,
    tone: "bg-white text-blue-700",
  },
] as const;

export const CONNECTOR_STATE_LABEL: Record<ConnectorState, string> = {
  NOT_CONFIGURED: "Not configured",
  CONFIGURED: "Configured",
  ACTIVE: "Active",
  PAUSED: "Paused",
  ERROR: "Needs attention",
};

export function LeadSourceConnectorMark({
  connector,
}: {
  connector: LeadSourceConnectorDefinition;
}) {
  if (connector.id === "magicbricks") {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-3xl font-extrabold leading-none text-white">
        m
      </span>
    );
  }

  if (connector.id === "housing") {
    return (
      <span className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-violet-700 text-white">
        <span className="text-xl font-extrabold leading-none">H</span>
        <span className="text-[7px] font-bold uppercase tracking-wider">
          Housing
        </span>
      </span>
    );
  }

  if (connector.id === "99acres") {
    return (
      <span className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-sky-500 text-white">
        <span className="text-2xl font-extrabold leading-none">99</span>
        <span className="text-[8px] font-bold leading-none">acres</span>
      </span>
    );
  }

  if (connector.id === "meta") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 72 44"
        className="h-11 w-14 text-blue-600"
      >
        <path
          d="M8 32c4-14 10-24 17-24 5 0 9 4 13 11 4-7 8-11 13-11 8 0 14 8 14 18 0 7-4 12-10 12-7 0-12-6-17-15-5 9-10 15-17 15-7 0-13-2-13-6Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="7"
        />
      </svg>
    );
  }

  const Icon = connector.icon;
  return (
    <span
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200",
        connector.tone,
      )}
    >
      <Icon className="h-6 w-6" />
    </span>
  );
}
