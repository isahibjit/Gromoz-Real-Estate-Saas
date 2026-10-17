import {
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "ui";
import type { LoginPageCmsData } from "../../admin/settings/LoginPageCmsModal";
import { BrandLogo } from "../../../components/ui/BrandLogo";

const defaultIcons = [ChartNoAxesCombined, UsersRound, Building2, BarChart3];
const featureDescriptions = [
  "Capture and organize leads effortlessly",
  "Never miss a follow-up",
  "Streamline your sales process",
  "Get real insights and reports",
];

interface AuthBrandPanelProps {
  logoSrc?: string;
  heroImageSrc?: string;
  cms?: LoginPageCmsData;
  compact?: boolean;
  variant?: "default" | "platform";
}

export function AuthBrandPanel({
  logoSrc,
  cms,
  compact = false,
  variant = "default",
}: AuthBrandPanelProps) {
  const isPlatform = variant === "platform";
  const headlinePrefix = cms?.heroHeadlinePrefix ?? "Welcome to";
  const headlineHighlight = cms?.heroHeadlineHighlight ?? "Gromoze";
  const tagline =
    cms?.heroTagline ??
    "Streamline your leads, follow-ups, site visits and sales - all in one place.";
  const features = cms?.features ?? [
    { title: "Manage Leads" },
    { title: "Track Activities" },
    { title: "Close More Deals" },
    { title: "Boost Productivity" },
  ];
  const trustTitle =
    cms?.trustBadgeTitle ?? "Secure. Reliable. Always with You.";
  const trustDesc =
    cms?.trustBadgeDescription ??
    "Your data is protected with enterprise grade security.";
  const Headline = compact ? "h4" : "h1";
  const TrustHeading = compact ? "h5" : "h2";

  return (
    <aside
      className={cn(
        "relative flex flex-col overflow-hidden",
        isPlatform && "platform-brand-panel",
        compact
          ? "p-5"
          : "min-h-[520px] px-6 pb-7 pt-6 sm:px-9 lg:min-h-screen lg:px-10 xl:px-12 2xl:px-16",
      )}
    >
      <div className="auth-brand-content relative z-10 flex flex-1 flex-col">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Brand Logo"
            className={
              compact
                ? "h-10 w-40 max-w-full object-contain object-left"
                : "h-auto w-[190px] sm:w-[235px] lg:w-[245px] 2xl:w-[285px] max-h-[70px] object-contain object-left"
            }
          />
        ) : (
          <BrandLogo
            className={compact ? "h-auto w-40" : "h-auto w-64 sm:w-72"}
          />
        )}

        <div
          data-slot="auth-hero"
          className={
            compact ? "mt-6" : "mt-10 max-w-[600px] sm:mt-12 lg:mt-16 2xl:mt-20"
          }
        >
          {isPlatform ? (
            <p className="platform-product-label">All-in-one real estate CRM</p>
          ) : null}
          <Headline
            className={cn(
              "auth-headline font-extrabold text-secondary",
              compact
                ? "text-xl leading-tight break-words"
                : "text-[2.05rem] leading-[1.08] tracking-[-0.04em] sm:text-[2.45rem] xl:text-[2.75rem] 2xl:text-[3.2rem]",
            )}
          >
            {headlinePrefix}{" "}
            <span className="mt-2 block text-primary">{headlineHighlight}</span>
          </Headline>
          <div
            className={cn(
              "auth-heading-rule h-0.5 w-16 rounded-full bg-primary",
              compact ? "mt-3" : "mt-5 2xl:mt-7 2xl:w-20",
            )}
          />
          <p
            className={cn(
              "auth-tagline",
              compact
                ? "mt-3 text-xs font-medium leading-5 text-secondary break-words"
                : "mt-5 max-w-[500px] text-base font-semibold leading-7 text-secondary sm:text-lg sm:leading-8 2xl:mt-7 2xl:text-xl 2xl:leading-9",
            )}
          >
            {tagline}
          </p>
        </div>

        <div
          className={cn(
            "auth-features",
            compact
              ? "mt-5 grid grid-cols-2 gap-2"
              : "mt-7 grid max-w-[540px] grid-cols-2 gap-3 sm:grid-cols-4 2xl:mt-8 2xl:max-w-[620px] 2xl:gap-4",
          )}
        >
          {features.slice(0, 4).map((feature, idx) => (
            <AuthFeatureCard
              key={idx}
              title={feature.title}
              icon={defaultIcons[idx % defaultIcons.length]}
              compact={compact}
              description={isPlatform ? featureDescriptions[idx] : undefined}
            />
          ))}
        </div>

        <div
          className={cn(
            "auth-trust-position",
            compact ? "mt-auto pt-5" : "my-auto pt-32 sm:pt-44 lg:pt-0",
          )}
        >
          <div
            className={cn(
              "auth-trust-panel rounded-md border border-secondary bg-secondary text-white",
              compact ? "p-3" : "max-w-[390px] p-4 2xl:max-w-[430px] 2xl:p-5",
            )}
          >
            <div
              className={cn("flex items-start", compact ? "gap-2" : "gap-4")}
            >
              <span
                className={
                  compact
                    ? "shrink-0 text-white"
                    : "flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-secondary text-white 2xl:size-12"
                }
              >
                <ShieldCheck
                  aria-hidden="true"
                  className={compact ? "size-4" : "size-6 2xl:size-7"}
                  strokeWidth={1.8}
                />
              </span>
              <div>
                <TrustHeading
                  className={
                    compact
                      ? "text-xs font-bold break-words"
                      : "text-sm font-extrabold 2xl:text-base"
                  }
                >
                  {trustTitle}
                </TrustHeading>
                <p
                  className={
                    compact
                      ? "mt-1 text-xs leading-5 text-white break-words"
                      : "mt-2 text-xs font-semibold leading-5 text-white/88 2xl:text-sm 2xl:leading-6"
                  }
                >
                  {trustDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AuthFeatureCard({
  title,
  icon: Icon,
  compact = false,
  description,
}: {
  title: string;
  icon: LucideIcon;
  compact?: boolean;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "auth-feature flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-3 text-center",
        compact
          ? "min-w-0"
          : "min-h-[86px] hover:scale-105 transition-all duration-200 2xl:min-h-[104px] 2xl:gap-3 2xl:py-4 shadow-2xs",
      )}
    >
      <span className={description ? "auth-feature-icon" : undefined}>
        <Icon
          aria-hidden="true"
          className={cn(
            "text-primary",
            compact ? "size-4" : "size-6 2xl:size-8",
          )}
          strokeWidth={1.8}
        />
      </span>
      <p
        className={
          compact
            ? "text-xs font-semibold leading-tight text-secondary break-words"
            : "text-[11px] font-extrabold leading-tight text-secondary 2xl:text-[12px]"
        }
      >
        {title}
      </p>
      {description ? (
        <p className="auth-feature-description">{description}</p>
      ) : null}
    </div>
  );
}
