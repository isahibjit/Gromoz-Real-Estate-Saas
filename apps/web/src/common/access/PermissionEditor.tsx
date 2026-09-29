import { Badge, Button, Card, Checkbox, cn } from "ui";
import type { ModulePermission } from "@truroot/shared/auth";

export interface AccessModuleDefinition {
  key: string;
  label: string;
  group: string;
  description: string;
  actions: PermissionAction[];
  actionLabels?: Partial<Record<PermissionAction, string>>;
  actionRoles?: Partial<Record<PermissionAction, string[]>>;
  kind?: "module" | "page";
  parentModuleKey?: string;
  navigationMode?: "sidebar" | "route-only";
}

type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "punchIn"
  | "punchOut";

type PermissionField = Exclude<keyof ModulePermission, "moduleKey">;

interface PermissionEditorProps {
  modules: AccessModuleDefinition[];
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
  disabled?: boolean;
  compact?: boolean;
  role?: string;
}

const defaultActionLabels: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  punchIn: "Punch in",
  punchOut: "Punch out",
} as const;

const actionFields: Record<PermissionAction, PermissionField> = {
  view: "canView",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
  punchIn: "canPunchIn",
  punchOut: "canPunchOut",
};

const permissionFields: PermissionField[] = [
  "canView",
  "canCreate",
  "canUpdate",
  "canDelete",
  "canPunchIn",
  "canPunchOut",
];

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

function availableActions(
  module: AccessModuleDefinition,
  role?: string,
) {
  return module.actions.filter((action) => {
    const eligibleRoles = module.actionRoles?.[action];
    return !eligibleRoles || !role || eligibleRoles.includes(role);
  });
}

export function PermissionEditor({
  modules,
  permissions,
  onChange,
  disabled,
  compact,
  role,
}: PermissionEditorProps) {
  const permissionByModule = new Map(
    permissions.map((permission) => [permission.moduleKey, permission]),
  );
  const groups = modules.reduce<Record<string, AccessModuleDefinition[]>>(
    (acc, module) => {
      acc[module.group] ??= [];
      acc[module.group].push(module);
      return acc;
    },
    {},
  );

  const updatePermission = (
    module: AccessModuleDefinition,
    action: PermissionAction,
    checked: boolean,
  ) => {
    const field = actionFields[action];
    const current = permissionByModule.get(module.key) ?? emptyPermission(module.key);
    const nextPermission = {
      ...current,
      [field]: checked,
    };
    if (action !== "view" && checked) {
      nextPermission.canView = true;
    }
    if (action === "view" && !checked) {
      for (const permissionField of permissionFields) {
        nextPermission[permissionField] = false;
      }
    }
    const next = new Map(permissions.map((permission) => [permission.moduleKey, permission]));
    next.set(module.key, nextPermission);
    for (const item of modules) {
      if (!next.has(item.key)) next.set(item.key, emptyPermission(item.key));
    }
    onChange(Array.from(next.values()));
  };

  const setGroup = (items: AccessModuleDefinition[], checked: boolean) => {
    const affected = new Set(items.map((item) => item.key));
    const next = new Map(permissions.map((permission) => [permission.moduleKey, permission]));
    for (const module of modules) {
      const enabledActions = new Set(availableActions(module, role));
      next.set(
        module.key,
        affected.has(module.key)
          ? {
          moduleKey: module.key,
          canView: checked && enabledActions.has("view"),
          canCreate: checked && enabledActions.has("create"),
          canUpdate: checked && enabledActions.has("update"),
          canDelete: checked && enabledActions.has("delete"),
          canPunchIn: checked && enabledActions.has("punchIn"),
          canPunchOut: checked && enabledActions.has("punchOut"),
          }
          : permissionByModule.get(module.key) ?? emptyPermission(module.key),
      );
    }
    onChange(Array.from(next.values()));
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {Object.entries(groups).map(([group, items]) => {
        const enabledCount = items.filter(
          (item) => permissionByModule.get(item.key)?.canView,
        ).length;
        return (
          <Card
            key={group}
            className={cn(
              "rounded-md border border-slate-200 bg-white shadow-none",
              compact ? "p-3" : "p-4",
            )}
          >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-secondary">
                  {group}
                </h3>
                <p className="text-xs font-semibold text-muted-foreground">
                  {enabledCount} of {items.length} modules enabled
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-8 rounded-md text-xs shadow-none",
                    compact ? "px-2" : "px-3",
                  )}
                  disabled={disabled}
                  onClick={() => setGroup(items, true)}
                >
                  Enable group
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-md text-xs shadow-none",
                    compact ? "px-2" : "px-3",
                  )}
                  disabled={disabled}
                  onClick={() => setGroup(items, false)}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((module) => {
                const permission =
                  permissionByModule.get(module.key) ?? emptyPermission(module.key);
                const actions = availableActions(module, role);
                const hasUnpairedPunchPermission =
                  module.key === "attendance" &&
                  permission.canPunchIn !== permission.canPunchOut;
                return (
                  <div
                    key={module.key}
                    className={cn(
                      "grid gap-3 py-3",
                      !compact &&
                        "xl:grid-cols-[minmax(220px,1fr)_minmax(360px,auto)]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-secondary">
                          {module.label}
                        </p>
                        {permission.canView ? (
                          <Badge className="border-0 bg-green-50 text-[10px] font-extrabold text-green-700">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="border-0 bg-slate-100 text-[10px] font-extrabold text-slate-600">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {module.description}
                      </p>
                      {hasUnpairedPunchPermission ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700">
                          Punch in and Punch out are usually enabled together to avoid
                          incomplete attendance records.
                        </p>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "grid min-w-0 gap-2",
                        compact
                          ? "grid-cols-4"
                          : "grid-cols-2 sm:grid-cols-4",
                      )}
                    >
                      {actions.map((action) => {
                        const field = actionFields[action];
                        return (
                          <label
                            key={action}
                            className={cn(
                              "min-w-0 rounded-md border border-slate-200 font-bold text-secondary",
                              compact
                                ? "flex flex-col items-center justify-center gap-1 px-1.5 py-2 text-[10px]"
                                : "flex items-center gap-2 px-2.5 py-2 text-xs",
                              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                            )}
                          >
                            <Checkbox
                              checked={Boolean(permission[field])}
                              disabled={disabled}
                              className="gap-0"
                              onChange={(event) =>
                                updatePermission(module, action, event.target.checked)
                              }
                            />
                            <span className="min-w-0 truncate">
                              {module.actionLabels?.[action] ??
                                defaultActionLabels[action]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
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
