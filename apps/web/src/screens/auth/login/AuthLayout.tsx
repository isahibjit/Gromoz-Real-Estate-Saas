import type { MouseEvent, PropsWithChildren } from "react";
import { ShieldCheck } from "lucide-react";

import onboardBuildings from "../../../assets/onboard-buildings.png";
import trurootLogo from "../../../assets/truroot-logo.png";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { useLoginPageCms } from "./useLoginPageCms";

export const defaultAuthSupport = {
  phone: "+91 98765 43210",
  email: "support@truerootrealty.com",
};

interface AuthLayoutProps extends PropsWithChildren {
  logoSrc?: string;
  heroImageSrc?: string;
  supportPhone?: string;
  supportEmail?: string;
  termsUrl?: string;
  privacyUrl?: string;
}

export function AuthLayout({
  children,
  logoSrc,
  heroImageSrc,
  termsUrl,
  privacyUrl,
}: AuthLayoutProps) {
  const cms = useLoginPageCms();

  const effectiveLogo = logoSrc || cms.heroLogoUrl || trurootLogo;
  const effectiveBg = heroImageSrc || cms.heroBgImageUrl || onboardBuildings;
  const effectiveTerms = termsUrl || cms.termsUrl || "/terms";
  const effectivePrivacy = privacyUrl || cms.privacyUrl || "/privacy-policy";

  const handlePlaceholderAction = (event: MouseEvent<HTMLAnchorElement>) => {
    if (effectiveTerms === "#" || effectivePrivacy === "#") {
      event.preventDefault();
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef5ff] text-foreground">
      <img
        src={effectiveBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-black/30"
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.78fr)]">
        <AuthBrandPanel logoSrc={effectiveLogo} heroImageSrc={effectiveBg} cms={cms} />

        <section className="flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-7 xl:px-8">
          <div className="flex flex-1 items-center justify-center py-3 lg:justify-start">
            <div className="w-full max-w-[520px] 2xl:max-w-[580px]">
              {children}
              <div className="mt-5 flex items-center justify-center gap-2 text-center text-sm font-semibold text-secondary">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 shrink-0 text-white"
                />
                <span className="text-xs text-white">
                  By logging in, you agree to our{" "}
                  <a
                    href={effectiveTerms}
                    className="font-extrabold text-primary hover:text-primary-hover"
                    onClick={handlePlaceholderAction}
                  >
                    Terms of Use
                  </a>{" "}
                  and{" "}
                  <a
                    href={effectivePrivacy}
                    className="font-extrabold text-primary hover:text-primary-hover"
                    onClick={handlePlaceholderAction}
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
