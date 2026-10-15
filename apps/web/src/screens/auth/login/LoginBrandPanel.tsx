import { ChartNoAxesCombined, MapPinned, UsersRound } from "lucide-react";

import loginBuildings from "../../../assets/login-buildings.png";
import { BrandLogo } from "../../../components/ui/BrandLogo";
import { LoginFeatureItem } from "./LoginFeatureItem";

const features = [
  {
    title: "Manage Leads Efficiently",
    description: "Capture, assign & follow up leads seamlessly.",
    icon: UsersRound,
  },
  {
    title: "Track Performance",
    description: "Real-time reports and analytics dashboard.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Live Tracking",
    description: "Track sales executives in real-time.",
    icon: MapPinned,
  },
];

export function LoginBrandPanel() {
  return (
    <div className="relative flex h-full min-h-[860px] overflow-hidden bg-transparent">
      <img
        src={loginBuildings}
        alt=""
        aria-hidden="true"
        className="absolute bottom-0 left-0 z-0 h-auto w-[84%] object-contain object-bottom xl:w-[88%]"
      />

      <div className="relative z-10 flex h-full w-full flex-col px-10  xl:px-16 ">
        <BrandLogo className="my-2 h-auto w-80 max-w-full" />

        <div className="mt-8 max-w-[620px] xl:mt-10">
          <h1 className="text-[2.2rem] font-bold leading-tight text-foreground xl:text-[2.55rem]">
            Welcome to
            <span className="mt-1.5 block text-[3rem] font-extrabold leading-[1.05] xl:text-[3.5rem]">
              <span className="text-primary">Gromoze</span>
            </span>
          </h1>
          <p className="mt-5 max-w-[540px] text-[1.1rem] leading-8 text-muted-foreground xl:text-[1.22rem] xl:leading-9">
            The complete real estate CRM to manage leads, customers, site visits
            & close more deals.
          </p>
        </div>

        <div className="mt-9 max-w-[560px] space-y-5 xl:mt-10">
          {features.map((feature) => (
            <LoginFeatureItem
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
