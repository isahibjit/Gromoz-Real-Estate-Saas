import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  connectRealtimeSocket,
  disconnectRealtimeSocket,
} from "../../../../common/realtime/realtimeSocket";
import { useAppSelector } from "../../../../store";

type LeadCreatedEvent = {
  version: 1;
  eventId: string;
  type: "lead.created";
  leadId: string;
  occurredAt: string;
};

function isLeadCreatedEvent(value: unknown): value is LeadCreatedEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    event.version === 1 &&
    event.type === "lead.created" &&
    typeof event.eventId === "string" &&
    typeof event.leadId === "string" &&
    typeof event.occurredAt === "string"
  );
}

export function useLeadRealtimeInvalidation() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const queryClient = useQueryClient();
  const seenEventIds = useRef(new Set<string>());

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectRealtimeSocket(accessToken);
    const invalidateLeadData = () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    };
    const handleLeadCreated = (event: unknown) => {
      if (!isLeadCreatedEvent(event) || seenEventIds.current.has(event.eventId)) {
        return;
      }
      seenEventIds.current.add(event.eventId);
      if (seenEventIds.current.size > 500) {
        const oldestEventId = seenEventIds.current.values().next().value;
        if (oldestEventId) seenEventIds.current.delete(oldestEventId);
      }
      invalidateLeadData();
    };

    socket.on("lead.created", handleLeadCreated);
    socket.on("connect", invalidateLeadData);

    return () => {
      socket.off("lead.created", handleLeadCreated);
      socket.off("connect", invalidateLeadData);
      disconnectRealtimeSocket();
    };
  }, [accessToken, queryClient]);
}
