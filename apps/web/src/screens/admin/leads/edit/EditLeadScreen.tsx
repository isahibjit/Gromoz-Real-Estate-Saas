import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function EditLeadScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { leadId = "" } = useParams<{ leadId: string }>();

  useEffect(() => {
    if (!leadId) return;

    const nextState =
      typeof location.state === "object" && location.state !== null
        ? { ...(location.state as Record<string, unknown>), openEditLead: true }
        : { openEditLead: true };

    navigate(`/leads/${leadId}`, {
      replace: true,
      state: nextState,
    });
  }, [leadId, location.state, navigate]);

  return null;
}
