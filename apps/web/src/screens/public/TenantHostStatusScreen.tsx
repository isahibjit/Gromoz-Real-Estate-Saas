import {
  ArrowRight,
  Building2,
  Globe2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { PLATFORM_HOST, TENANT_BASE_DOMAIN } from "@truroot/shared";
import { Button, Card } from "ui";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { defaultAuthSupport } from "../auth/authSupport";

interface TenantHostStatusScreenProps {
  state: "loading" | "not-found" | "error";
  host: string;
  onRetry: () => void;
}

export function TenantHostStatusScreen({
  state,
  host,
  onRetry,
}: TenantHostStatusScreenProps) {
  const websiteUrl = `https://${TENANT_BASE_DOMAIN}`;
  const supportUrl = `mailto:${
    defaultAuthSupport.email
  }?subject=${encodeURIComponent(
    state === "not-found"
      ? `Workspace enquiry: ${host}`
      : `Workspace access help: ${host}`,
  )}&body=${encodeURIComponent(
    `Hello Gromoze team,\n\nI would like help with the workspace at ${host}.\n\n`,
  )}`;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <a
            href={websiteUrl}
            aria-label="Gromoze home"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo className="w-32 sm:w-48" />
          </a>
          <Button variant="ghost" size="sm" asChild>
            <a href={`mailto:${defaultAuthSupport.email}`}>
              <Mail className="size-4" aria-hidden="true" />
              Get in touch
            </a>
          </Button>
        </div>
      </header>

      {state === "loading" ? (
        <main
          className="flex flex-1 items-center justify-center px-6 py-16"
          aria-busy="true"
        >
          <div
            role="status"
            className="flex flex-col items-center gap-4 text-center"
          >
            <Loader2
              className="size-7 animate-spin text-primary motion-reduce:animate-none"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold">Finding your workspace</h1>
            <p className="max-w-md break-all text-sm text-muted-foreground">
              {host}
            </p>
          </div>
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-10 px-6 py-12 sm:px-10 sm:py-20 lg:grid-cols-5 lg:gap-16">
          <section
            className="min-w-0 lg:col-span-3"
            aria-labelledby="workspace-status-title"
          >
            <div className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Building2 className="size-5" aria-hidden="true" />
              {state === "not-found"
                ? "Workspace not found"
                : "Workspace connection"}
            </div>
            <h1
              id="workspace-status-title"
              className="max-w-lg text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            >
              {state === "not-found"
                ? "This workspace hasn't been created yet."
                : "We couldn't check this workspace."}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              {state === "not-found"
                ? "No workspace has been created under this name. Check the address, or contact us to get your team started with Gromoze."
                : "The connection was interrupted. Try again in a moment, or contact our team if you still can't get through."}
            </p>
            <div className="mt-8 flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card px-5 py-4">
              <Globe2
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Workspace address
                </p>
                <p className="break-all text-base font-semibold">{host}</p>
              </div>
            </div>
            {state === "error" && (
              <Button onClick={onRetry} className="mt-6">
                <RefreshCw className="size-4" aria-hidden="true" />
                Try again
              </Button>
            )}
            {state === "not-found" && (
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Already have a workspace? Use the link in your welcome email or
                ask your workspace administrator for the correct address.
              </p>
            )}
          </section>

          <Card className="self-center p-6 sm:p-8 lg:col-span-2">
            <BrandLogo variant="mark" className="mb-6 h-12 w-12" />
            <h2 className="text-xl font-bold">
              {state === "not-found"
                ? "A home for your sales team"
                : "Need a hand getting in?"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {state === "not-found"
                ? "Bring your leads, follow-ups and sales into one workspace. Talk to us about the right plan and workspace name for your team."
                : "Share your workspace address with our support team. We'll help you find your way back."}
            </p>
            <Button asChild className="mt-6 w-full">
              <a href={supportUrl}>
                {state === "not-found" ? "Contact sales" : "Contact support"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" className="mt-3 w-full">
              <a href={websiteUrl}>Explore Gromoze</a>
            </Button>
            <p className="mt-5 break-all text-center text-xs text-muted-foreground">
              {defaultAuthSupport.email}
            </p>
          </Card>
        </main>
      )}

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 border-t border-border px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-10">
        <span>Gromoze. Real estate sales, simplified.</span>
        <Button variant="ghost" size="sm" asChild>
          <a href={`https://${PLATFORM_HOST}/login`}>
            Platform sign in
            <ArrowRight className="size-3" aria-hidden="true" />
          </a>
        </Button>
      </footer>
    </div>
  );
}
