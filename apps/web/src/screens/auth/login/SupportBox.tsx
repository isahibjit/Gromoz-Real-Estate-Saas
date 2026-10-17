import { Headphones, Mail, Phone } from "lucide-react";
import { cn } from "ui";

interface SupportBoxProps {
  title?: string;
  subtitle?: string;
  phone?: string;
  email?: string;
  compact?: boolean;
}

export function SupportBox({
  title = "Need help?",
  subtitle = "Contact our support team",
  phone = "+91 98700 66177",
  email = "support@gromoze.com",
  compact = false,
}: SupportBoxProps) {
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;
  const Contact = compact ? "span" : "a";
  const Title = compact ? "h5" : "h3";

  return (
    <div
      className={cn(
        "auth-support",
        compact
          ? "mt-5 border-t border-border pt-4"
          : "rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-none 2xl:px-5 2xl:py-4",
      )}
    >
      <div
        className={cn(
          "auth-support-layout",
          compact
            ? "space-y-3"
            : "grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center",
        )}
      >
        <div className={compact ? "min-w-0" : "flex items-center gap-4"}>
          {!compact ? (
            <span className="auth-support-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 2xl:h-12 2xl:w-12">
              <Headphones
                aria-hidden="true"
                className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0"
                strokeWidth={1.8}
              />
            </span>
          ) : null}
          <div>
            <Title
              className={
                compact
                  ? "break-words text-xs font-bold text-secondary"
                  : "text-sm font-extrabold text-secondary 2xl:text-base"
              }
            >
              {title}
            </Title>
            <p
              className={cn(
                "mt-1 text-xs text-muted-foreground",
                compact ? "break-words leading-5" : "font-semibold 2xl:text-sm",
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "auth-support-contacts space-y-2 text-xs text-secondary",
            compact ? "font-medium" : "font-extrabold 2xl:text-sm",
          )}
        >
          {phone && (
            <Contact
              href={compact ? undefined : phoneHref}
              className={cn(
                "flex items-center gap-2",
                compact ? "break-all" : "hover:text-primary transition-colors",
              )}
            >
              <Phone
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-primary"
              />
              {phone}
            </Contact>
          )}
          {email && (
            <Contact
              href={compact ? undefined : `mailto:${email}`}
              className={cn(
                "flex items-center gap-2",
                compact ? "break-all" : "hover:text-primary transition-colors",
              )}
            >
              <Mail
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-slate-500"
              />
              {email}
            </Contact>
          )}
        </div>
      </div>
    </div>
  );
}
