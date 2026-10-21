import { useId } from "react";
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "ui";
export function WorkspaceSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function WorkspacePagination({
  page,
  total,
  pageSize,
  onChange,
  busy,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  busy: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted-foreground">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}-${Math.min(
              page * pageSize,
              total,
            )} of ${total}`
          : "No entries"}
      </span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export const dateLabel = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not configured";
export const humanLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
export const moneyLabel = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    amount,
  );
