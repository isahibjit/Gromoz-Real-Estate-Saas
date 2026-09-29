import type { LucideIcon } from "lucide-react";

interface LoginFeatureItemProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function LoginFeatureItem({
  title,
  description,
  icon: Icon,
}: LoginFeatureItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-12 p-3 shrink-0 items-center justify-center rounded-full border border-border/80 bg-card text-secondary shadow-card xl:size-[3.15rem]">
        <Icon
          aria-hidden="true"
          className="size-5.5 xl:size-6"
          strokeWidth={2}
        />
      </div>
      <div className="space-y-1 pt-0.5">
        <h3 className="text-base font-bold text-foreground xl:text-[1.12rem]">
          {title}
        </h3>
        <p className="max-w-md text-sm leading-6 text-muted-foreground xl:text-[1.02rem]">
          {description}
        </p>
      </div>
    </div>
  );
}
