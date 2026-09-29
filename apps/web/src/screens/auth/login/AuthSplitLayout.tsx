import type { PropsWithChildren, ReactNode } from "react";
import { Phone } from "lucide-react";

interface AuthSplitLayoutProps extends PropsWithChildren {
  aside: ReactNode;
}

export function AuthSplitLayout({ aside, children }: AuthSplitLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-auth-page text-foreground">
      <div className="grid min-h-screen lg:min-h-[max(940px,calc(100vh-3rem))] lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)]">
        <aside className="order-2 hidden min-h-0 overflow-hidden lg:order-1 lg:block">
          {aside}
        </aside>

        <section className="order-1 flex min-h-screen flex-col bg-transparent px-4 py-5 sm:px-6 lg:order-2 lg:min-h-[940px] lg:px-6 lg:py-7 xl:px-8">
          <div className="mx-auto flex w-full max-w-[640px] justify-end lg:mx-0 lg:mr-auto">
            <a
              href="tel:+911234567890"
              className="inline-flex items-center gap-3 text-sm font-medium text-foreground transition-colors hover:text-primary sm:text-base lg:text-[1.05rem]"
            >
              <span>Need Help?</span>
              <Phone aria-hidden="true" className="size-4 text-secondary" />
              <span className="font-bold">+91 12345 67890</span>
            </a>
          </div>

          <div className="flex flex-1 flex-col justify-center py-5 lg:min-h-0 lg:py-6">
            {children}
          </div>
        </section>
      </div>

      <footer className="relative flex h-12 items-center justify-center border-t border-border/50 bg-auth-soft px-5 text-xs text-muted-foreground sm:text-sm">
        <p>&copy; {currentYear} Trueroot Realty CRM. All Rights Reserved.</p>
        <p className="absolute right-5 hidden sm:block lg:right-12">
          Version 1.0.0
        </p>
      </footer>
    </main>
  );
}
