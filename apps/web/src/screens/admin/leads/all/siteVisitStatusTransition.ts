export function canStartSiteVisitStatusTransition(
  triggerAction: string,
  selectedLeadCount: number,
) {
  return triggerAction !== "CREATE_SITE_VISIT" || selectedLeadCount === 1;
}

export function splitSiteVisitLeadUpdate(
  payload: Readonly<Record<string, string>>,
  leadStatusId: string,
) {
  const ordinaryPayload = { ...payload };
  delete ordinaryPayload.statusId;

  return { ordinaryPayload, leadStatusId };
}
