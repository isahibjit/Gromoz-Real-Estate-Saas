import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useLeadStatusMaster, useLeadTypeMaster } from "./useLeadStatusMaster";

export type WorkspaceTarget = "all_leads" | "follow_up";

export type CardItemCategory = "core" | "status" | "lead_type";

export interface UnifiedCardItem {
  id: string;
  name: string;
  category: CardItemCategory;
  order: number;
  showInStatsCard: boolean;
  showInFilterBar: boolean;
  displayColor?: string;
  description?: string;
  icon?: string;
  isSystemDefault?: boolean;
}

const STORAGE_KEY_PREFIX = "crm_card_prefs_v2_";

const isUnifiedCardItem = (item: unknown): item is UnifiedCardItem => {
  if (!item || typeof item !== "object") return false;

  const candidate = item as Partial<UnifiedCardItem>;
  return Boolean(
    typeof candidate.id === "string" &&
      candidate.id.trim() &&
      typeof candidate.name === "string" &&
      candidate.name.trim() &&
      typeof candidate.order === "number" &&
      typeof candidate.showInStatsCard === "boolean" &&
      typeof candidate.showInFilterBar === "boolean" &&
      (candidate.category === "core" ||
        candidate.category === "status" ||
        candidate.category === "lead_type"),
  );
};

const sanitizeCardItems = (items: unknown): UnifiedCardItem[] =>
  Array.isArray(items) ? items.filter(isUnifiedCardItem) : [];

export const DEFAULT_ALL_LEADS_CORE_ITEMS: UnifiedCardItem[] = [
  {
    id: "core:total-leads",
    name: "Total Leads",
    category: "core",
    order: 1,
    showInStatsCard: true,
    showInFilterBar: false,
    displayColor: "#2563EB",
    description: "All pipeline leads",
  },
];

export const DEFAULT_FOLLOW_UP_CORE_ITEMS: UnifiedCardItem[] = [
  {
    id: "core:today-followups",
    name: "Today's Follow-Ups",
    category: "core",
    order: 1,
    showInStatsCard: true,
    showInFilterBar: false,
    displayColor: "#2563EB",
    description: "Due in the current queue",
  },
  {
    id: "core:overdue-followups",
    name: "Overdue Follow-Ups",
    category: "core",
    order: 2,
    showInStatsCard: true,
    showInFilterBar: false,
    displayColor: "#DC2626",
    description: "Needs immediate attention",
  },
  {
    id: "core:upcoming-followups",
    name: "Upcoming Follow-Ups",
    category: "core",
    order: 3,
    showInStatsCard: true,
    showInFilterBar: false,
    displayColor: "#16A34A",
    description: "Scheduled next actions",
  },
  {
    id: "core:completed-followups",
    name: "Completed Today",
    category: "core",
    order: 4,
    showInStatsCard: true,
    showInFilterBar: false,
    displayColor: "#7C3AED",
    description: "Marked complete",
  },
  {
    id: "core:pending-queue",
    name: "Pending Queue",
    category: "core",
    order: 5,
    showInStatsCard: true,
    showInFilterBar: false,
    displayColor: "#0284C7",
    description: "Open follow-up workload",
  },
];

export function useLeadCardPreferences(workspace: WorkspaceTarget) {
  const queryClient = useQueryClient();
  const statusMaster = useLeadStatusMaster();
  const leadTypeMaster = useLeadTypeMaster();

  const storageKey = `${STORAGE_KEY_PREFIX}${workspace}`;

  // Build baseline combined items from core defaults and current masters
  const buildDefaultItems = useCallback((): UnifiedCardItem[] => {
    const coreItems =
      workspace === "all_leads"
        ? DEFAULT_ALL_LEADS_CORE_ITEMS
        : DEFAULT_FOLLOW_UP_CORE_ITEMS;

    let currentOrder = coreItems.length + 1;

    const statusItems: UnifiedCardItem[] = statusMaster.allStatuses.map((s) => ({
      id: s.id,
      name: s.name,
      category: "status" as CardItemCategory,
      order: currentOrder++,
      showInStatsCard: s.showInStatsCard !== false,
      showInFilterBar: s.showInFilterBar !== false,
      displayColor: s.displayColor || "#0284C7",
      description: s.description || "Pipeline status",
      isSystemDefault: s.isActive,
    }));

    const typeItems: UnifiedCardItem[] = leadTypeMaster.allLeadTypes.map((t) => ({
      id: t.id,
      name: t.name,
      category: "lead_type" as CardItemCategory,
      order: currentOrder++,
      showInStatsCard: t.showInStatsCard !== false,
      showInFilterBar: t.showInFilterBar !== false,
      displayColor: t.displayColor || "#EA580C",
      description: t.description || "Lead classification",
      isSystemDefault: t.isActive,
    }));

    const combined = [...coreItems, ...statusItems, ...typeItems];
    return combined.map((item, idx) => ({ ...item, order: idx + 1 }));
  }, [workspace, statusMaster.allStatuses, leadTypeMaster.allLeadTypes]);

  // Load from local storage or defaults
  const [items, setItems] = useState<UnifiedCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = sanitizeCardItems(JSON.parse(saved));
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return buildDefaultItems();
  });

  // Re-sync when master queries load or change
  useEffect(() => {
    if (!statusMaster.isLoading && !leadTypeMaster.isLoading) {
      setItems((prev) => {
        const previousItems = sanitizeCardItems(prev);
        const defaultList = buildDefaultItems();
        if (previousItems.length === 0) return defaultList;

        // Preserve previous order & toggles, but include any new master values
        const prevMap = new Map<string, UnifiedCardItem>(
          previousItems.map((i) => [i.id, i]),
        );
        const merged: UnifiedCardItem[] = [];

        // First, add existing items in their saved order if still in default list
        const defaultIds = new Set(defaultList.map((i) => i.id));
        for (const p of previousItems) {
          if (defaultIds.has(p.id)) {
            // update name/description if changed
            const latest = defaultList.find((d) => d.id === p.id);
            merged.push({
              ...p,
              name: latest?.name || p.name,
              description: latest?.description || p.description,
              displayColor: p.displayColor || latest?.displayColor,
            });
          }
        }

        // Second, add any new items that didn't exist in prev
        for (const d of defaultList) {
          if (!prevMap.has(d.id)) {
            merged.push(d);
          }
        }

        // Re-index sequentially 1..N
        const reindexed = merged.map((item, idx) => ({ ...item, order: idx + 1 }));
        const hasDifferences =
          reindexed.length !== previousItems.length ||
          reindexed.some(
            (m, i) =>
              m.id !== previousItems[i]?.id ||
              m.order !== previousItems[i]?.order ||
              m.showInStatsCard !== previousItems[i]?.showInStatsCard ||
              m.showInFilterBar !== previousItems[i]?.showInFilterBar ||
              m.displayColor !== previousItems[i]?.displayColor ||
              m.name !== previousItems[i]?.name,
          );

        return hasDifferences ? reindexed : previousItems;
      });
    }
  }, [buildDefaultItems, leadTypeMaster.isLoading, statusMaster.isLoading]);

  // Persist masters before publishing saved workspace preferences.
  const savePreferences = useCallback(
    async (newItems: UnifiedCardItem[]) => {
      // Re-index strictly sequential
      const sequentialItems = sanitizeCardItems(newItems).map(
        (item, idx) => ({
          ...item,
          order: idx + 1,
        }),
      );

      const updates = sequentialItems
        .filter((i) => i.category === "status" || i.category === "lead_type")
        .map((item) => ({
          id: item.id,
          sortOrder: item.order,
          showInStatsCard: item.showInStatsCard,
          showInFilterBar: item.showInFilterBar,
          displayColor: item.displayColor,
        }));

      if (updates.length > 0) {
        await api.post("/lead-masters/bulk-reorder", { items: updates });
      }

      localStorage.setItem(storageKey, JSON.stringify(sequentialItems));
      setItems(sequentialItems);
      window.dispatchEvent(
        new CustomEvent("crm_card_prefs_updated", { detail: { workspace } }),
      );
      void queryClient.invalidateQueries({ queryKey: ["lead-masters"] });
    },
    [queryClient, storageKey, workspace],
  );

  // Listen to preference changes from other components/tabs
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ workspace?: WorkspaceTarget }>;
      if (!customEvent.detail?.workspace || customEvent.detail.workspace === workspace) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = sanitizeCardItems(JSON.parse(saved));
            if (parsed.length > 0) {
              setItems(parsed);
            }
          }
        } catch {
          // Ignore unreadable external storage updates and retain current items.
        }
      }
    };
    window.addEventListener("crm_card_prefs_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("crm_card_prefs_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [storageKey, workspace]);

  const statsCards = useMemo(
    () =>
      sanitizeCardItems(items)
        .filter((i) => i.showInStatsCard)
        .sort((a, b) => a.order - b.order),
    [items],
  );

  const filterPills = useMemo(
    () =>
      sanitizeCardItems(items)
        .filter((i) => i.showInFilterBar)
        .sort((a, b) => a.order - b.order),
    [items],
  );

  return {
    items,
    statsCards,
    filterPills,
    savePreferences,
    getDefaultItems: buildDefaultItems,
    statusMaster,
    leadTypeMaster,
  };
}
