import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Check, ChevronDown, Clock, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  cn,
} from "ui";

export interface ClockTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  widthClassName?: string;
}

type ClockMode = "hour" | "minute";
type Period = "AM" | "PM";

const CLOCK_DIAL_SIZE = 192;
const CLOCK_CENTER = CLOCK_DIAL_SIZE / 2;
const HOUR_MARKER_RADIUS = 68;
const MINUTE_MARKER_RADIUS = 76;
const hourLabelOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const minuteLabelOptions = Array.from({ length: 12 }, (_, index) => index * 5);
const clampHour = (hour: number) => Math.min(Math.max(hour, 1), 12);
const clampMinute = (minute: number) => Math.min(Math.max(minute, 0), 59);

const parseTimeParts = (timeStr?: string) => {
  const match = timeStr?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { hour: 9, minute: 0, period: "AM" as Period };
  }

  return {
    hour: clampHour(Number.parseInt(match[1], 10)),
    minute: clampMinute(Number.parseInt(match[2], 10)),
    period: match[3].toUpperCase() as Period,
  };
};

const formatTimeParts = (hour: number, minute: number, period: Period) => {
  const normalizedHour =
    hour < 1 ? 12 : hour > 12 ? ((hour - 1) % 12) + 1 : hour;
  const normalizedMinute = clampMinute(minute);
  return `${normalizedHour.toString().padStart(2, "0")}:${normalizedMinute
    .toString()
    .padStart(2, "0")} ${period}`;
};
const parseEditableNumber = (value: string) =>
  Number.parseInt(value.replace(/\D/g, ""), 10);

const getDialPosition = (angle: number, radius: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    left: `${CLOCK_CENTER + Math.cos(radians) * radius}px`,
    top: `${CLOCK_CENTER + Math.sin(radians) * radius}px`,
  };
};

const getHourAngle = (hour: number, minute: number) =>
  ((hour % 12) + minute / 60) * 30;
const getMinuteAngle = (minute: number) => minute * 6;
const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
const angleToHour = (angle: number) => {
  const hour = Math.round(normalizeAngle(angle) / 30) % 12;
  return hour === 0 ? 12 : hour;
};
const angleToMinute = (angle: number) => {
  const minute = Math.round(normalizeAngle(angle) / 6) % 60;
  return minute === 60 ? 0 : minute;
};
const getAngleFromPointer = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
) => {
  const x = clientX - (rect.left + rect.width / 2);
  const y = clientY - (rect.top + rect.height / 2);
  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI + 90);
};

export function ClockTimePicker({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select time",
  allowClear = false,
  widthClassName = "w-full",
}: ClockTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClockMode>("hour");
  const [draggingMode, setDraggingMode] = useState<ClockMode | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const selectedTime = parseTimeParts(value || options[0]);
  const [editingField, setEditingField] = useState<ClockMode | null>(null);
  const [hourInput, setHourInput] = useState(() =>
    selectedTime.hour.toString().padStart(2, "0"),
  );
  const [minuteInput, setMinuteInput] = useState(() =>
    selectedTime.minute.toString().padStart(2, "0"),
  );
  const quickTimes = useMemo(() => {
    const preferred = ["09:00 AM", "11:00 AM", "12:00 PM", "06:00 PM"];
    const available = preferred.filter((time) => options.includes(time));
    return available.length ? available : options.slice(0, 4);
  }, [options]);

  const commit = (hour: number, minute: number, period: Period) => {
    onChange(formatTimeParts(hour, minute, period));
  };

  useEffect(() => {
    if (editingField !== "hour") {
      setHourInput(selectedTime.hour.toString().padStart(2, "0"));
    }
    if (editingField !== "minute") {
      setMinuteInput(selectedTime.minute.toString().padStart(2, "0"));
    }
  }, [editingField, selectedTime.hour, selectedTime.minute]);

  const closePicker = () => {
    setOpen(false);
    setMode("hour");
    setDraggingMode(null);
    setEditingField(null);
  };

  const updateHourInput = (nextValue: string) => {
    const sanitizedValue = nextValue.replace(/\D/g, "").slice(0, 2);
    const nextHour = parseEditableNumber(sanitizedValue);
    setHourInput(
      Number.isNaN(nextHour)
        ? sanitizedValue
        : clampHour(nextHour).toString().padStart(2, "0"),
    );
    if (Number.isNaN(nextHour)) {
      return;
    }
    commit(clampHour(nextHour), selectedTime.minute, selectedTime.period);
  };

  const updateMinuteInput = (nextValue: string) => {
    const sanitizedValue = nextValue.replace(/\D/g, "").slice(0, 2);
    if (sanitizedValue === "") {
      setMinuteInput("");
      return;
    }

    const nextMinute = parseEditableNumber(sanitizedValue);
    if (Number.isNaN(nextMinute)) {
      setMinuteInput(sanitizedValue);
      return;
    }

    if (nextMinute > 59) {
      return;
    }

    setMinuteInput(sanitizedValue);
    commit(selectedTime.hour, nextMinute, selectedTime.period);
  };

  const updateFromPointer = (
    clientX: number,
    clientY: number,
    activeMode: ClockMode,
  ) => {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const angle = getAngleFromPointer(clientX, clientY, rect);
    if (activeMode === "hour") {
      commit(angleToHour(angle), selectedTime.minute, selectedTime.period);
      return;
    }

    commit(selectedTime.hour, angleToMinute(angle), selectedTime.period);
  };

  const handleDialPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingMode(mode);
    updateFromPointer(event.clientX, event.clientY, mode);
  };

  const handleDialPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingMode) {
      return;
    }

    event.preventDefault();
    updateFromPointer(event.clientX, event.clientY, draggingMode);
  };

  const handleDialPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (draggingMode === "hour") {
      setMode("minute");
    }
    setDraggingMode(null);
  };

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setMode("hour");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={value ? `Selected time ${value}` : placeholder}
          className={cn(
            "h-10 justify-between rounded-[8px] px-3 text-sm font-semibold shadow-none",
            widthClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Clock className="size-4 shrink-0 text-secondary" />
            <span
              className={cn(
                "truncate",
                value ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {value || placeholder}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="max-w-[320px] gap-0 rounded-xl border border-slate-200 bg-white p-0"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <DialogTitle className="text-sm font-extrabold text-foreground">
              Select time
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
              Choose an hour and minute
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Close time picker"
              className="size-8 shadow-none"
              onClick={closePicker}
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
        </div>

        <div className="p-3">
          <div className="mb-2.5 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-end gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Edit hour"
                    value={
                      editingField === "hour"
                        ? hourInput
                        : selectedTime.hour.toString().padStart(2, "0")
                    }
                    maxLength={2}
                    aria-pressed={mode === "hour"}
                    className={cn(
                      "h-9 w-10 rounded-md border-0 bg-transparent px-1 text-center text-[22px] font-extrabold leading-none text-foreground outline-none transition-colors focus:bg-blue-50 focus:text-blue-700 focus:ring-2 focus:ring-ring/20",
                      mode === "hour" && "bg-blue-50 text-blue-700",
                    )}
                    onChange={(event) => updateHourInput(event.target.value)}
                    onFocus={(event) => {
                      setMode("hour");
                      setEditingField("hour");
                      setHourInput(
                        selectedTime.hour.toString().padStart(2, "0"),
                      );
                      event.currentTarget.select();
                    }}
                    onBlur={() => {
                      setEditingField(null);
                      setHourInput(
                        selectedTime.hour.toString().padStart(2, "0"),
                      );
                    }}
                  />
                  <span className="pb-1 text-[20px] font-extrabold text-slate-400">
                    :
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Edit minutes"
                    value={
                      editingField === "minute"
                        ? minuteInput
                        : selectedTime.minute.toString().padStart(2, "0")
                    }
                    maxLength={2}
                    aria-pressed={mode === "minute"}
                    className={cn(
                      "h-9 w-10 rounded-md border-0 bg-transparent px-1 text-center text-[22px] font-extrabold leading-none text-foreground outline-none transition-colors focus:bg-blue-50 focus:text-blue-700 focus:ring-2 focus:ring-ring/20",
                      mode === "minute" && "bg-blue-50 text-blue-700",
                    )}
                    onChange={(event) => updateMinuteInput(event.target.value)}
                    onFocus={(event) => {
                      setMode("minute");
                      setEditingField("minute");
                      setMinuteInput(
                        selectedTime.minute.toString().padStart(2, "0"),
                      );
                      event.currentTarget.select();
                    }}
                    onBlur={() => {
                      setEditingField(null);
                      setMinuteInput(
                        selectedTime.minute.toString().padStart(2, "0"),
                      );
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground">
                  {mode === "hour"
                    ? "Tap to choose hour"
                    : "Tap to choose minutes"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1">
                {(["AM", "PM"] as const).map((period) => (
                  <Button
                    key={period}
                    type="button"
                    variant="ghost"
                    aria-pressed={selectedTime.period === period}
                    className={cn(
                      "h-7 min-w-9 rounded-md px-2 text-[11px] font-extrabold",
                      selectedTime.period === period
                        ? "bg-secondary text-white hover:bg-secondary/90 hover:text-white"
                        : "text-muted-foreground",
                    )}
                    onClick={() =>
                      commit(selectedTime.hour, selectedTime.minute, period)
                    }
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-2.5 grid grid-cols-2 gap-2">
            {(["hour", "minute"] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                variant="outline"
                aria-pressed={mode === tab}
                className={cn(
                  "h-8 rounded-lg text-[11px] shadow-none",
                  mode === tab &&
                    "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
                )}
                onClick={() => setMode(tab)}
              >
                {tab === "hour" ? "Hour" : "Minute"}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
            <div
              ref={dialRef}
              className="relative mx-auto h-[192px] w-[192px] touch-none select-none rounded-full border border-slate-200 bg-white"
              onPointerDown={handleDialPointerDown}
              onPointerMove={handleDialPointerMove}
              onPointerUp={handleDialPointerEnd}
              onPointerCancel={handleDialPointerEnd}
            >
              <div className="absolute inset-[16px] rounded-full border border-dashed border-slate-200" />
              <div className="absolute inset-[34px] rounded-full border border-slate-100" />

              {minuteLabelOptions.map((minute) => {
                const active =
                  mode === "minute" && selectedTime.minute === minute;
                return (
                  <Button
                    key={`minute-${minute}`}
                    type="button"
                    variant="ghost"
                    aria-label={`Select ${minute
                      .toString()
                      .padStart(2, "0")} minutes`}
                    className={cn(
                      "absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 text-[9.5px] font-extrabold",
                      mode === "minute"
                        ? active
                          ? "bg-primary text-white hover:bg-primary-hover hover:text-white"
                          : "text-muted-foreground hover:bg-slate-100"
                        : "pointer-events-none opacity-0",
                    )}
                    style={getDialPosition(
                      getMinuteAngle(minute),
                      MINUTE_MARKER_RADIUS,
                    )}
                    onClick={() =>
                      commit(selectedTime.hour, minute, selectedTime.period)
                    }
                  >
                    {minute.toString().padStart(2, "0")}
                  </Button>
                );
              })}

              {hourLabelOptions.map((hour) => {
                const active = mode === "hour" && selectedTime.hour === hour;
                return (
                  <Button
                    key={`hour-${hour}`}
                    type="button"
                    variant="ghost"
                    aria-label={`Select hour ${hour}`}
                    className={cn(
                      "absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 text-xs font-extrabold",
                      mode === "hour"
                        ? active
                          ? "bg-secondary text-white hover:bg-secondary/90 hover:text-white"
                          : "text-foreground hover:bg-slate-100"
                        : "pointer-events-none opacity-0",
                    )}
                    style={getDialPosition(hour * 30, HOUR_MARKER_RADIUS)}
                    onClick={() => {
                      commit(hour, selectedTime.minute, selectedTime.period);
                      setMode("minute");
                    }}
                  >
                    {hour}
                  </Button>
                );
              })}

              <div
                className={cn(
                  "absolute left-1/2 top-1/2 w-[4px] origin-bottom cursor-grab rounded-full bg-secondary active:cursor-grabbing",
                  draggingMode ? "" : "transition-transform duration-200",
                )}
                style={{
                  height: "50px",
                  transform: `translateX(-50%) translateY(-100%) rotate(${getHourAngle(
                    selectedTime.hour,
                    selectedTime.minute,
                  )}deg)`,
                }}
              />
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 w-[3px] origin-bottom cursor-grab rounded-full bg-primary active:cursor-grabbing",
                  draggingMode ? "" : "transition-transform duration-200",
                )}
                style={{
                  height: "68px",
                  transform: `translateX(-50%) translateY(-100%) rotate(${getMinuteAngle(
                    selectedTime.minute,
                  )}deg)`,
                }}
              />
              <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-primary" />
            </div>
          </div>

          <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-muted-foreground">
            Selected time{" "}
            <span className="float-right text-foreground">{value}</span>
          </div>

          <div className="mt-2.5">
            <p className="mb-2 text-[10.5px] font-semibold text-muted-foreground">
              Quick times
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickTimes.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-7 rounded-md px-2 text-[10.5px] font-semibold shadow-none",
                    value === time &&
                      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
                  )}
                  onClick={() => {
                    onChange(time);
                    closePicker();
                  }}
                >
                  <Clock className="size-3.5" />
                  {time}
                  {value === time ? <Check className="size-3.5" /> : null}
                </Button>
              ))}
              {allowClear && value ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 rounded-md px-2 text-[10.5px] font-semibold text-muted-foreground"
                  onClick={() => onChange("")}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-md px-3 text-[11px] shadow-none"
                onClick={closePicker}
              >
                Done
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
