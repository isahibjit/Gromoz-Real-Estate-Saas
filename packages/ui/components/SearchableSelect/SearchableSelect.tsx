import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "../../lib/utils";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../DropdownMenu/DropdownMenu";
import { Avatar, AvatarFallback, AvatarImage } from "../Avatar/Avatar";

export interface SearchableSelectOption {
  label: string;
  value: string;
  className?: string;
  avatarUrl?: string;
  imageUrl?: string;
  description?: string;
}

export interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  noOptionsText?: string;
  modal?: boolean;
  portaled?: boolean;
  sortAlphabetical?: boolean;
}

function getOptionMatchScore(
  label: string | undefined,
  description: string | undefined,
  normalizedQuery: string,
): number {
  if (!normalizedQuery) return 0;

  const cleanLabel = (label ?? "").trim().toLowerCase();
  const cleanDesc = (description ?? "").trim().toLowerCase();

  // 1. Exact match on full label
  if (cleanLabel === normalizedQuery) return 1000;

  // 2. Label starts with query
  if (cleanLabel.startsWith(normalizedQuery)) return 800;

  // 3. Any word in label starts with query (e.g. query "salat" matches "Zakiya Salat")
  const labelWords = cleanLabel.split(/[\s,._\-/()]+/);
  if (labelWords.some((word) => word.startsWith(normalizedQuery))) return 600;

  // 4. Label contains query substring
  if (cleanLabel.includes(normalizedQuery)) return 400;

  // 5. Exact match on description
  if (cleanDesc === normalizedQuery) return 300;

  // 6. Description starts with query
  if (cleanDesc.startsWith(normalizedQuery)) return 250;

  // 7. Any word in description starts with query
  const descWords = cleanDesc.split(/[\s,._\-/()]+/);
  if (descWords.some((word) => word.startsWith(normalizedQuery))) return 200;

  // 8. Description contains query substring
  if (cleanDesc.includes(normalizedQuery)) return 100;

  // 9. Multi-word search (e.g. "mis test")
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const combined = `${cleanLabel} ${cleanDesc}`;
    const allTokensMatch = queryTokens.every((token) => combined.includes(token));
    if (allTokensMatch) {
      if (cleanLabel.startsWith(queryTokens[0])) return 500;
      if (labelWords.some((w) => w.startsWith(queryTokens[0]))) return 450;
      return 350;
    }
  }

  return 0;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select option",
  className,
  contentClassName,
  disabled,
  label,
  ariaLabel,
  searchPlaceholder = "Search...",
  noOptionsText = "No matching options",
  modal = false,
  portaled = false,
  sortAlphabetical = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedOption = options.find((option) => option.value === value);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleOptions = React.useMemo(() => {
    if (!normalizedQuery) {
      if (sortAlphabetical) {
        return [...options].sort((a, b) =>
          (a.label ?? "").localeCompare(b.label ?? "", undefined, {
            sensitivity: "base",
            numeric: true,
          }),
        );
      }
      return options;
    }

    const scored = options
      .map((option) => ({
        option,
        score: getOptionMatchScore(option.label, option.description, normalizedQuery),
      }))
      .filter((item) => item.score > 0);

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.option.label ?? "").localeCompare(b.option.label ?? "", undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });

    return scored.map((item) => item.option);
  }, [options, normalizedQuery, sortAlphabetical]);

  const visibleOptionsRef = React.useRef(visibleOptions);
  visibleOptionsRef.current = visibleOptions;

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const inputEl = inputRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (visibleOptionsRef.current.length > 0) {
          handleSelect(visibleOptionsRef.current[0].value);
        }
        return;
      }

      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    if (inputEl) {
      inputEl.addEventListener("keydown", handleKeyDown, true);
    }

    const timer = setTimeout(() => {
      inputEl?.focus();
    }, 15);

    return () => {
      if (inputEl) {
        inputEl.removeEventListener("keydown", handleKeyDown, true);
      }
      clearTimeout(timer);
    };
  }, [open]);

  const contentProps = {
    align: "start" as const,
    sideOffset: 0,
    onCloseAutoFocus: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
    onOpenAutoFocus: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      inputRef.current?.focus();
    },
    onTypeSelect: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
    className: cn(
      portaled
        ? "-mt-px w-[var(--radix-dropdown-menu-trigger-width)] min-w-[320px] rounded-md border-slate-200 p-0 bg-white shadow-[0_18px_48px_rgba(15,37,68,0.14)]"
        : "z-50 -mt-px w-[var(--radix-dropdown-menu-trigger-width)] min-w-[320px] rounded-md border border-slate-200 p-0 bg-white shadow-[0_18px_48px_rgba(15,37,68,0.14)] focus:outline-none",
      contentClassName,
    ),
  };

  const dropdownContent = (
    <>
      <div
        className="border-b border-slate-100 px-3 py-2"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoComplete="off"
            name="searchableSelectInputQuery"
            value={query}
            placeholder={searchPlaceholder}
            className="h-9 border-slate-200 bg-card pl-9 pr-3 text-sm font-semibold"
            onChange={(event) => setQuery(event.target.value)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerDownCapture={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => {
              if (e.key === "Escape" || e.key === "Tab") return;
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Tab") return;
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                if (visibleOptions.length > 0) {
                  handleSelect(visibleOptions[0].value);
                }
              }
            }}
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto px-1 py-1">
        <div className="space-y-1">
          {visibleOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value}
                onSelect={(e) => {
                  e.preventDefault();
                  handleSelect(option.value);
                }}
                className={cn(
                  "min-h-9 gap-3 rounded-md px-3 py-2 text-xs font-semibold text-secondary transition-colors focus:bg-slate-50 cursor-pointer",
                  isSelected && "bg-primary/5 text-primary",
                  option.className,
                )}
              >
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt=""
                        className="h-10 w-12 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    {option.avatarUrl && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={option.avatarUrl} alt={option.label} />
                        <AvatarFallback className="text-[10px]">
                          {option.label.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {isSelected && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </span>
              </DropdownMenuItem>
            );
          })}

          {visibleOptions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm font-bold text-secondary">
                {noOptionsText}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <DropdownMenu modal={modal} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? label ?? placeholder}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-card px-3 text-left text-sm font-semibold text-secondary shadow-none hover:bg-white",
            open && "border-primary/50 ring-2 ring-ring/15",
            className,
          )}
        >
          <span className="truncate flex-1 flex items-center gap-2 min-w-0">
            {selectedOption ? (
              <>
                {selectedOption.avatarUrl && (
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={selectedOption.avatarUrl} alt={selectedOption.label} />
                    <AvatarFallback className="text-[8px]">
                      {selectedOption.label.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                {selectedOption.imageUrl ? (
                  <img
                    src={selectedOption.imageUrl}
                    alt=""
                    className="h-7 w-9 shrink-0 rounded object-cover"
                  />
                ) : null}
                <span className="min-w-0">
                  <span
                    className={cn("block truncate", selectedOption.className)}
                  >
                    {selectedOption.label}
                  </span>
                  {selectedOption.description ? (
                    <span className="block truncate text-[10px] font-medium text-muted-foreground">
                      {selectedOption.description}
                    </span>
                  ) : null}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform ml-2",
              open && "rotate-180",
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      {portaled ? (
        <DropdownMenuContent {...contentProps}>
          {dropdownContent}
        </DropdownMenuContent>
      ) : (
        <DropdownMenuPrimitive.Content {...contentProps}>
          {dropdownContent}
        </DropdownMenuPrimitive.Content>
      )}
    </DropdownMenu>
  );
}
