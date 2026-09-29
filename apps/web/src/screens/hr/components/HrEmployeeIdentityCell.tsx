import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

type HrEmployeeIdentityCellProps = {
  fullName?: string | null;
  email?: string | null;
  image?: string | null;
  href?: string;
  className?: string;
  disabled?: boolean;
};

function initials(name?: string | null) {
  return (name ?? "Employee")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function HrEmployeeIdentityCell({
  fullName,
  email,
  image,
  href,
  className,
  disabled = false,
}: HrEmployeeIdentityCellProps) {
  const content = (
    <div className={`flex min-w-0 items-center gap-3 ${className ?? ""}`}>
      <Avatar className="h-9 w-9 shrink-0 border border-slate-200">
        <AvatarImage src={image ?? undefined} alt={fullName ?? "Employee"} />
        <AvatarFallback className="bg-slate-100 text-[11px] font-bold text-secondary">
          {initials(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-extrabold text-secondary">
          {fullName ?? "Employee"}
        </p>
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          {email ?? "-"}
        </p>
      </div>
    </div>
  );

  if (!href || disabled) {
    return content;
  }

  return (
    <Link
      to={href}
      className="block rounded-md transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/30"
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </Link>
  );
}
