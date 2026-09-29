import * as React from "react";
import { Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../Dialog/Dialog";
import { Button } from "../Button/Button";
import { cn } from "../../lib/utils";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  entityName?: string;
  icon?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  entityName,
  icon,
  confirmLabel = "Yes, Delete",
  cancelLabel = "Cancel",
  destructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-[440px] p-6 text-center gap-6"
        showCloseButton={false}
      >
        <button
          onClick={onClose}
          aria-label="Close delete confirmation"
          className="absolute right-4 top-4 rounded-md opacity-70 transition-opacity hover:opacity-100 hover:bg-slate-100 p-2 text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-4 mt-2">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            {icon || <Trash2 className="w-6 h-6 text-red-500" />}
          </div>

          <DialogHeader className="space-y-2 flex flex-col items-center sm:text-center w-full">
            <DialogTitle className="text-xl text-secondary">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground whitespace-pre-wrap max-w-[90%] mx-auto leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-11 border-slate-200 text-secondary shadow-none font-bold text-[15px]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 h-11 shadow-none font-bold text-[15px]",
              destructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white",
            )}
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
