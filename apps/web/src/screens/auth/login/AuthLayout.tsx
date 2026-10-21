import type { MouseEvent, PropsWithChildren } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, cn } from "ui";

import onboardBuildings from "../../../assets/onboard-buildings.png";
import platformLoginBackground from "../../../assets/platform-login-background.png";
import platformLoginWave from "../../../assets/platform-login-wave.png";
import { defaultLoginPageCms } from "../../admin/settings/LoginPageCmsModal";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { useLoginPageCms } from "./useLoginPageCms";

export { defaultAuthSupport } from "../authSupport";

interface AuthLayoutProps extends PropsWithChildren {
  variant?: "default" | "platform";
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
  variant = "default",
}: AuthLayoutProps) {
  const configuredCms = useLoginPageCms();
  const isPlatform = variant === "platform";
  const cms = isPlatform ? defaultLoginPageCms : configuredCms;

  const effectiveLogo = logoSrc || cms.heroLogoUrl;
  const effectiveBg =
    heroImageSrc ||
    cms.heroBgImageUrl ||
    (isPlatform ? platformLoginBackground : onboardBuildings);
  const effectiveTerms = termsUrl || cms.termsUrl || "/terms";
  const effectivePrivacy = privacyUrl || cms.privacyUrl || "/privacy-policy";

  const handlePlaceholderAction = (event: MouseEvent<HTMLAnchorElement>) => {
    if (effectiveTerms === "#" || effectivePrivacy === "#") {
      event.preventDefault();
    }
  };

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden bg-auth-surface text-foreground",
        isPlatform && "platform-login",
      )}
    >
      <img
        src={effectiveBg}
        alt=""
        aria-hidden="true"
        className="auth-background pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
      />
      <div
        aria-hidden="true"
        className="auth-background-overlay pointer-events-none absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-black/30"
      />
      {isPlatform ? (
        <img
          src={platformLoginWave}
          alt=""
          aria-hidden="true"
          className="platform-wave"
          decoding="async"
        />
      ) : null}

      <div className="auth-layout-grid relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.78fr)]">
        <AuthBrandPanel
          logoSrc={effectiveLogo}
          heroImageSrc={effectiveBg}
          cms={cms}
          variant={variant}
        />

        <section
          aria-label="Account access"
          className="auth-access-panel flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-7 xl:px-8"
        >
          {isPlatform ? (
            <div className="platform-sales">
              <span>New to Gromoze?</span>
              <Button asChild variant="outline">
                <a
                  href={`mailto:${cms.supportEmail}?subject=Gromoze%20sales%20enquiry`}
                >
                  Contact sales
                </a>
              </Button>
            </div>
          ) : null}
          <div className="auth-form-position flex flex-1 items-center justify-center py-3 lg:justify-start">
            <div className="auth-form-container w-full max-w-[520px] 2xl:max-w-[580px]">
              {children}
              <div className="auth-legal mt-5 flex items-center justify-center gap-2 text-center text-sm font-semibold text-secondary">
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
