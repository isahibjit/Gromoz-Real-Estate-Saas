import { BriefcaseBusiness, Headphones, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button, cn } from "ui";

export type LoginRole = "admin" | "telecaller" | "field-executive";

const loginRoles: Array<{ value: LoginRole; label: string; icon: LucideIcon }> =
  [
    { value: "admin", label: "Admin", icon: UserCog },
    { value: "telecaller", label: "Pre Sales Executive", icon: Headphones },
    {
      value: "field-executive",
      label: "Sales Executive",
      icon: BriefcaseBusiness,
    },
  ];

export function RoleSelector({
  value,
  disabled,
  onChange,
}: {
  value: LoginRole;
  disabled?: boolean;
  onChange: (value: LoginRole) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-extrabold text-secondary 2xl:text-base">
        Login as
      </p>
      <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white sm:grid-cols-3">
        {loginRoles.map((role) => {
          const Icon = role.icon;
          const active = value === role.value;

          return (
            <Button
              key={role.value}
              type="button"
              variant="ghost"
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                "h-11 rounded-none border-slate-200 bg-white px-2 text-xs font-extrabold text-secondary shadow-none first:rounded-tl-xl last:rounded-br-xl hover:bg-slate-50 2xl:h-12 2xl:text-sm",
                "border-b odd:border-r sm:border-b-0 sm:border-r sm:last:border-r-0 sm:first:rounded-bl-xl sm:last:rounded-tr-xl",
                active &&
                  "relative z-10 border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
              )}
              onClick={() => onChange(role.value)}
            >
              <Icon
                aria-hidden="true"
                className="size-4 2xl:size-5"
                strokeWidth={1.8}
              />
              <span>{role.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
