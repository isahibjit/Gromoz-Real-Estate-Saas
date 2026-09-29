import * as React from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../DropdownMenu/DropdownMenu";

export interface MultiSelectOption {
  label: string;
  value: string;
  avatarUrl?: string;
}

export interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  maxLabelCount?: number;
  label?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  noOptionsText?: string;
  selectedLabelText?: string;
  selectedLabelTextPlural?: string;
  showTriggerIcon?: boolean;
  showTriggerSummary?: boolean;
  modal?: boolean;
  portaled?: boolean;
}

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select options",
  className,
  contentClassName,
  disabled,
  maxLabelCount = 2,
  label,
  ariaLabel,
  searchPlaceholder = "Search...",
  noOptionsText = "No matching options",
  selectedLabelText = "option",
  selectedLabelTextPlural = "options",
  showTriggerIcon = true,
  showTriggerSummary = true,
  modal = true,
  portaled = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const keepOpenAfterSelectionRef = React.useRef(false);
  const hasSelectedValue = (optionValue: string) =>
    value.indexOf(optionValue) !== -1;
  const keepMenuOpenAfterSelection = () => {
    keepOpenAfterSelectionRef.current = true;
    Promise.resolve().then(() => {
      keepOpenAfterSelectionRef.current = false;
    });
  };
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && keepOpenAfterSelectionRef.current) {
      setOpen(true);
      return;
    }

    setOpen(nextOpen);
  };
  const preventMenuClose = (event: Event) => {
    (event as unknown as { preventDefault: () => void }).preventDefault();
    keepMenuOpenAfterSelection();
  };
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = (event as unknown as { currentTarget: { value: string } })
      .currentTarget.value;
    setQuery(nextValue);
  };

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 15);
    return () => clearTimeout(timer);
  }, [open]);

  const selectedOptions = options.filter((option) =>
    hasSelectedValue(option.value),
  );

  const selectedLabels = selectedOptions.map((option) => option.label);

  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const primaryOptions = selectedOptions.slice(0, maxLabelCount);
  const remainingCount = Math.max(
    selectedOptions.length - primaryOptions.length,
    0,
  );
  const hasPanelLabel = Boolean(label);

  const toggleOption = (optionValue: string, checked: boolean) => {
    keepMenuOpenAfterSelection();

    if (checked) {
      onValueChange([...value, optionValue]);
      return;
    }

    onValueChange(value.filter((currentValue) => currentValue !== optionValue));
  };

  const clearSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    keepMenuOpenAfterSelection();
    onValueChange([]);
  };

  const contentProps = {
    align: "start" as const,
    sideOffset: 0,
    onCloseAutoFocus: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
    onTypeSelect: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
    className: cn(
      portaled
        ? "-mt-px flex w-[var(--radix-dropdown-menu-trigger-width)] min-w-[320px] flex-col overflow-hidden rounded-md border-slate-200 bg-white p-0 shadow-[0_18px_48px_rgba(15,37,68,0.14)]"
        : "z-50 -mt-px flex w-[var(--radix-dropdown-menu-trigger-width)] min-w-[320px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 shadow-[0_18px_48px_rgba(15,37,68,0.14)] focus:outline-none",
      contentClassName,
    ),
  };

  const dropdownContent = (
    <>
      <div
        className={cn(
          "border-b border-slate-100",
          hasPanelLabel ? "px-4 py-3" : "px-3 py-2",
        )}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {hasPanelLabel ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <DropdownMenuLabel className="px-0 py-0 text-sm font-extrabold text-secondary">
                {label}
              </DropdownMenuLabel>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Choose one or more options for this field.
              </p>
            </div>
            {value.length > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-extrabold text-primary transition-colors hover:bg-primary/5"
                onClick={clearSelection}
              >
                <X className="size-3.5" />
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-center gap-2",
            hasPanelLabel && "mt-3",
          )}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              autoComplete="off"
              name="multiSelectSearchQueryInput"
              value={query}
              placeholder={searchPlaceholder}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-card pl-9 pr-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              onChange={handleQueryChange}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onKeyDownCapture={(e) => {
                if (e.key === "Escape" || e.key === "Tab") return;
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
          {!hasPanelLabel && value.length > 0 ? (
            <button
              type="button"
              className="h-10 shrink-0 rounded-md border border-slate-200 px-3 text-xs font-extrabold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              onClick={clearSelection}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {visibleOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={hasSelectedValue(option.value)}
              onCheckedChange={(checked) =>
                toggleOption(option.value, checked === true)
              }
              onSelect={preventMenuClose}
              className={cn(
                "min-h-11 gap-3 rounded-md border border-transparent py-3 pl-10 pr-3 text-sm font-semibold text-secondary transition-colors focus:bg-slate-50",
                hasSelectedValue(option.value) &&
                  "border-primary/15 bg-primary/5 text-secondary",
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                {option.avatarUrl ? (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={option.avatarUrl} alt={option.label} />
                    <AvatarFallback className="text-[10px]">
                      {option.label.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <span className="block min-w-0 truncate">{option.label}</span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}

          {visibleOptions.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-extrabold text-secondary">
                {noOptionsText}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <DropdownMenuSeparator className="mx-0 my-0" />
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">
          {value.length === 0
            ? `Select ${selectedLabelTextPlural} to continue.`
            : `${value.length} ${
                value.length === 1
                  ? selectedLabelText
                  : selectedLabelTextPlural
              } selected`}
        </p>
        {value.length < options.length ? (
          <button
            type="button"
            className="text-xs font-extrabold text-secondary transition-colors hover:text-primary"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              keepMenuOpenAfterSelection();
              onValueChange(options.map((option) => option.value));
            }}
          >
            Select all
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <DropdownMenu modal={modal} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? label ?? placeholder}
          className={cn(
            "h-auto min-h-12 w-full items-center justify-between rounded-md border-slate-200 px-3 py-2 text-left text-secondary shadow-none hover:bg-white",
            open && "border-primary/50 ring-2 ring-ring/15",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            {showTriggerIcon ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-secondary">
                <SlidersHorizontal className="size-4" />
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              {selectedLabels.length === 0 ? (
                <span className="block truncate text-sm font-semibold text-muted-foreground">
                  {placeholder}
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-1.5">
                  {primaryOptions.map((selectedOption) => (
                    <Badge
                      key={selectedOption.value}
                      className="inline-flex items-center gap-1.5 rounded-md border-primary/15 bg-primary/10 px-2 py-1 text-[11px] font-extrabold text-primary"
                    >
                      {selectedOption.avatarUrl ? (
                        <Avatar className="h-4 w-4 shrink-0 border-0 bg-transparent">
                          <AvatarImage
                            src={selectedOption.avatarUrl}
                            alt={selectedOption.label}
                          />
                          <AvatarFallback className="bg-primary/15 text-[8px] text-primary">
                            {selectedOption.label.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      {selectedOption.label}
                    </Badge>
                  ))}
                  {remainingCount > 0 ? (
                    <Badge className="rounded-md border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-secondary">
                      +{remainingCount} more
                    </Badge>
                  ) : null}
                </span>
              )}
              {showTriggerSummary ? (
                <span className="mt-1 block text-[11px] font-bold text-muted-foreground">
                  {selectedLabels.length === 0
                    ? `No ${selectedLabelTextPlural} selected`
                    : `${selectedLabels.length} selected`}
                </span>
              ) : null}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      {portaled ? (
        <DropdownMenuContent {...contentProps}>{dropdownContent}</DropdownMenuContent>
      ) : (
        <DropdownMenuPrimitive.Content {...contentProps}>
          {dropdownContent}
        </DropdownMenuPrimitive.Content>
      )}
    </DropdownMenu>
  );
}
