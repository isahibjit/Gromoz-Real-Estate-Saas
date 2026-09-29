import { useMemo, useState } from "react";
import { Search, ShieldAlert, Eye, CheckCheck, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Switch,
  cn,
} from "ui";
import type { ModulePermission } from "@truroot/shared/auth";

import type { AccessModuleDefinition } from "./PermissionEditor";

export type { AccessModuleDefinition };

export interface WorkspaceAccessEditorProps {
  modules: AccessModuleDefinition[];
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
  disabled?: boolean;
  compact?: boolean;
  role?: string;
  showSearch?: boolean;
}

type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "punchIn"
  | "punchOut";

type PermissionField = Exclude<keyof ModulePermission, "moduleKey">;

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

function availableActions(module: AccessModuleDefinition, role?: string) {
  return module.actions.filter((action) => {
    const eligibleRoles = module.actionRoles?.[action];
    return !eligibleRoles || !role || eligibleRoles.includes(role);
  });
}

function getDistinctModuleLabel(module: AccessModuleDefinition): string {
  if (module.key === "leads") return "Lead record permissions";
  return module.label;
}

function getDistinctPageLabel(page: AccessModuleDefinition): string {
  if (page.key === "page.all_leads") return "All Leads page";
  return page.label;
}

export function WorkspaceAccessEditor({
  modules,
  permissions,
  onChange,
  disabled = false,
  compact = false,
  role,
  showSearch = true,
}: WorkspaceAccessEditorProps) {
  const [search, setSearch] = useState("");
  const [pendingDisableModal, setPendingDisableModal] = useState<{
    module: AccessModuleDefinition;
    activePages: AccessModuleDefinition[];
  } | null>(null);

  const permissionByModule = useMemo(() => {
    return new Map(
      permissions.map((permission) => [permission.moduleKey, permission]),
    );
  }, [permissions]);

  // Separate core modules and pages
  const { coreModules, pagesByParent, orphanPages } = useMemo(() => {
    const core: AccessModuleDefinition[] = [];
    const pages: AccessModuleDefinition[] = [];

    for (const item of modules) {
      if (item.kind === "page" || item.key.startsWith("page.")) {
        pages.push(item);
      } else {
        core.push(item);
      }
    }

    const pagesByParent = new Map<string, AccessModuleDefinition[]>();
    const orphan: AccessModuleDefinition[] = [];
    const coreKeySet = new Set(core.map((c) => c.key));

    for (const page of pages) {
      const parentKey = page.parentModuleKey;
      if (parentKey && coreKeySet.has(parentKey)) {
        const list = pagesByParent.get(parentKey) ?? [];
        list.push(page);
        pagesByParent.set(parentKey, list);
      } else {
        orphan.push(page);
      }
    }

    return { coreModules: core, pagesByParent, orphanPages: orphan };
  }, [modules]);

  // Filter modules based on search query
  const filteredCoreModules = useMemo(() => {
    if (!search.trim()) return coreModules;
    const q = search.toLowerCase().trim();

    return coreModules.filter((mod) => {
      if (mod.label.toLowerCase().includes(q)) return true;
      if (mod.group.toLowerCase().includes(q)) return true;
      if (mod.description.toLowerCase().includes(q)) return true;

      // Check dependent pages
      const depPages = pagesByParent.get(mod.key) ?? [];
      const matchesPage = depPages.some(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
      if (matchesPage) return true;

      // Check actions
      const actions = availableActions(mod, role);
      const matchesAction = actions.some((act) => {
        const lbl = mod.actionLabels?.[act] ?? defaultActionLabels[act];
        return lbl.toLowerCase().includes(q);
      });
      return matchesAction;
    });
  }, [coreModules, pagesByParent, search, role]);

  // Group filtered modules by their group
  const groupedModules = useMemo(() => {
    return filteredCoreModules.reduce<Record<string, AccessModuleDefinition[]>>(
      (acc, mod) => {
        acc[mod.group] ??= [];
        acc[mod.group].push(mod);
        return acc;
      },
      {},
    );
  }, [filteredCoreModules]);

  // Update a single action on a module
  const updateAction = (
    moduleKey: string,
    action: PermissionAction,
    checked: boolean,
  ) => {
    const nextMap = new Map(
      permissions.map((p) => [p.moduleKey, { ...p }]),
    );
    const current = nextMap.get(moduleKey) ?? emptyPermission(moduleKey);
    const field = actionFields[action];

    current[field] = checked;

    // Rule: enabling any action (create, update, delete, punchIn, punchOut) enables View
    if (checked && action !== "view") {
      current.canView = true;
    }

    nextMap.set(moduleKey, current);
    onChange(Array.from(nextMap.values()));
  };

  // Turn page visibility on or off
  const updatePageVisibility = (pageKey: string, visible: boolean) => {
    const nextMap = new Map(
      permissions.map((p) => [p.moduleKey, { ...p }]),
    );
    const current = nextMap.get(pageKey) ?? emptyPermission(pageKey);
    current.canView = visible;
    nextMap.set(pageKey, current);

    // Rule: enabling a page automatically enables parent module View
    if (visible) {
      const pageDef = modules.find((m) => m.key === pageKey);
      if (pageDef?.parentModuleKey) {
        const parentPerm =
          nextMap.get(pageDef.parentModuleKey) ??
          emptyPermission(pageDef.parentModuleKey);
        parentPerm.canView = true;
        nextMap.set(pageDef.parentModuleKey, parentPerm);
      }
    }

    onChange(Array.from(nextMap.values()));
  };

  // Perform cascading disable of module View + all dependent pages
  const performDisableModuleView = (module: AccessModuleDefinition) => {
    const nextMap = new Map(
      permissions.map((p) => [p.moduleKey, { ...p }]),
    );

    // Disable all actions on the module
    const current = nextMap.get(module.key) ?? emptyPermission(module.key);
    current.canView = false;
    current.canCreate = false;
    current.canUpdate = false;
    current.canDelete = false;
    current.canPunchIn = false;
    current.canPunchOut = false;
    nextMap.set(module.key, current);

    // Disable all dependent pages
    const dependentPages = pagesByParent.get(module.key) ?? [];
    for (const page of dependentPages) {
      const pagePerm = nextMap.get(page.key) ?? emptyPermission(page.key);
      pagePerm.canView = false;
      nextMap.set(page.key, pagePerm);
    }

    onChange(Array.from(nextMap.values()));
  };

  // Handle click on View permission checkbox
  const handleViewToggle = (
    module: AccessModuleDefinition,
    newChecked: boolean,
  ) => {
    if (newChecked) {
      updateAction(module.key, "view", true);
      return;
    }

    // When disabling View: check how many dependent pages are active
    const dependentPages = pagesByParent.get(module.key) ?? [];
    const activePages = dependentPages.filter(
      (p) => permissionByModule.get(p.key)?.canView,
    );

    if (activePages.length > 1) {
      // Confirmation required when multiple pages are affected
      setPendingDisableModal({ module, activePages });
    } else {
      performDisableModuleView(module);
    }
  };

  // Bulk actions for a specific module
  const handleGrantViewAccess = (module: AccessModuleDefinition) => {
    const nextMap = new Map(
      permissions.map((p) => [p.moduleKey, { ...p }]),
    );
    const modPerm = nextMap.get(module.key) ?? emptyPermission(module.key);
    modPerm.canView = true;
    nextMap.set(module.key, modPerm);

    const depPages = pagesByParent.get(module.key) ?? [];
    for (const page of depPages) {
      const pagePerm = nextMap.get(page.key) ?? emptyPermission(page.key);
      pagePerm.canView = true;
      nextMap.set(page.key, pagePerm);
    }

    onChange(Array.from(nextMap.values()));
  };

  const handleGrantFullAccess = (module: AccessModuleDefinition) => {
    const nextMap = new Map(
      permissions.map((p) => [p.moduleKey, { ...p }]),
    );
    const modPerm = nextMap.get(module.key) ?? emptyPermission(module.key);
    const actions = availableActions(module, role);

    for (const action of actions) {
      const field = actionFields[action];
      modPerm[field] = true;
    }
    modPerm.canView = true;
    nextMap.set(module.key, modPerm);

    const depPages = pagesByParent.get(module.key) ?? [];
    for (const page of depPages) {
      const pagePerm = nextMap.get(page.key) ?? emptyPermission(page.key);
      pagePerm.canView = true;
      nextMap.set(page.key, pagePerm);
    }

    onChange(Array.from(nextMap.values()));
  };

  const handleClearAccess = (module: AccessModuleDefinition) => {
    performDisableModuleView(module);
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      {showSearch && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search module permissions, pages, or groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <span>
              {filteredCoreModules.length} of {coreModules.length} modules
            </span>
          </div>
        </div>
      )}

      {/* Grouped Modules */}
      {Object.keys(groupedModules).length === 0 ? (
        <Card className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center shadow-none">
          <p className="text-sm font-bold text-secondary">No modules or pages match your search</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term or clear the filter.
          </p>
        </Card>
      ) : (
        Object.entries(groupedModules).map(([group, groupModules]) => (
          <Card
            key={group}
            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-secondary">{group}</h3>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {groupModules.length} {groupModules.length === 1 ? "module" : "modules"} in this domain
                </p>
              </div>
            </div>

            {/* Modules in Group */}
            <div className="divide-y divide-slate-100">
              {groupModules.map((module) => {
                const modPerm = permissionByModule.get(module.key);
                const hasView = Boolean(modPerm?.canView);
                const actions = availableActions(module, role);
                const depPages = pagesByParent.get(module.key) ?? [];

                return (
                  <div
                    key={module.key}
                    className={cn(
                      "p-4 transition-colors",
                      compact ? "p-3" : "p-4",
                      hasView ? "bg-white" : "bg-slate-50/40",
                    )}
                  >
                    {/* Module Title Bar & Quick Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-secondary">
                            {getDistinctModuleLabel(module)}
                          </h4>
                          {module.key === "leads" && (
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              Core CRM
                            </Badge>
                          )}
                          {hasView ? (
                            <Badge variant="success" className="text-[10px] font-semibold">
                              View Enabled
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px] font-semibold text-muted-foreground">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {module.description}
                        </p>
                      </div>

                      {/* Quick Bulk Buttons */}
                      {!disabled && (
                        <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handleGrantViewAccess(module)}
                            className="h-7 px-2 text-[11px] font-semibold"
                            title="Enable View permission and dependent pages"
                          >
                            <Eye className="mr-1 size-3" />
                            Grant view
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handleGrantFullAccess(module)}
                            className="h-7 px-2 text-[11px] font-semibold"
                            title="Enable all role actions and dependent pages"
                          >
                            <CheckCheck className="mr-1 size-3 text-emerald-600" />
                            Grant full
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handleClearAccess(module)}
                            className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                            title="Clear all actions and page access"
                          >
                            <XCircle className="mr-1 size-3" />
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Allowed Actions Section */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Allowed actions
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {actions.map((action) => {
                          const field = actionFields[action];
                          const isChecked = Boolean(modPerm?.[field]);
                          const actionLabel =
                            module.actionLabels?.[action] ??
                            defaultActionLabels[action];

                          return (
                            <label
                              key={action}
                              className={cn(
                                "flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-all select-none",
                                isChecked
                                  ? "border-primary/40 bg-primary/5 text-secondary"
                                  : "border-slate-200 bg-slate-50/70 text-muted-foreground hover:bg-slate-100/70",
                                disabled && "pointer-events-none opacity-60",
                              )}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={disabled}
                                className="gap-0"
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (action === "view") {
                                    handleViewToggle(module, checked);
                                  } else {
                                    updateAction(
                                      module.key,
                                      action,
                                      checked,
                                    );
                                  }
                                }}
                              />
                              <span className="truncate">{actionLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dependent Page Access Section */}
                    {depPages.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-dashed border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Page access ({depPages.length})
                          </span>
                          {!hasView && (
                            <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                              <ShieldAlert className="size-3" />
                              Requires View permission
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {depPages.map((page) => {
                            const isPageVisible = Boolean(
                              permissionByModule.get(page.key)?.canView,
                            );

                            return (
                              <div
                                key={page.key}
                                className={cn(
                                  "flex items-center justify-between rounded-md border p-2.5 transition-colors",
                                  isPageVisible
                                    ? "border-slate-200 bg-white"
                                    : "border-slate-100 bg-slate-50/50",
                                )}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="text-xs font-bold text-secondary truncate">
                                    {getDistinctPageLabel(page)}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {page.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={isPageVisible}
                                  disabled={disabled}
                                  onCheckedChange={(checked) =>
                                    updatePageVisibility(page.key, checked)
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

      {/* Confirmation Modal on Disabling View with Multiple Dependent Pages */}
      <Dialog
        open={Boolean(pendingDisableModal)}
        onOpenChange={(open) => {
          if (!open) setPendingDisableModal(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="size-5" />
              Disable View Access?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5">
              Disabling View for{" "}
              <strong className="text-secondary font-bold">
                {pendingDisableModal?.module.label}
              </strong>{" "}
              will automatically disable access to the following{" "}
              {pendingDisableModal?.activePages.length} pages:
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 max-h-48 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-3 space-y-1.5">
            {pendingDisableModal?.activePages.map((p) => (
              <div
                key={p.key}
                className="text-xs font-semibold text-secondary flex items-center gap-2"
              >
                <div className="size-1.5 rounded-full bg-rose-500" />
                <span>{getDistinctPageLabel(p)}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPendingDisableModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (pendingDisableModal) {
                  performDisableModuleView(pendingDisableModal.module);
                  setPendingDisableModal(null);
                }
              }}
            >
              Confirm & disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
