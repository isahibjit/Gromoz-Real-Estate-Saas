import { Headphones, Mail, Phone } from "lucide-react";

interface SupportBoxProps {
  phone: string;
  email: string;
}

export function SupportBox({ phone, email }: SupportBoxProps) {
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-none 2xl:px-5 2xl:py-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 2xl:size-12">
            <Headphones
              aria-hidden="true"
              className="size-5 2xl:size-6"
              strokeWidth={1.8}
            />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-secondary 2xl:text-base">
              Need help?
            </h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground 2xl:text-sm">
              Contact our support team
            </p>
          </div>
        </div>
        <div className="space-y-2 text-xs font-extrabold text-secondary 2xl:text-sm">
          <a
            href={phoneHref}
            className="flex items-center gap-3 hover:text-primary"
          >
            <Phone aria-hidden="true" className="size-4" />
            {phone}
          </a>
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 hover:text-primary"
          >
            <Mail aria-hidden="true" className="size-4" />
            {email}
          </a>
        </div>
      </div>
    </div>
  );
}
