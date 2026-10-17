import { ArrowRight, LockKeyhole, Smartphone } from "lucide-react";
import { Button, Input } from "ui";
import onboardBuildings from "../../../assets/onboard-buildings.png";
import { AuthBrandPanel } from "../../auth/login/AuthBrandPanel";
import { AuthCard } from "../../auth/login/AuthCard";
import { SupportBox } from "../../auth/login/SupportBox";
import type { LoginPageCmsData } from "./LoginPageCmsModal";

interface LoginPagePreviewProps {
  readonly data: LoginPageCmsData;
}

/** Read-only rendering shared by workspace settings and the live CMS editor. */
export function LoginPagePreview({ data }: LoginPagePreviewProps) {
  return (
    <div className="login-page-preview overflow-hidden rounded-lg border border-border bg-auth-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <h3 className="text-xs font-semibold text-foreground">
          Login page preview
        </h3>
        <span className="text-xs text-muted-foreground">Preview only</span>
      </div>
      <div className="relative isolate">
        <img
          src={data.heroBgImageUrl || onboardBuildings}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-white/90"
        />
        <div className="login-page-preview-layout">
          <AuthBrandPanel
            cms={data}
            logoSrc={data.heroLogoUrl || undefined}
            compact
          />
          <div className="flex min-w-0 items-center p-5">
            <AuthCard className="min-w-0 w-full rounded-lg border-border bg-card p-5 sm:rounded-lg">
              <div className="mb-5 flex items-start gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 text-primary"
                />
                <div className="min-w-0">
                  <h4 className="break-words text-lg font-bold leading-tight text-secondary">
                    {data.cardTitle}
                  </h4>
                  <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                    {data.cardSubtitle}
                  </p>
                </div>
              </div>
              <fieldset
                disabled
                aria-label="Sign-in form preview"
                className="space-y-4"
              >
                <label className="block space-y-2 text-xs font-semibold text-secondary">
                  <span>Email or mobile number</span>
                  <Input
                    autoComplete="off"
                    placeholder="Enter email or mobile"
                    className="bg-card text-xs disabled:cursor-default disabled:opacity-100"
                  />
                </label>
                <label className="block space-y-2 text-xs font-semibold text-secondary">
                  <span>Password</span>
                  <Input
                    autoComplete="off"
                    type="password"
                    placeholder="Enter your password"
                    className="bg-card text-xs disabled:cursor-default disabled:opacity-100"
                  />
                </label>
                <Button
                  type="button"
                  className="w-full justify-between disabled:cursor-default disabled:opacity-100"
                >
                  Login <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
                {data.showDownloadApp ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-9 w-full whitespace-normal text-xs disabled:cursor-default disabled:opacity-100"
                  >
                    <Smartphone
                      aria-hidden="true"
                      className="mr-2 size-4 shrink-0"
                    />
                    {data.downloadAppLabel}
                  </Button>
                ) : null}
              </fieldset>
              <SupportBox
                title={data.supportTitle}
                subtitle={data.supportSubtitle}
                phone={data.supportPhone}
                email={data.supportEmail}
                compact
              />
            </AuthCard>
          </div>
        </div>
      </div>
    </div>
  );
}
