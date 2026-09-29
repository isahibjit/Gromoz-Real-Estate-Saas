import { Calendar } from "lucide-react";
import { Input, cn } from "ui";

interface FollowUpDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const parseToIsoDate = (value: string) => {
  if (!value.trim()) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dayPart, monthPart, yearPart] = value.split("-");
    return `${yearPart}-${monthPart}-${dayPart}`;
  }

  const [dayPart, monthPart, yearPart] = value.split(" ");
  const monthIndex = monthNames.findIndex(
    (item) => item.toLowerCase() === monthPart?.slice(0, 3).toLowerCase(),
  );

  if (!yearPart || monthIndex < 0 || !dayPart) {
    return "";
  }

  return `${yearPart}-${String(monthIndex + 1).padStart(2, "0")}-${dayPart.padStart(2, "0")}`;
};

const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) {
    return "";
  }

  const [yearPart, monthPart, dayPart] = isoDate.split("-");
  const monthIndex = Number(monthPart) - 1;

  if (!yearPart || Number.isNaN(monthIndex) || !dayPart) {
    return isoDate;
  }

  return `${dayPart} ${monthNames[monthIndex] ?? monthPart} ${yearPart}`;
};

export function FollowUpDatePicker({
  value,
  onChange,
  ariaLabel = "Date picker",
  placeholder,
  className,
}: FollowUpDatePickerProps) {
  const normalizedValue = parseToIsoDate(value);

  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
      <Input
        type="date"
        value={normalizedValue}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn("pl-10", className)}
        onChange={(event) => onChange(formatDisplayDate(event.target.value))}
      />
    </div>
  );
}
