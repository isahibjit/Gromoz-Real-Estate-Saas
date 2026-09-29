import {
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LoginPageCmsData } from "../settings/LoginPageCmsModal";

const defaultIcons = [ChartNoAxesCombined, UsersRound, Building2, BarChart3];

interface AuthBrandPanelProps {
  logoSrc: string;
  heroImageSrc?: string;
  cms?: LoginPageCmsData;
}

export function AuthBrandPanel({ logoSrc, cms }: AuthBrandPanelProps) {
  const headlinePrefix = cms?.heroHeadlinePrefix ?? "Welcome to";
  const headlineHighlight = cms?.heroHeadlineHighlight ?? "Trueroot Realty CRM";
  const tagline = cms?.heroTagline ?? "Streamline your leads, follow-ups, site visits and sales - all in one place.";
  const features = cms?.features ?? [
    { title: "Manage Leads" },
    { title: "Track Activities" },
    { title: "Close More Deals" },
    { title: "Boost Productivity" },
  ];
  const trustTitle = cms?.trustBadgeTitle ?? "Secure. Reliable. Always with You.";
  const trustDesc = cms?.trustBadgeDescription ?? "Your data is protected with enterprise grade security.";

  return (
    <aside className="relative flex min-h-[520px] flex-col overflow-hidden px-6 pb-7 pt-6 sm:px-9 lg:min-h-screen lg:px-10 xl:px-12 2xl:px-16">
      <div className="relative z-10 flex flex-1 flex-col">
        <img
          src={logoSrc}
          alt="Brand Logo"
          className="h-auto w-[190px] sm:w-[235px] lg:w-[245px] 2xl:w-[285px] max-h-[70px] object-contain object-left"
        />

        <div className="mt-10 max-w-[600px] sm:mt-12 lg:mt-16 2xl:mt-20">
          <h1 className="text-[2.05rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-secondary sm:text-[2.45rem] xl:text-[2.75rem] 2xl:text-[3.2rem]">
            {headlinePrefix}
            <span className="mt-2 block text-primary">{headlineHighlight}</span>
          </h1>
          <div className="mt-5 h-0.5 w-16 rounded-full bg-primary 2xl:mt-7 2xl:w-20" />
          <p className="mt-5 max-w-[500px] text-base font-semibold leading-7 text-secondary sm:text-lg sm:leading-8 2xl:mt-7 2xl:text-xl 2xl:leading-9">
            {tagline}
          </p>
        </div>

        <div className="mt-7 grid max-w-[540px] grid-cols-2 gap-3 sm:grid-cols-4 2xl:mt-8 2xl:max-w-[620px] 2xl:gap-4">
          {features.slice(0, 4).map((feature, idx) => (
            <AuthFeatureCard
              key={idx}
              title={feature.title}
              icon={defaultIcons[idx % defaultIcons.length]}
            />
          ))}
        </div>

        <div className="my-auto pt-32 sm:pt-44 lg:pt-0">
          <div className="max-w-[390px] rounded-md border border-secondary bg-secondary p-4 text-white 2xl:max-w-[430px] 2xl:p-5">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-secondary text-white 2xl:size-12">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-6 2xl:size-7"
                  strokeWidth={1.8}
                />
              </span>
              <div>
                <h2 className="text-sm font-extrabold 2xl:text-base">
                  {trustTitle}
                </h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-white/88 2xl:text-sm 2xl:leading-6">
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
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-h-[86px] flex-col hover:scale-105 transition-all duration-200 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 text-center 2xl:min-h-[104px] 2xl:gap-3 2xl:py-4 shadow-2xs">
      <Icon
        aria-hidden="true"
        className="size-6 text-blue-700 2xl:size-8"
        strokeWidth={1.8}
      />
      <p className="text-[11px] font-extrabold leading-tight text-secondary 2xl:text-[12px]">
        {title}
      </p>
    </div>
  );
}
