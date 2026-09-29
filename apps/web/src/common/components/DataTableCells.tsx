import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback, Badge } from "ui";
import { HrEmployeeIdentityCell } from "../../screens/hr/components/HrEmployeeIdentityCell";

export function LeadCell({
  id,
  displayId,
  name,
  phone,
  avatarSeed,
  hideLeadCode,
}: {
  id: string;
  displayId?: string;
  name?: string;
  phone?: string;
  avatarSeed?: string;
  hideLeadCode?: boolean;
}) {
  const seed = encodeURIComponent(avatarSeed || name || id);
  const initials = (name || "Lead").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Link
        to={`/leads/${displayId ?? id}`}
        className="shrink-0 transition-opacity hover:opacity-80"
        title="View Lead Details"
      >
        <Avatar className="h-9 w-9 shrink-0 border border-slate-200">
          <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=f1f5f9`} alt={name || "Lead"} />
          <AvatarFallback className="bg-slate-100 text-[11px] font-bold text-secondary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/leads/${displayId ?? id}`}
          className="block truncate text-[14px] font-extrabold text-secondary hover:text-primary hover:underline"
        >
          {name || "Unknown Lead"}
        </Link>
        <div className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
          <span className="truncate">{phone || "-"}</span>
          {!hideLeadCode && (
            <>
              <span className="size-1 shrink-0 rounded-full bg-slate-300" />
              <span className="truncate uppercase">#{displayId || id.slice(0, 8)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectCell({
  id,
  name,
  image,
  unitLabel,
}: {
  id?: string;
  name?: string;
  image?: string;
  unitLabel?: string;
}) {
  if (!id && !name) {
    return <span className="text-xs font-semibold text-muted-foreground">-</span>;
  }

  const defaultImage = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300&h=300";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to={`/projects/${id}`}
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition-opacity hover:opacity-80"
        title="View Project"
      >
        <img
          src={image || defaultImage}
          alt={name || "Project"}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
        />
      </Link>
      <div className="min-w-0">
        <Link
          to={`/projects/${id}`}
          className="truncate text-sm font-extrabold text-secondary hover:text-primary hover:underline"
        >
          {name || "Unknown Project"}
        </Link>
        {unitLabel && (
          <div className="mt-0.5">
            <Badge className="h-4 rounded-sm border-0 bg-slate-100 px-1 text-[9px] font-black uppercase text-slate-500">
              {unitLabel}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExecutiveCell({
  id,
  name,
  email,
  image,
}: {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}) {
  if (!id && !name) {
    return <span className="text-xs font-semibold text-muted-foreground">-</span>;
  }

  return (
    <div className="flex min-w-0 items-center">
      <HrEmployeeIdentityCell
        fullName={name || "Assigned Staff"}
        email={email || `ID: ${id?.slice(0, 8) ?? "N/A"}`}
        image={image}
        disabled
      />
    </div>
  );
}
