import { Headphones, Mail, Phone } from "lucide-react";

interface SupportBoxProps {
  title?: string;
  subtitle?: string;
  phone?: string;
  email?: string;
}

export function SupportBox({
  title = "Need help?",
  subtitle = "Contact our support team",
  phone = "+91 98765 43210",
  email = "support@truerootrealty.com",
}: SupportBoxProps) {
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-none 2xl:px-5 2xl:py-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 2xl:h-12 2xl:w-12">
            <Headphones
              aria-hidden="true"
              className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0"
              strokeWidth={1.8}
            />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-secondary 2xl:text-base">
              {title}
            </h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground 2xl:text-sm">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-xs font-extrabold text-secondary 2xl:text-sm">
          {phone && (
            <a
              href={phoneHref}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
              {email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
