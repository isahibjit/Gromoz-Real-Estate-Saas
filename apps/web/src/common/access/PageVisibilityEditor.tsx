import { Eye, EyeOff } from "lucide-react";
import { Badge, Button, Card, Switch } from "ui";
import type { ModulePermission } from "@truroot/shared/auth";

import type { AccessModuleDefinition } from "./PermissionEditor";

interface PageVisibilityEditorProps {
  pages: AccessModuleDefinition[];
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
  disabled?: boolean;
}

function emptyPermission(moduleKey: string): ModulePermission {
  return {
    moduleKey,
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canPunchIn: false,
    canPunchOut: false,
  };
}

export function PageVisibilityEditor({
  pages,
  permissions,
  onChange,
  disabled,
}: PageVisibilityEditorProps) {
  const permissionByPage = new Map(
    permissions.map((permission) => [permission.moduleKey, permission]),
  );
  const groups = pages.reduce<Record<string, AccessModuleDefinition[]>>(
    (result, page) => {
      result[page.group] ??= [];
      result[page.group].push(page);
      return result;
    },
    {},
  );

  const setPageVisibility = (page: AccessModuleDefinition, visible: boolean) => {
    const next = new Map(
      permissions.map((permission) => [permission.moduleKey, permission]),
    );
    next.set(page.key, {
      ...(permissionByPage.get(page.key) ?? emptyPermission(page.key)),
      canView: visible,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canPunchIn: false,
      canPunchOut: false,
    });
    onChange(Array.from(next.values()));
  };

  const setGroupVisibility = (
    groupPages: AccessModuleDefinition[],
    visible: boolean,
  ) => {
    const next = new Map(
      permissions.map((permission) => [permission.moduleKey, permission]),
    );
    for (const page of groupPages) {
      next.set(page.key, {
        ...(permissionByPage.get(page.key) ?? emptyPermission(page.key)),
        canView: visible,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      });
    }
    onChange(Array.from(next.values()));
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, groupPages]) => {
        const visibleCount = groupPages.filter(
          (page) => permissionByPage.get(page.key)?.canView,
        ).length;

        return (
          <Card
            key={group}
            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none"
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-secondary">
                  {group.replace("Page visibility: ", "")}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  {visibleCount} of {groupPages.length} pages visible
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-xs font-bold shadow-none"
                  disabled={disabled}
                  onClick={() => setGroupVisibility(groupPages, true)}
                >
                  Show all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3 text-xs font-bold text-muted-foreground shadow-none"
                  disabled={disabled}
                  onClick={() => setGroupVisibility(groupPages, false)}
                >
                  Hide all
                </Button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {groupPages.map((page) => {
                const visible = permissionByPage.get(page.key)?.canView ?? false;
                return (
                  <div
                    key={page.key}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span
                      className={
                        visible
                          ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"
                          : "flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"
                      }
                    >
                      {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-secondary">
                          {page.label}
                        </p>
                        <Badge
                          className={
                            visible
                              ? "border-0 bg-emerald-50 text-[10px] font-extrabold text-emerald-700"
                              : "border-0 bg-slate-100 text-[10px] font-extrabold text-slate-600"
                          }
                        >
                          {visible ? "Visible" : "Hidden"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {page.description}
                      </p>
                    </div>
                    <Switch
                      checked={visible}
                      disabled={disabled}
                      aria-label={`${visible ? "Hide" : "Show"} ${page.label}`}
                      onCheckedChange={(checked) => setPageVisibility(page, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
