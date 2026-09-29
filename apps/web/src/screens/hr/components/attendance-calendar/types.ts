export type AttendanceStatus = "present" | "absent" | "holiday" | "leave" | "late" | "unmarked";

export type AttendanceCalendarDay = {
  id?: string;
  date: string;
  dayLabel: string;
  dayNum: number;
  isCurrentMonth: boolean;
  status: AttendanceStatus | string;
  source: string | null;
  loggedInAt: string | null;
  checkInImageUrl?: string | null;
  checkInImageCapturedAt?: string | null;
  checkOutImageUrl?: string | null;
  checkOutImageCapturedAt?: string | null;
  checkInLocationAddress?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutAt?: string | null;
  workHours?: string | null;
  lateMinutes?: number | null;
  derivedStatusReason?: string | null;
  shift?: {
    id: string;
    name: string;
    startTimeMinutes: number;
    endTimeMinutes: number;
  } | null;
  notes?: string | null;
  leaveDetails?: {
    id: string;
    type: string;
    reason?: string | null;
    isHalfDay: boolean;
    approvedAt?: string | null;
    approvedBy?: {
      id: string;
      name: string;
    } | null;
  } | null;
  holidayDetails?: {
    id: string;
    name: string;
    type: string;
    description?: string | null;
    isHalfDay: boolean;
  } | null;
};

export type SelectOption = {
  value: string;
  label: string;
};
