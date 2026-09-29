import { useState, useEffect } from "react";
import { Flag, X, Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";
import { type LeadStageRow } from "../leadMastersData";

interface LeadStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialData?: LeadStageRow | null;
  leadStages: LeadStageRow[];
  onSave: (data: Partial<LeadStageRow>) => void;
}

const COLORS = [
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#F97316", // Orange
  "#EF4444", // Red
  "#EC4899", // Pink
  "#8B4513", // Brown
  "#94A3B8", // Gray
];

export function LeadStageModal({
  isOpen,
  onClose,
  mode,
  initialData,
  leadStages,
  onSave,
}: LeadStageModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    probability: 0,
    type: "",
    defaultNextStage: "",
    expectedTime: 0,
    expectedTimeUnit: "Days",
    stageColor: "#8B5CF6",
    icon: "Flag",
    status: "Active",
    isSystemDefault: false,
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setFormData({
          name: initialData.name || "",
          code: (initialData as any).code || "",
          description: initialData.description || "",
          probability: initialData.probability || 0,
          type: initialData.type || "",
          defaultNextStage: initialData.defaultNextStage || "",
          expectedTime: (initialData as any).expectedTime || 0,
          expectedTimeUnit: (initialData as any).expectedTimeUnit || "Days",
          stageColor: (initialData as any).stageColor || "#8B5CF6",
          icon: (initialData as any).icon || "Flag",
          status: initialData.status || "Active",
          isSystemDefault: initialData.isSystemDefault || false,
        });
      } else {
        setFormData({
          name: "",
          code: "",
          description: "",
          probability: 0,
          type: "",
          defaultNextStage: "",
          expectedTime: 0,
          expectedTimeUnit: "Days",
          stageColor: "#8B5CF6",
          icon: "Flag",
          status: "Active",
          isSystemDefault: false,
        });
      }
    }
  }, [isOpen, mode, initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Basic validation could be added here
    onSave({
      ...formData,
      type: formData.type as LeadStageRow["type"],
      status: formData.status as LeadStageRow["status"],
      id: initialData?.id,
    });
  };

  const typeOptions = ["Open", "In Progress", "Closed Won", "Closed Lost"];
  const unitOptions = ["Hours", "Days", "Weeks"];
  const iconOptions = ["Flag", "Star", "Shield", "Check", "Alert"];

  const nextStageOptions = leadStages.filter(
    (stage) => mode === "add" || stage.id !== initialData?.id,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[820px] p-0 overflow-hidden bg-white gap-0 flex flex-col max-h-[90vh] md:h-auto"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-extrabold text-secondary">
              {mode === "edit" ? "Edit Lead Stage" : "Add / Edit Lead Stage"}
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              Define stage details and set the default next stage in the lead
              pipeline.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stage Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Stage Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    if (e.target.value.length <= 50)
                      handleChange("name", e.target.value);
                  }}
                  placeholder="Enter stage name"
                  className="h-11 shadow-none pr-14 font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {formData.name.length}/50
                </span>
              </div>
            </div>

            {/* Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={formData.code}
                  onChange={(e) => {
                    if (e.target.value.length <= 20)
                      handleChange("code", e.target.value);
                  }}
                  placeholder="Enter stage code"
                  className="h-11 shadow-none pr-14 font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {formData.code.length}/20
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Unique code for internal reference
              </p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-bold text-secondary">
                Description
              </label>
              <div className="relative">
                <Textarea
                  value={formData.description}
                  onChange={(e) => {
                    if (e.target.value.length <= 250)
                      handleChange("description", e.target.value);
                  }}
                  placeholder="Enter description"
                  className="min-h-[90px] resize-none shadow-none font-semibold pb-6"
                />
                <span className="absolute right-3 bottom-2 text-xs font-medium text-muted-foreground">
                  {formData.description.length}/250
                </span>
              </div>
            </div>

            {/* Probability % */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Probability % <span className="text-red-500">*</span>
              </label>
              <div className="flex h-11 rounded-md border border-input bg-transparent overflow-hidden focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val >= 0 && val <= 100)
                      handleChange("probability", val);
                  }}
                  className="flex-1 px-3 text-sm font-semibold outline-none bg-transparent"
                />
                <div className="flex items-center justify-center px-4 bg-slate-50 border-l border-input text-secondary font-bold text-sm">
                  %
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Probability of lead conversion at this stage
              </p>
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.type}
                onValueChange={(val) => handleChange("type", val)}
              >
                <SelectTrigger className="h-11 shadow-none font-semibold">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t} className="font-semibold">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Type of stage in the pipeline
              </p>
            </div>

            {/* Default Next Stage */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Default Next Stage
              </label>
              <Select
                value={formData.defaultNextStage}
                onValueChange={(val) => handleChange("defaultNextStage", val)}
              >
                <SelectTrigger className="h-11 shadow-none font-semibold">
                  <SelectValue placeholder="Select next stage" />
                </SelectTrigger>
                <SelectContent>
                  {nextStageOptions.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.name}
                      className="font-semibold"
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Next stage to move automatically
              </p>
            </div>

            {/* Expected Time to Next Stage */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Expected Time to Next Stage
              </label>
              <div className="flex h-11 rounded-md border border-input bg-transparent overflow-hidden focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary">
                <input
                  type="number"
                  min="0"
                  value={formData.expectedTime}
                  onChange={(e) =>
                    handleChange("expectedTime", parseInt(e.target.value) || 0)
                  }
                  className="w-20 border-r border-input px-3 text-sm font-semibold outline-none bg-transparent"
                />
                <select
                  value={formData.expectedTimeUnit}
                  onChange={(e) =>
                    handleChange("expectedTimeUnit", e.target.value)
                  }
                  className="flex-1 px-3 text-sm font-semibold outline-none bg-transparent appearance-none"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-center px-3 pointer-events-none text-muted-foreground">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819L7.43179 8.56819C7.60753 8.74393 7.89245 8.74393 8.06819 8.56819L10.5682 6.06819C10.7439 5.89245 10.7439 5.60753 10.5682 5.43179C10.3924 5.25605 10.1075 5.25605 9.93179 5.43179L7.75 7.61358L5.56819 5.43179C5.39245 5.25605 5.10753 5.25605 4.93179 5.43179Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Average time to move to next stage
              </p>
            </div>

            {/* Stage Color */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-secondary">
                Stage Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((color) => {
                  const isSelected = formData.stageColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange("stageColor", color)}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                        isSelected && "ring-2 ring-offset-2 ring-slate-400",
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">Icon</label>
              <div className="flex gap-2">
                <Select
                  value={formData.icon}
                  onValueChange={(val) => handleChange("icon", val)}
                >
                  <SelectTrigger className="h-11 flex-1 shadow-none font-semibold">
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((i) => (
                      <SelectItem key={i} value={i} className="font-semibold">
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-11 h-11 border border-slate-200 rounded-md flex items-center justify-center bg-white text-blue-600 shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex flex-col">
              <ToggleCard
                title="Active"
                description="Active stages will be available in lead pipeline."
                checked={formData.status === "Active"}
                onChange={(checked) =>
                  handleChange("status", checked ? "Active" : "Inactive")
                }
              />
            </div>

            {/* System Default Toggle */}
            <div className="flex flex-col">
              <ToggleCard
                title="System Default"
                description="System default stages cannot be deleted."
                checked={formData.isSystemDefault}
                onChange={(checked) => handleChange("isSystemDefault", checked)}
                disabled={mode === "edit" && initialData?.isSystemDefault}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 px-6 font-bold shadow-none text-secondary"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="h-11 px-6 font-bold shadow-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
          >
            Save Stage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 h-[84px]",
        disabled && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-1 pr-4">
        <span className="text-sm font-bold text-secondary">{title}</span>
        <span className="text-xs font-medium text-muted-foreground leading-tight">
          {description}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-[26px] w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          checked ? "bg-blue-600" : "bg-slate-200",
          disabled && "cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
