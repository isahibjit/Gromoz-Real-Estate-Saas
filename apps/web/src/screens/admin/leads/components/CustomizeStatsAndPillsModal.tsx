import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Switch,
  Badge,
  cn,
} from "ui";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Palette,
  Check,
  UsersRound,
  UserPlus,
  PhoneCall,
  HeartHandshake,
  Clock,
  Building2,
  CalendarCheck,
  RefreshCw,
  FileText,
  Handshake,
  CheckCircle2,
  XCircle,
  Flame,
  Sun,
  Snowflake,
  AlertCircle,
  CalendarDays,
  Target,
  LayoutGrid,
  Filter,
} from "lucide-react";
import {
  useLeadCardPreferences,
  type WorkspaceTarget,
  type UnifiedCardItem,
} from "../../../../common/hooks/useLeadCardPreferences";
import { getApiErrorMessage } from "../../../../common/apiError";

const EXTENDED_SAAS_PALETTE = [
  { label: "Blue", hex: "#2563EB" },
  { label: "Indigo", hex: "#4F46E5" },
  { label: "Violet", hex: "#7C3AED" },
  { label: "Purple", hex: "#9333EA" },
  { label: "Fuchsia", hex: "#C026D3" },
  { label: "Rose", hex: "#E11D48" },
  { label: "Red", hex: "#DC2626" },
  { label: "Orange", hex: "#EA580C" },
  { label: "Amber", hex: "#D97706" },
  { label: "Emerald", hex: "#059669" },
  { label: "Green", hex: "#16A34A" },
  { label: "Teal", hex: "#0D9488" },
  { label: "Cyan", hex: "#0891B2" },
  { label: "Sky", hex: "#0284C7" },
  { label: "Slate", hex: "#475569" },
  { label: "Zinc", hex: "#52525B" },
];

function getMeaningfulIcon(item: UnifiedCardItem) {
  const n = item.name.toLowerCase().trim();

  // Core metrics
  if (n.includes("total") || n.includes("all pipeline")) return UsersRound;
  if (n.includes("today's") || n.includes("today")) return CalendarCheck;
  if (n.includes("overdue") || n.includes("delay")) return AlertCircle;
  if (n.includes("upcoming")) return CalendarDays;
  if (n.includes("completed")) return CheckCircle2;
  if (n.includes("queue") || n.includes("pending")) return Clock;

  // Temperature / Lead type
  if (n.includes("very hot")) return Flame;
  if (n.includes("hot")) return Flame;
  if (n.includes("warm")) return Sun;
  if (n.includes("cold")) return Snowflake;

  // Pipeline Statuses
  if (n.includes("new lead") || n === "new") return UserPlus;
  if (n.includes("contacted") || n.includes("called") || n.includes("call"))
    return PhoneCall;
  if (n.includes("interested")) return HeartHandshake;
  if (n.includes("follow-up") || n.includes("follow up")) return Clock;
  if (
    n.includes("site visit schedule") ||
    n.includes("site visit") ||
    n.includes("visit")
  )
    return Building2;
  if (n.includes("revisit") || n.includes("re-visit")) return RefreshCw;
  if (n.includes("proposal") || n.includes("quote")) return FileText;
  if (n.includes("negotiation") || n.includes("deal")) return Handshake;
  if (
    n.includes("booked") ||
    n.includes("booking") ||
    n.includes("won") ||
    n.includes("closed")
  )
    return CheckCircle2;
  if (
    n.includes("not interested") ||
    n.includes("lost") ||
    n.includes("dropped") ||
    n.includes("cancelled")
  )
    return XCircle;

  if (item.category === "lead_type") return Flame;
  return Target;
}

function getToneStyles(hex?: string) {
  const color = hex || "#2563EB";
  return {
    iconBg: `${color}15`,
    iconColor: color,
    pillBg: `${color}12`,
    pillBorder: `${color}35`,
    pillText: color,
  };
}

export function CustomizeStatsAndPillsModal({
  open,
  onOpenChange,
  defaultWorkspace = "all_leads",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkspace?: WorkspaceTarget;
}) {
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceTarget>(defaultWorkspace);
  const [activeTab, setActiveTab] = useState<"cards" | "pills">("cards");

  // Color picker sub-modal state
  const [colorPickerItem, setColorPickerItem] = useState<UnifiedCardItem | null>(
    null,
  );
  const [selectedModalColor, setSelectedModalColor] =
    useState<string>("#2563EB");

  // Pointer-based Drag & Drop state (Zero freeze, zero browser lock)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  // Keep each workspace's saved state separate when switching the editor tabs.
  const allLeadsPreferences = useLeadCardPreferences("all_leads");
  const followUpPreferences = useLeadCardPreferences("follow_up");
  const preferences =
    activeWorkspace === "all_leads"
      ? allLeadsPreferences
      : followUpPreferences;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftDirtyRef = useRef(false);
  const draftSessionRef = useRef({ open: false, workspace: activeWorkspace });

  // Local draft items for non-destructive editing until saved
  const [draftItems, setDraftItems] = useState<UnifiedCardItem[]>(
    preferences.items,
  );

  // Load saved preferences on open/switch and late master loads, not over edits.
  useEffect(() => {
    const sessionChanged =
      draftSessionRef.current.open !== open ||
      draftSessionRef.current.workspace !== activeWorkspace;
    draftSessionRef.current = { open, workspace: activeWorkspace };
    if (sessionChanged) {
      draftDirtyRef.current = false;
      setSaveError(null);
      draggingIndexRef.current = null;
      overIndexRef.current = null;
      setDraggingIndex(null);
      setOverIndex(null);
      setColorPickerItem(null);
    }
    if (open && !draftDirtyRef.current) setDraftItems(preferences.items);
  }, [open, activeWorkspace, preferences.items]);

  // Open color picker sub-modal
  const openColorPicker = (item: UnifiedCardItem) => {
    setColorPickerItem(item);
    setSelectedModalColor(item.displayColor || "#2563EB");
  };

  // Reorder helpers (1-click step up/down)
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftItems.length) return;
    draftDirtyRef.current = true;

    const next = [...draftItems];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    const reindexed = next.map((item, idx) => ({ ...item, order: idx + 1 }));
    setDraftItems(reindexed);
  };

  // Pointer-based drag starter: 100% reliable, never locks browser
  const startPointerDrag = (e: React.PointerEvent, index: number) => {
    if (isSaving) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, switches, inputs or interactive controls
    if (
      target.closest(
        "button, [role='switch'], input, a, .interactive-control, .no-drag",
      )
    ) {
      return;
    }

    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasStartedDrag = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!hasStartedDrag) {
        if (Math.hypot(dx, dy) > 5) {
          hasStartedDrag = true;
          draggingIndexRef.current = index;
          setDraggingIndex(index);
        }
      }

      if (hasStartedDrag) {
        const elem = document.elementFromPoint(
          moveEvent.clientX,
          moveEvent.clientY,
        );
        const cardElem = elem?.closest("[data-drag-index]") as HTMLElement | null;
        if (cardElem) {
          const targetIdx = Number(cardElem.getAttribute("data-drag-index"));
          if (!isNaN(targetIdx) && targetIdx !== overIndexRef.current) {
            overIndexRef.current = targetIdx;
            setOverIndex(targetIdx);
          }
        }
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      if (hasStartedDrag) {
        const elem = document.elementFromPoint(
          upEvent.clientX,
          upEvent.clientY,
        );
        const cardElem = elem?.closest("[data-drag-index]") as HTMLElement | null;
        const fromIdx = draggingIndexRef.current;
        const toIdx = cardElem
          ? Number(cardElem.getAttribute("data-drag-index"))
          : overIndexRef.current;

        if (
          fromIdx !== null &&
          toIdx !== null &&
          !isNaN(toIdx) &&
          fromIdx !== toIdx
        ) {
          draftDirtyRef.current = true;
          setDraftItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next.map((item, idx) => ({ ...item, order: idx + 1 }));
          });
        }
      }

      draggingIndexRef.current = null;
      overIndexRef.current = null;
      setDraggingIndex(null);
      setOverIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const toggleVisibility = (
    id: string,
    key: "showInStatsCard" | "showInFilterBar",
  ) => {
    draftDirtyRef.current = true;
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [key]: !item[key] } : item,
      ),
    );
  };

  const updateColor = (id: string, colorHex: string) => {
    draftDirtyRef.current = true;
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, displayColor: colorHex } : item,
      ),
    );
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await preferences.savePreferences(draftItems);
      onOpenChange(false);
    } catch (error) {
      setSaveError(
        getApiErrorMessage(error, "Could not save card and pill preferences."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    draftDirtyRef.current = true;
    setDraftItems(preferences.getDefaultItems());
  };

  const statsCardsCount = useMemo(
    () => draftItems.filter((i) => i.showInStatsCard).length,
    [draftItems],
  );

  const filterPillsCount = useMemo(
    () => draftItems.filter((i) => i.showInFilterBar).length,
    [draftItems],
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isSaving) onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-5xl w-[94vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl bg-slate-50 border-slate-200 shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 bg-white border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-extrabold text-secondary flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Customize Dashboard Stats & Filter Pills
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
                  Grab and drag any card or filter pill to reposition it. Toggle
                  visibility and customize colors easily.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-3">
                {/* Workspace Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs font-bold rounded-md transition-all shadow-none",
                      activeWorkspace === "all_leads"
                        ? "bg-white text-secondary shadow-xs"
                        : "text-muted-foreground hover:text-secondary",
                    )}
                    onClick={() => setActiveWorkspace("all_leads")}
                    disabled={isSaving}
                  >
                    All Leads
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs font-bold rounded-md transition-all shadow-none",
                      activeWorkspace === "follow_up"
                        ? "bg-white text-secondary shadow-xs"
                        : "text-muted-foreground hover:text-secondary",
                    )}
                    onClick={() => setActiveWorkspace("follow_up")}
                    disabled={isSaving}
                  >
                    Follow-Ups
                  </Button>
                </div>

                {/* View Switcher: Stats Cards vs Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs font-bold rounded-md transition-all shadow-none gap-1.5",
                      activeTab === "cards"
                        ? "bg-primary text-white shadow-xs font-extrabold hover:bg-primary hover:text-white"
                        : "text-muted-foreground hover:text-secondary",
                    )}
                    onClick={() => setActiveTab("cards")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Stats Cards ({statsCardsCount})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs font-bold rounded-md transition-all shadow-none gap-1.5",
                      activeTab === "pills"
                        ? "bg-primary text-white shadow-xs font-extrabold hover:bg-primary hover:text-white"
                        : "text-muted-foreground hover:text-secondary",
                    )}
                    onClick={() => setActiveTab("pills")}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filter Pills ({filterPillsCount})
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Subheader info banner */}
          <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                {activeTab === "cards"
                  ? "Grab and drag any card to reorder how it appears on your dashboard."
                  : "Grab and drag any filter pill to reorder how quick filters appear."}
              </span>
            </div>
            <span className="text-[11px] font-bold text-blue-700 shrink-0">
              {draftItems.length} Total Configurable Items
            </span>
          </div>

          {/* Body Content */}
          {saveError && (
            <p role="alert" className="px-5 py-3 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 relative">
            <fieldset disabled={isSaving} className="min-w-0">
            {activeTab === "cards" ? (
              /* ============================================================ */
              /* TAB 1: DRAGGABLE ACTUAL VISUAL STATS CARDS                   */
              /* ============================================================ */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {draftItems.map((item, index) => {
                  const Icon = getMeaningfulIcon(item);
                  const tone = getToneStyles(item.displayColor);
                  const isBeingDragged = draggingIndex === index;
                  const isDragTarget =
                    overIndex === index && draggingIndex !== index;

                  return (
                    <div
                      key={item.id}
                      data-drag-index={index}
                      onPointerDown={(e) => startPointerDrag(e, index)}
                      className={cn(
                        "group relative flex flex-col rounded-xl border bg-white shadow-card transition-colors duration-100 select-none cursor-grab active:cursor-grabbing",
                        item.showInStatsCard
                          ? "border-slate-200 hover:border-slate-300 hover:shadow-md"
                          : "border-slate-200/60 bg-slate-50/70 opacity-60",
                        isBeingDragged &&
                          "opacity-40 border-dashed border-2 border-primary bg-slate-50",
                        isDragTarget &&
                          "border-2 border-primary ring-2 ring-primary/40 bg-blue-50/40 shadow-lg",
                      )}
                    >
                      {/* Top Control Bar of the Card */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/80">
                        {/* Drag Handle & Order Badge */}
                        <div className="flex items-center gap-1.5">
                          <div
                            className="p-1 rounded text-slate-400 group-hover:text-slate-700 transition"
                            title="Drag to reposition card"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-black font-mono text-slate-700">
                            #{item.order}
                          </span>
                          <Badge
                            variant="neutral"
                            className="text-[9px] px-1.5 py-0 rounded font-bold uppercase tracking-wider"
                          >
                            {item.category === "core"
                              ? "Core"
                              : item.category === "lead_type"
                              ? "Type"
                              : "Status"}
                          </Badge>
                        </div>

                        {/* Inline Card Controls: Color Picker + Card/Pill Switches */}
                        <div
                          className="flex items-center gap-2 interactive-control"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {/* Color Picker Swatch */}
                          <button
                            type="button"
                            className="w-5 h-5 min-w-[20px] min-h-[20px] rounded-full border border-black/15 shadow-2xs hover:scale-110 transition flex items-center justify-center cursor-pointer"
                            style={{
                              backgroundColor: item.displayColor || "#2563EB",
                            }}
                            title="Choose color"
                            onClick={(e) => {
                              e.stopPropagation();
                              openColorPicker(item);
                            }}
                          >
                            <Palette className="h-2.5 w-2.5 text-white drop-shadow-xs" />
                          </button>

                          {/* Card Switch */}
                          <div
                            className="flex items-center gap-1 pl-1 border-l border-slate-200"
                            title="Show/Hide this card on dashboard"
                          >
                            <span className="text-[10px] font-extrabold text-slate-500">
                              Card
                            </span>
                            <Switch
                              checked={item.showInStatsCard}
                              onCheckedChange={() =>
                                toggleVisibility(item.id, "showInStatsCard")
                              }
                            />
                          </div>

                          {/* Pill Switch */}
                          <div
                            className="flex items-center gap-1 pl-1 border-l border-slate-200"
                            title="Show/Hide as quick filter pill"
                          >
                            <span className="text-[10px] font-extrabold text-slate-500">
                              Pill
                            </span>
                            <Switch
                              checked={item.showInFilterBar}
                              onCheckedChange={() =>
                                toggleVisibility(item.id, "showInFilterBar")
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Visual Card Body (Matches exact CRM StatsRow design) */}
                      <div className="p-4 flex items-start gap-3 flex-1">
                        <span
                          className="flex size-11 shrink-0 items-center justify-center p-2 rounded-full transition-transform"
                          style={{
                            backgroundColor: tone.iconBg,
                            color: tone.iconColor,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-muted-foreground">
                            {item.name}
                          </p>
                          <p className="mt-1 truncate text-2xl font-extrabold leading-none text-secondary">
                            128
                          </p>
                          <p className="mt-2 truncate text-xs font-semibold text-secondary">
                            {item.description ||
                              (item.category === "lead_type"
                                ? "Lead classification"
                                : "Pipeline status")}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span
                              className={cn(
                                "text-[11px] font-extrabold",
                                item.showInStatsCard
                                  ? "text-emerald-600"
                                  : "text-slate-400",
                              )}
                            >
                              {item.showInStatsCard
                                ? "Active in Stats"
                                : "Hidden in Stats"}
                            </span>

                            {/* Up/Down Quick Step Buttons */}
                            <div
                              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity interactive-control"
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={index === 0}
                                className="h-5 w-5 p-0 hover:bg-slate-100 disabled:opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveItem(index, "up");
                                }}
                                aria-label={`Move ${item.name} up`}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={index === draftItems.length - 1}
                                className="h-5 w-5 p-0 hover:bg-slate-100 disabled:opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveItem(index, "down");
                                }}
                                aria-label={`Move ${item.name} down`}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ============================================================ */
              /* TAB 2: DRAGGABLE ACTUAL VISUAL FILTER PILLS                  */
              /* ============================================================ */
              <div className="space-y-2">
                {draftItems.map((item, index) => {
                  const Icon = getMeaningfulIcon(item);
                  const tone = getToneStyles(item.displayColor);
                  const isBeingDragged = draggingIndex === index;
                  const isDragTarget =
                    overIndex === index && draggingIndex !== index;

                  return (
                    <div
                      key={item.id}
                      data-drag-index={index}
                      onPointerDown={(e) => startPointerDrag(e, index)}
                      className={cn(
                        "group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl border bg-white shadow-2xs transition-colors duration-100 select-none gap-3 cursor-grab active:cursor-grabbing",
                        item.showInFilterBar
                          ? "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                          : "border-slate-200/60 bg-slate-50/60 opacity-60",
                        isBeingDragged &&
                          "opacity-40 border-dashed border-2 border-primary bg-slate-50",
                        isDragTarget &&
                          "border-2 border-primary ring-2 ring-primary/40 bg-blue-50/40 shadow-md",
                      )}
                    >
                      {/* Drag Handle & Sequential Order */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="p-1 rounded text-slate-400 group-hover:text-slate-700 transition"
                          title="Drag to reposition pill"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black font-mono text-slate-600 w-6 text-center">
                          #{item.order}
                        </span>
                      </div>

                      {/* The ACTUAL visual filter pill as it appears in the filter bar */}
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div
                          className="h-9 px-3.5 rounded-[12px] text-xs font-extrabold flex items-center gap-2 border transition-all shadow-2xs"
                          style={{
                            backgroundColor: tone.pillBg,
                            borderColor: tone.pillBorder,
                            color: tone.pillText,
                          }}
                        >
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: item.displayColor || "#2563EB",
                            }}
                          />
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.name}</span>
                          <span className="text-[10px] opacity-75 font-mono font-bold">
                            (24)
                          </span>
                        </div>

                        <Badge
                          variant="neutral"
                          className="text-[10px] font-bold px-2 py-0.5 rounded hidden md:inline-block"
                        >
                          {item.category === "core"
                            ? "Core Metric"
                            : item.category === "lead_type"
                            ? "Lead Type"
                            : "Status"}
                        </Badge>
                      </div>

                      {/* Inline Controls: Color Picker + Card Switch + Pill Switch + Arrows */}
                      <div
                        className="flex items-center gap-2.5 shrink-0 interactive-control"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {/* Color Picker Swatch */}
                        <button
                          type="button"
                          className="w-5 h-5 min-w-[20px] min-h-[20px] rounded-full border border-black/15 shadow-2xs hover:scale-110 transition flex items-center justify-center cursor-pointer"
                          style={{
                            backgroundColor: item.displayColor || "#2563EB",
                          }}
                          title="Choose color"
                          onClick={(e) => {
                            e.stopPropagation();
                            openColorPicker(item);
                          }}
                        >
                          <Palette className="h-2.5 w-2.5 text-white drop-shadow-xs" />
                        </button>

                        {/* Card Switch */}
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200"
                          title="Show/Hide as stats card"
                        >
                          <span className="text-[10px] font-extrabold text-secondary">
                            Card
                          </span>
                          <Switch
                            checked={item.showInStatsCard}
                            onCheckedChange={() =>
                              toggleVisibility(item.id, "showInStatsCard")
                            }
                          />
                        </div>

                        {/* Pill Switch */}
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200"
                          title="Show/Hide as filter pill"
                        >
                          <span className="text-[10px] font-extrabold text-secondary">
                            Pill
                          </span>
                          <Switch
                            checked={item.showInFilterBar}
                            onCheckedChange={() =>
                              toggleVisibility(item.id, "showInFilterBar")
                            }
                          />
                        </div>

                        {/* Quick Move Arrows */}
                        <div
                          className="flex flex-col interactive-control"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={index === 0}
                            className="h-4 w-5 p-0 hover:bg-slate-100 disabled:opacity-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(index, "up");
                            }}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={index === draftItems.length - 1}
                            className="h-4 w-5 p-0 hover:bg-slate-100 disabled:opacity-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(index, "down");
                            }}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </fieldset>
          </div>

          {/* Footer */}
          <DialogFooter className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-1.5 border-slate-200 shadow-none hover:bg-slate-50"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-bold shadow-none"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="text-xs font-bold"
                onClick={handleSave}
                disabled={
                  isSaving ||
                  preferences.statusMaster.isLoading ||
                  preferences.leadTypeMaster.isLoading
                }
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* SUB-MODAL DIALOG: COLOR PICKER WITH RECOMMENDED SAAS PALETTE */}
      {/* ============================================================ */}
      <Dialog
        open={Boolean(colorPickerItem)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setColorPickerItem(null);
        }}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-xl bg-white p-5 border border-slate-200 shadow-2xl z-50">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-extrabold text-secondary flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Choose Color: {colorPickerItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a curated SaaS palette color or choose a custom hex value.
            </DialogDescription>
          </DialogHeader>

          {/* Live Preview badge/pill */}
          {colorPickerItem && (
            <div className="my-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex size-9 items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: `${selectedModalColor}18`,
                    color: selectedModalColor,
                  }}
                >
                  {React.createElement(getMeaningfulIcon(colorPickerItem), {
                    className: "h-4 w-4",
                  })}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {colorPickerItem.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    Active:{" "}
                    <span className="font-mono font-bold">
                      {selectedModalColor}
                    </span>
                  </p>
                </div>
              </div>

              <div
                className="px-3 py-1 rounded-[10px] text-xs font-extrabold flex items-center gap-1.5 border transition-all"
                style={{
                  backgroundColor: `${selectedModalColor}15`,
                  borderColor: `${selectedModalColor}35`,
                  color: selectedModalColor,
                }}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedModalColor }}
                />
                Live Pill Preview
              </div>
            </div>
          )}

          {/* Curated Colors Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Recommended SaaS Palette
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXTENDED_SAAS_PALETTE.map((pal) => {
                const isSelected =
                  selectedModalColor.toLowerCase() === pal.hex.toLowerCase();
                return (
                  <button
                    key={pal.hex}
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all hover:scale-[1.02] cursor-pointer",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-blue-50/20 font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                    onClick={() => setSelectedModalColor(pal.hex)}
                  >
                    <span
                      className="size-4 rounded-md flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: pal.hex }}
                    >
                      {isSelected && (
                        <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                      {pal.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hex input */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-slate-700 shrink-0">
              Custom Hex Color:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedModalColor}
                onChange={(e) => setSelectedModalColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={selectedModalColor}
                onChange={(e) => setSelectedModalColor(e.target.value)}
                className="w-24 px-2 py-1 text-xs font-mono font-bold rounded border border-slate-200 uppercase text-slate-800"
              />
            </div>
          </div>

          <DialogFooter className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-bold"
              onClick={() => setColorPickerItem(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="text-xs font-bold"
              onClick={() => {
                if (colorPickerItem) {
                  updateColor(colorPickerItem.id, selectedModalColor);
                }
                setColorPickerItem(null);
              }}
            >
              Apply Color
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
