import {
  defaultLoginPageCms,
  type LoginPageCmsData,
} from "../../admin/settings/LoginPageCmsModal";
import { useLoginTenant } from "./useLoginTenant";

export function useLoginPageCms(): LoginPageCmsData {
  const { data: tenant } = useLoginTenant();
  if (!tenant) return defaultLoginPageCms;

  const loginCms = tenant.loginCms;
  return {
    ...defaultLoginPageCms,
    ...loginCms,
    heroHeadlineHighlight: loginCms?.heroHeadlineHighlight || tenant.name,
    heroLogoUrl: loginCms?.heroLogoUrl || tenant.logoUrl || "",
    supportPhone: loginCms?.supportPhone || defaultLoginPageCms.supportPhone,
    supportEmail: loginCms?.supportEmail || defaultLoginPageCms.supportEmail,
  };
}
