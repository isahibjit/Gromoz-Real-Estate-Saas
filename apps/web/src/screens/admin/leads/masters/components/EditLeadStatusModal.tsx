import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  cn,
} from "ui";
import { type LeadStatusRow } from "../leadMastersData";

interface EditLeadStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: LeadStatusRow | null;
  nextStatusOptions: { label: string; value: string }[];
  onSave: (data: Partial<LeadStatusRow>) => void;
}

const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#EF4444", // Red
  "#EC4899", // Pink
  "#64748B", // Slate
];

export function EditLeadStatusModal({
  isOpen,
  onClose,
  initialData,
  nextStatusOptions,
  onSave,
}: EditLeadStatusModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    statusType: "",
    defaultNextStatus: "",
    displayColor: "#3B82F6",
    isActive: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || "",
        code: initialData.code || "",
        description: initialData.description || "",
        category: initialData.category || "",
        statusType: initialData.statusType || "",
        defaultNextStatus: initialData.defaultNextStatus || "",
        displayColor: (initialData as any).displayColor || "#3B82F6",
        isActive: initialData.isActive ?? true,
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // TODO: Integrate with real update API here
    setTimeout(() => {
      onSave({
        ...formData,
        category: formData.category as LeadStatusRow["category"],
        statusType: formData.statusType as LeadStatusRow["statusType"],
      });
      setIsSaving(false);
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[720px] p-0 overflow-hidden bg-white gap-0 flex flex-col max-h-[90vh] md:h-auto"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex flex-col gap-1 pr-4">
            <h2 className="text-[22px] font-extrabold text-secondary">
              Edit Lead Status
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              Update the details of the lead status.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Status Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    if (e.target.value.length <= 50)
                      handleChange("name", e.target.value);
                  }}
                  placeholder="Enter status name"
                  className="h-11 shadow-none pr-14 font-semibold text-sm"
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
                    if (e.target.value.length <= 10)
                      handleChange("code", e.target.value);
                  }}
                  placeholder="Enter short code"
                  className="h-11 shadow-none pr-14 font-semibold text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {formData.code.length}/10
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Unique code used in system and reports.
              </p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-bold text-secondary">
                Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Textarea
                  value={formData.description}
                  onChange={(e) => {
                    if (e.target.value.length <= 200)
                      handleChange("description", e.target.value);
                  }}
                  placeholder="Enter description"
                  className="min-h-[90px] resize-none shadow-none font-semibold text-sm pb-6"
                />
                <span className="absolute right-3 bottom-2 text-xs font-medium text-muted-foreground">
                  {formData.description.length}/200
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={(val) => handleChange("category", val)}
              >
                <SelectTrigger className="h-11 shadow-none font-semibold text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open" className="font-semibold text-sm">
                    Open
                  </SelectItem>
                  <SelectItem
                    value="In Progress"
                    className="font-semibold text-sm"
                  >
                    In Progress
                  </SelectItem>
                  <SelectItem value="Closed" className="font-semibold text-sm">
                    Closed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-secondary">
                Status Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.statusType}
                onValueChange={(val) => handleChange("statusType", val)}
              >
                <SelectTrigger className="h-11 shadow-none font-semibold text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="System Default"
                    className="font-semibold text-sm"
                  >
                    System Default
                  </SelectItem>
                  <SelectItem value="Custom" className="font-semibold text-sm">
                    Custom
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                System: Default statuses
                <br />
                Custom: User defined
              </div>
            </div>

            {/* Default Next Status */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-bold text-secondary">
                Default Next Status
              </label>
              <Select
                value={formData.defaultNextStatus}
                onValueChange={(val) => handleChange("defaultNextStatus", val)}
              >
                <SelectTrigger className="h-11 shadow-none font-semibold text-sm">
                  <SelectValue placeholder="Select next status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="—" className="font-semibold text-sm">
                    None
                  </SelectItem>
                  {nextStatusOptions
                    .filter((opt) => opt.value !== initialData?.name)
                    .map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="font-semibold text-sm"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Status will automatically move to next status
              </p>
            </div>

            {/* Display Color */}
            <div className="flex flex-col gap-2.5 md:col-span-2">
              <label className="text-sm font-bold text-secondary">
                Display Color
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLORS.map((color) => {
                  const isSelected = formData.displayColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange("displayColor", color)}
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

            {/* Is Active Toggle */}
            <div className="flex flex-col gap-2 md:col-span-2 pt-2">
              <label className="text-sm font-bold text-secondary">
                Is Active
              </label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    handleChange("isActive", checked)
                  }
                />
                <span className="text-xs font-semibold text-slate-500">
                  Active statuses will be available for selection
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
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
            disabled={
              !formData.name ||
              !formData.code ||
              !formData.category ||
              !formData.statusType ||
              isSaving
            }
            className="h-11 px-6 font-bold shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
