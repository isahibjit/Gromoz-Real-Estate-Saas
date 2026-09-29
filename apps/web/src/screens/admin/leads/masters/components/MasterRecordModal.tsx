import { useMemo, useRef } from "react";
import { Check, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
} from "ui";

import {
  type LeadMasterBaseRow,
  type LeadMasterConfig,
} from "../leadMastersData";
import { PROJECT_WHATSAPP_TEMPLATE_VARIABLES } from "../../../projects/projectWhatsappShare";

interface MasterRecordModalProps {
  open: boolean;
  mode: "add" | "edit";
  categoryId: string;
  config: LeadMasterConfig;
  values: LeadMasterBaseRow;
  onChange: (
    key: keyof LeadMasterBaseRow,
    value: string | number | boolean,
  ) => void;
  onClose: () => void;
  onSave: () => void;
}

const defaultColors = [
  "#2563EB",
  "#059669",
  "#EA580C",
  "#E11D48",
  "#7C3AED",
  "#475569",
];

export function MasterRecordModal({
  open,
  mode,
  categoryId,
  config,
  values,
  onChange,
  onClose,
  onSave,
}: MasterRecordModalProps) {
  const textareaRefs = useRef<
    Partial<Record<keyof LeadMasterBaseRow, HTMLTextAreaElement | null>>
  >({});
  const isValid = useMemo(
    () =>
      config.formFields
        .filter((field) => field.required)
        .every((field) => {
          const value = values[field.key];
          return (
            value !== undefined && value !== null && String(value).trim() !== ""
          );
        }),
    [config.formFields, values],
  );
  const isProjectWhatsappTemplate =
    categoryId === "project_whatsapp_template";

  const insertTextAtCursor = (
    key: keyof LeadMasterBaseRow,
    text: string,
    maxLength?: number,
    explicitPosition?: number,
  ) => {
    const currentValue = String(values[key] ?? "");
    const textarea = textareaRefs.current[key];
    const start = explicitPosition ?? textarea?.selectionStart ?? currentValue.length;
    const end = explicitPosition ?? textarea?.selectionEnd ?? currentValue.length;
    const prefix = currentValue.slice(0, start);
    const suffix = currentValue.slice(end);
    const spacerBefore =
      prefix.length > 0 && !/[\s\n]$/.test(prefix) ? " " : "";
    const spacerAfter = suffix.length > 0 && !/^[\s\n]/.test(suffix) ? " " : "";
    const nextValue = `${prefix}${spacerBefore}${text}${spacerAfter}${suffix}`;

    if (maxLength && nextValue.length > maxLength) {
      return;
    }

    onChange(key, nextValue);

    window.requestAnimationFrame(() => {
      const nextCursor =
        prefix.length + spacerBefore.length + text.length + spacerAfter.length;
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-[780px] overflow-hidden p-0"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="pr-6">
            <h2 className="text-[22px] font-extrabold text-secondary">
              {mode === "add" ? config.addTitle : config.editTitle}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Update how this master is used across the lead management
              workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {config.formFields.map((field) => {
              const fieldValue = values[field.key];
              const isWide = field.type === "textarea";
              const isFollowUpRenotifyField =
                field.key === "followUpRenotifyMinutes";
              const isFollowUpRenotifyDisabled =
                isFollowUpRenotifyField &&
                values.followUpNotificationEnabled === false;
              const colorChoices =
                field.options?.map((option) => option.value) ?? defaultColors;

              return (
                <div
                  key={`${categoryId}-${String(field.key)}`}
                  className={cn(
                    "flex flex-col gap-1.5",
                    isWide && "md:col-span-2",
                  )}
                >
                  <label className="text-sm font-bold text-secondary">
                    {field.label}
                    {field.required ? (
                      <span className="text-red-500"> *</span>
                    ) : null}
                  </label>

                  {field.type === "text" ? (
                    <div className="relative">
                      <Input
                        value={String(fieldValue ?? "")}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (
                            !field.maxLength ||
                            nextValue.length <= field.maxLength
                          ) {
                            onChange(field.key, nextValue);
                          }
                        }}
                        placeholder={field.placeholder}
                        className="h-11 pr-14 text-sm font-semibold shadow-none"
                      />
                      {field.maxLength ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                          {String(fieldValue ?? "").length}/{field.maxLength}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {field.type === "textarea" ? (
                    <div className="space-y-3">
                      {isProjectWhatsappTemplate &&
                      field.key === "description" ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-extrabold text-secondary">
                              Template variables
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              Drag into the message or click to insert.
                            </p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {PROJECT_WHATSAPP_TEMPLATE_VARIABLES.map((variable) => (
                              <button
                                key={variable.token}
                                type="button"
                                draggable
                                onClick={() =>
                                  insertTextAtCursor(
                                    field.key,
                                    variable.token,
                                    field.maxLength,
                                  )
                                }
                                onDragStart={(event) => {
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    variable.token,
                                  );
                                  event.dataTransfer.effectAllowed = "copy";
                                }}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-secondary shadow-none transition-colors hover:border-primary hover:text-primary"
                                title={variable.token}
                              >
                                {variable.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="relative">
                        <Textarea
                          ref={(node) => {
                            textareaRefs.current[field.key] = node;
                          }}
                          value={String(fieldValue ?? "")}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            if (
                              !field.maxLength ||
                              nextValue.length <= field.maxLength
                            ) {
                              onChange(field.key, nextValue);
                            }
                          }}
                          onDragOver={(event) => {
                            if (
                              isProjectWhatsappTemplate &&
                              field.key === "description"
                            ) {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "copy";
                            }
                          }}
                          onDrop={(event) => {
                            if (
                              !isProjectWhatsappTemplate ||
                              field.key !== "description"
                            ) {
                              return;
                            }
                            const token =
                              event.dataTransfer.getData("text/plain");
                            if (!token.startsWith("{{")) return;
                            event.preventDefault();
                            insertTextAtCursor(
                              field.key,
                              token,
                              field.maxLength,
                              event.currentTarget.selectionStart,
                            );
                          }}
                          placeholder={field.placeholder}
                          className={cn(
                            "min-h-[96px] resize-none pb-6 text-sm font-semibold shadow-none",
                            isProjectWhatsappTemplate &&
                              field.key === "description" &&
                              "min-h-[260px] font-mono text-xs leading-6",
                          )}
                        />
                      {field.maxLength ? (
                        <span className="absolute bottom-2 right-3 text-xs font-medium text-muted-foreground">
                          {String(fieldValue ?? "").length}/{field.maxLength}
                        </span>
                      ) : null}
                      </div>
                    </div>
                  ) : null}

                  {field.type === "number" ? (
                    <div
                      className={cn(
                        "flex h-11 overflow-hidden rounded-md border border-input bg-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20",
                        isFollowUpRenotifyDisabled &&
                          "bg-slate-50 opacity-70 focus-within:border-input focus-within:ring-0",
                      )}
                    >
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={Number(fieldValue ?? 0)}
                        disabled={isFollowUpRenotifyDisabled}
                        onChange={(event) =>
                          onChange(field.key, Number(event.target.value || 0))
                        }
                        className="flex-1 bg-transparent px-3 text-sm font-semibold outline-none"
                      />
                      {field.suffix ? (
                        <div className="flex items-center border-l border-input bg-slate-50 px-4 text-sm font-bold text-secondary">
                          {field.suffix}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {field.type === "select" ? (
                    <Select
                      value={String(fieldValue ?? "")}
                      onValueChange={(value) => onChange(field.key, value)}
                    >
                      <SelectTrigger className="h-11 text-sm font-semibold shadow-none">
                        <SelectValue
                          placeholder={
                            field.placeholder ??
                            `Select ${field.label.toLowerCase()}`
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="font-semibold"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  {field.type === "toggle" ? (
                    <div className="flex items-center gap-3 pt-2">
                      <Switch
                        checked={Boolean(fieldValue)}
                        onCheckedChange={(checked) =>
                          onChange(field.key, checked)
                        }
                      />
                      <span className="text-sm font-semibold text-slate-600">
                        {field.helperText ??
                          `${field.label} for future selections and workflows.`}
                      </span>
                    </div>
                  ) : null}

                  {field.type === "color" ? (
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {colorChoices.map((color) => {
                        const selected = fieldValue === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => onChange(field.key, color)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105",
                              selected && "ring-2 ring-slate-300 ring-offset-2",
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {selected ? (
                              <Check className="h-4 w-4 text-white" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {field.helperText && field.type !== "toggle" ? (
                    <p className="text-[11px] font-medium text-slate-500">
                      {field.helperText}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-5 font-bold shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!isValid}
            className="h-10 px-5 font-bold shadow-sm"
          >
            {mode === "add" ? "Save" : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
