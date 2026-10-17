import { useEffect, useState } from "react";
import {
  defaultLoginPageCms,
  type LoginPageCmsData,
} from "../../admin/settings/LoginPageCmsModal";
import { useLoginTenant } from "./useLoginTenant";

export function useLoginPageCms(): LoginPageCmsData {
  const { data: tenant } = useLoginTenant();
  const [cmsData, setCmsData] = useState<LoginPageCmsData>(() => {
    try {
      const stored = localStorage.getItem("truroot_login_cms");
      if (stored) {
        return { ...defaultLoginPageCms, ...JSON.parse(stored) };
      }
    } catch {
      /* ignore */
    }
    return defaultLoginPageCms;
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTenantCms() {
      try {
        if (tenant) {
          const org = tenant;
          const loginCms: Partial<LoginPageCmsData> | undefined = org.loginCms;

          if (loginCms && isMounted) {
            setCmsData({
              ...defaultLoginPageCms,
              ...loginCms,
              heroHeadlineHighlight: loginCms.heroHeadlineHighlight || org.name,
              heroLogoUrl: loginCms.heroLogoUrl || org.logoUrl || "",
              supportPhone:
                loginCms.supportPhone || defaultLoginPageCms.supportPhone,
              supportEmail:
                loginCms.supportEmail || defaultLoginPageCms.supportEmail,
            });
            return;
          }

          if (org.name && isMounted) {
            setCmsData((prev) => ({
              ...prev,
              heroHeadlineHighlight: org.name,
              heroLogoUrl: org.logoUrl || prev.heroLogoUrl,
            }));
          }
        }
      } catch {
        /* ignore */
      }
    }

    loadTenantCms();

    const handleCmsUpdate = () => {
      try {
        const stored = localStorage.getItem("truroot_login_cms");
        if (stored && isMounted) {
          setCmsData({ ...defaultLoginPageCms, ...JSON.parse(stored) });
        }
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("truroot_login_cms_updated", handleCmsUpdate);
    window.addEventListener("storage", handleCmsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("truroot_login_cms_updated", handleCmsUpdate);
      window.removeEventListener("storage", handleCmsUpdate);
    };
  }, [tenant]);

  return cmsData;
}
