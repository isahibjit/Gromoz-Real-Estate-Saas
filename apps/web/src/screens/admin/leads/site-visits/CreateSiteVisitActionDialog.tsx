import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../../../common/apiError";
import { scheduledInputToIso } from "../../../../common/time";
import { useQueryClient } from "@tanstack/react-query";

import {
  CreateSiteVisitModal,
  type CreateVisitFormState,
  type SiteVisitRow,
} from "./SiteVisitsScreen";
import {
  useSiteVisitMutations,
  useSiteVisitOptions,
  type SiteVisitOptionsResponse,
} from "./useSiteVisits";
import { getUnitsByProjectId } from "../../projects/projectCatalogUtils";

export interface SiteVisitActionLeadTarget {
  id: string;
  name: string;
  mobile?: string;
  preferredProjectId?: string;
}

const createInitialForm = (
  leadId: string,
  projectId = "",
  projectCatalog: SiteVisitOptionsResponse["projects"] = [],
): CreateVisitFormState => ({
  leadId,
  projectId,
  unitId: projectId
    ? getUnitsByProjectId(projectCatalog, projectId)[0]?.id ?? ""
    : "",
  date: "",
  time: "10:00 AM",
  visitType: "Site Visit",
  meetingPoint: "Sales Gallery",
  durationMinutes: "60",
  transportMode: "Own Vehicle",
  visitorCount: "2",
  specialRequest: "",
});

export function CreateSiteVisitActionDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: SiteVisitActionLeadTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const optionsQuery = useSiteVisitOptions();
  const visitMutations = useSiteVisitMutations();
  const projectCatalog = optionsQuery.data?.projects ?? [];
  const [form, setForm] = useState<CreateVisitFormState>(() =>
    createInitialForm(lead.id, lead.preferredProjectId ?? "", projectCatalog),
  );

  useEffect(() => {
    if (!open) return;
    const matchedLead = optionsQuery.data?.leads.find(
      (item) => item.id === lead.id,
    );
    const projectId =
      matchedLead?.preferredProjectId ?? lead.preferredProjectId ?? "";
    setForm(createInitialForm(lead.id, projectId, projectCatalog));
  }, [
    lead.id,
    lead.preferredProjectId,
    open,
    optionsQuery.data?.leads,
    projectCatalog,
  ]);

  const handleSubmit = async () => {
    if (!form.leadId || !form.projectId || !form.date || !form.time) {
      return;
    }

    await visitMutations.createVisit.mutateAsync({
      leadId: form.leadId,
      projectId: form.projectId,
      unitId: form.unitId || undefined,
      visitType: form.visitType,
      scheduledAt: scheduledInputToIso(form.date, form.time),
      meetingPoint: form.meetingPoint || undefined,
      durationMinutes: Number(form.durationMinutes) || undefined,
      transportMode: form.transportMode || undefined,
      visitorCount: Number(form.visitorCount) || undefined,
      specialRequest: form.specialRequest || undefined,
      status: "Scheduled",
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lead-details", lead.id] }),
      queryClient.invalidateQueries({ queryKey: ["lead-timeline", lead.id] }),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
    ]);

    toast.success(`Site visit scheduled for ${lead.name}`);
    onOpenChange(false);
  };

  return (
    <CreateSiteVisitModal
      open={open}
      form={form}
      rows={[] as SiteVisitRow[]}
      optionsData={optionsQuery.data}
      isSaving={visitMutations.createVisit.isPending}
      lockedLeadId={lead.id}
      onOpenChange={onOpenChange}
      onChange={(field, value) =>
        setForm((current) => ({ ...current, [field]: value }))
      }
      onSubmit={() => {
        void handleSubmit().catch((error: unknown) =>
          toast.error(
            getApiErrorMessage(error, "Unable to schedule site visit"),
          ),
        );
      }}
    />
  );
}
