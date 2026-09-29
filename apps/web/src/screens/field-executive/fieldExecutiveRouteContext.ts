export const FIELD_EXECUTIVE_BASE_PATH = "/field-executive";
export const FIELD_EXECUTIVE_LEADS_PATH = `${FIELD_EXECUTIVE_BASE_PATH}/leads`;
export const FIELD_EXECUTIVE_SITE_VISITS_PATH = `${FIELD_EXECUTIVE_BASE_PATH}/site-visits`;
export const FIELD_EXECUTIVE_SITE_VISIT_DETAILS_PATH = `${FIELD_EXECUTIVE_SITE_VISITS_PATH}/:visitId`;

export function isFieldExecutivePath(pathname: string) {
  return pathname.startsWith(FIELD_EXECUTIVE_BASE_PATH);
}

export function buildFieldExecutiveLeadPath(leadId: string) {
  return `${FIELD_EXECUTIVE_LEADS_PATH}/${leadId}`;
}

export function buildFieldExecutiveLeadSiteVisitsPath(leadId: string) {
  return `${buildFieldExecutiveLeadPath(leadId)}/site-visits`;
}

export function buildFieldExecutiveSiteVisitPath(visitId: string) {
  return `${FIELD_EXECUTIVE_SITE_VISITS_PATH}/${visitId}`;
}
