import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Gift,
  CalendarDays,
  Clock,
  List,
  Trash2,
  Pencil,
  CheckCircle2,
  CalendarRange,
  CalendarX,
  Calendar,
} from 'lucide-react';
import { api } from '../../../common/api';
import toast from 'react-hot-toast';
import { HrStatCard } from '../components/HrStatCard';
import {
  Button,
  Card,
  Input,
  SearchableSelect,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from 'ui';
import { CalendarGrid } from '../components/attendance-calendar/CalendarGrid';
import { AttendanceCalendarDay } from '../components/attendance-calendar/types';
import { useAppSelector } from '../../../store';
import { WorkspacePage } from '../../../components/layout/PageHeader';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'MANDATORY' | 'OPTIONAL';
  isHalfDay: boolean;
  description?: string;
}

type HolidayApiRecord = {
  id: string;
  name: string;
  holidayDate: string;
  type?: string | null;
  description?: string | null;
};

type HolidayFormData = {
  id?: string;
  name: string;
  date: string;
  dates: string[];
  dateMode: 'single' | 'multiple';
  type: 'MANDATORY' | 'OPTIONAL';
  isHalfDay: boolean;
  description: string;
};

type DataTableColumn<T> = {
  id: string;
  header: string;
  align?: 'left' | 'right';
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => React.ReactNode;
};

const toInputDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value: Date | string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', options).format(value instanceof Date ? value : new Date(value));

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
};
const endOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + (6 - next.getDay()));
  return next;
};
const eachDayOfInterval = ({ start, end }: { start: Date; end: Date }) => {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};
const isSameDay = (left: Date, right: Date) => toInputDate(left) === toInputDate(right);
const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const subMonths = (date: Date, amount: number) => addMonths(date, -amount);

function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  emptyState,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
}) {
  if (!data.length) {
    return <div className="overflow-hidden rounded-md border border-slate-200 bg-white">{emptyState}</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  "h-12 border-b border-slate-200 text-[12px] font-extrabold text-slate-500",
                  column.headerClassName,
                  column.align === 'right' && 'text-right',
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick ? 'cursor-pointer' : undefined,
                'border-b border-slate-100 hover:bg-slate-50/70',
              )}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  className={cn(
                    "px-6 py-4 align-middle text-[13px]",
                    column.cellClassName,
                    column.align === 'right' && 'text-right',
                  )}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const HolidaysPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    user?.role ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [holidayPendingDelete, setHolidayPendingDelete] = useState<Holiday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pickerDate, setPickerDate] = useState<string>(toInputDate(new Date()));

const createDefaultHolidayFormData = (d: Date = new Date()): HolidayFormData => {
  const formatted = toInputDate(d);
  return {
    name: '',
    date: formatted,
    dates: [formatted],
    dateMode: 'single',
    type: 'MANDATORY',
    isHalfDay: false,
    description: '',
  };
};

  const [formData, setFormData] = useState<HolidayFormData>(createDefaultHolidayFormData());

  const normalizeHoliday = (holiday: HolidayApiRecord): Holiday => ({
    id: holiday.id,
    name: holiday.name,
    date: holiday.holidayDate,
    type: holiday.type === 'OPTIONAL' ? 'OPTIONAL' : 'MANDATORY',
    isHalfDay: false,
    description: holiday.description ?? '',
  });

  const fetchHolidays = async (year = selectedYear) => {
    setLoading(true);
    try {
      const response = await api.get<{ data: HolidayApiRecord[] }>(`/holidays?year=${year}`);
      setHolidays((response.data.data ?? []).map(normalizeHoliday));
    } catch (err) {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [holidays, searchQuery]);

  const stats = useMemo(() => ({
    total: holidays.length,
    mandatory: holidays.filter(h => h.type === 'MANDATORY').length,
    optional: holidays.filter(h => h.type === 'OPTIONAL').length,
    halfDay: holidays.filter(h => h.isHalfDay).length
  }), [holidays]);

  const handleEdit = (holiday: Holiday) => {
    if (!isAdmin) return;
    const formattedDate = toInputDate(holiday.date);
    setFormData({
      ...holiday,
      date: formattedDate,
      dates: [formattedDate],
      dateMode: 'single',
      description: holiday.description ?? ''
    });
    setPickerDate(formattedDate);
    setShowModal(true);
  };

  const handleDelete = (holiday: Holiday) => {
    if (!isAdmin) return;
    setHolidayPendingDelete(holiday);
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin || !holidayPendingDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/holidays/${holidayPendingDelete.id}`);
      toast.success('Holiday entry removed from the institutional registry.');
      setHolidayPendingDelete(null);
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to remove registry entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const addDateToMultiSelect = (dateStr: string) => {
    if (!dateStr) return;
    setFormData((current) => {
      if (current.dates.includes(dateStr)) return current;
      return { ...current, dates: [...current.dates, dateStr].sort() };
    });
  };

  const removeDateFromMultiSelect = (dateStr: string) => {
    setFormData((current) => ({
      ...current,
      dates: current.dates.filter((d) => d !== dateStr),
    }));
  };

  const addConsecutiveDays = (daysCount: number) => {
    const baseDate = formData.dates.length > 0
      ? new Date(formData.dates[formData.dates.length - 1])
      : new Date(formData.date);
    
    const newDates: string[] = [];
    for (let i = 1; i <= daysCount; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + i);
      newDates.push(toInputDate(nextDate));
    }

    setFormData((current) => ({
      ...current,
      dates: Array.from(new Set([...current.dates, ...newDates])).sort(),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsSaving(true);
    try {
      if (formData.id) {
        const payload = {
          name: formData.name,
          holidayDate: new Date(`${formData.date}T00:00:00`).toISOString(),
          type: formData.type,
          description: formData.description,
        };
        await api.patch(`/holidays/${formData.id}`, payload);
        toast.success('Holiday updated successfully');
      } else {
        const selectedDates =
          formData.dateMode === 'multiple' && formData.dates.length > 0
            ? Array.from(new Set(formData.dates))
            : [formData.date];

        await Promise.all(
          selectedDates.map((d) =>
            api.post('/holidays', {
              name: formData.name,
              holidayDate: new Date(`${d}T00:00:00`).toISOString(),
              type: formData.type,
              description: formData.description,
            })
          )
        );
        toast.success(
          selectedDates.length > 1
            ? `${selectedDates.length} holiday dates created successfully`
            : 'Holiday created successfully'
        );
      }
      setShowModal(false);
      const defaultDate = toInputDate(new Date());
      setFormData({
        name: '',
        date: defaultDate,
        dates: [defaultDate],
        dateMode: 'single',
        type: 'MANDATORY',
        isHalfDay: false,
        description: ''
      });
      setPickerDate(defaultDate);
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to save holiday');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: DataTableColumn<Holiday>[] = [
    {
      id: 'name',
      header: 'Holiday',
      cell: (h) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            h.type === 'MANDATORY'
              ? "border-rose-100 bg-rose-50 text-rose-600"
              : "border-amber-100 bg-amber-50 text-amber-600"
          )}>
            <Gift className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-secondary">{h.name}</p>
            <p className="mt-1 line-clamp-1 text-xs font-medium text-muted-foreground">
              {h.description || 'No description added'}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'date',
      header: 'Date',
      cell: (h) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-secondary">
            {formatDate(h.date, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {formatDate(h.date, { weekday: 'long' })}
          </span>
        </div>
      )
    },
    {
      id: 'type',
      header: 'Type',
      cell: (h) => (
        <span className={cn(
          "inline-flex rounded-md border px-2.5 py-1 text-[11px] font-extrabold",
          h.type === 'MANDATORY'
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        )}>
          {h.type === 'MANDATORY' ? 'Mandatory' : 'Optional'}
        </span>
      )
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: (h) => (
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full",
            h.isHalfDay ? "bg-amber-400" : "bg-primary/40"
          )} />
          <span className="text-xs font-semibold text-muted-foreground">
            {h.isHalfDay ? 'Half day' : 'Full day'}
          </span>
        </div>
      )
    },
    ...(isAdmin
      ? [{
          id: 'actions',
          header: 'Actions',
          align: 'right' as const,
          cell: (h: Holiday) => (
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(h)}
                className="h-9 w-9 rounded-lg text-slate-500 shadow-none hover:bg-slate-100 hover:text-secondary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(h)}
                className="h-9 w-9 rounded-lg text-rose-500 shadow-none hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        }]
      : [])
  ];

  // --- CALENDAR LOGIC ---
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedMonth));
    const end = endOfWeek(endOfMonth(selectedMonth));
    const days = eachDayOfInterval({ start, end });
    
    return days.map(date => {
      const dayHolidays = filteredHolidays.filter(h => isSameDay(new Date(h.date), date));
      const holiday = dayHolidays.length > 0 ? dayHolidays[0] : null;
      
      return {
        date: toInputDate(date),
        dayLabel: formatDate(date, { weekday: 'long' }),
        dayNum: date.getDate(),
        isCurrentMonth: isSameMonth(date, selectedMonth),
        status: holiday ? 'holiday' : 'unmarked',
        source: null,
        loggedInAt: null,
        holidayDetails: holiday ? {
          id: holiday.id,
          name: holiday.name,
          type: holiday.type,
          description: holiday.description,
          isHalfDay: holiday.isHalfDay
        } : null
      } as AttendanceCalendarDay;
    });
  }, [selectedMonth, filteredHolidays]);

  return (
        <WorkspacePage className="space-y-6 pb-20">
          {/* 🚀 HEADER SECTION */}
          <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-secondary">
                Holiday Management
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Configure the holiday calendar, review date-wise coverage, and keep payroll-aware closures aligned with the HR workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Toggle */}
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                <Button
                  type="button"
                  variant={viewMode === 'calendar' ? 'navy' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    "h-9 rounded-md px-4 text-xs shadow-none",
                    viewMode !== 'calendar' && "text-secondary"
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Calendar
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'list' ? 'navy' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "h-9 rounded-md px-4 text-xs shadow-none",
                    viewMode !== 'list' && "text-secondary"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  List view
                </Button>
              </div>

              {isAdmin ? (
                <Button
                  onClick={() => {
                    setFormData(createDefaultHolidayFormData());
                    setShowModal(true);
                  }}
                  className="h-11 rounded-md px-5 shadow-none"
                >
                  <Plus className="w-5 h-5" />
                  Add Holiday
                </Button>
              ) : null}
            </div>
          </section>

          {/* 📊 KPI SECTION */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HrStatCard
              title="Total Holidays"
              value={stats.total}
              subtitle="Configured holiday entries"
              icon={CalendarRange}
              tone="bg-blue-50 text-blue-600"
            />
            <HrStatCard
              title="Mandatory"
              value={stats.mandatory}
              subtitle="Company-wide closures"
              icon={CheckCircle2}
              tone="bg-rose-50 text-rose-600"
            />
            <HrStatCard
              title="Optional"
              value={stats.optional}
              subtitle="Floating holiday choices"
              icon={AlertCircle}
              tone="bg-amber-50 text-amber-600"
            />
            <HrStatCard
              title="Half-days"
              value={stats.halfDay}
              subtitle="Partial workday closures"
              icon={Clock}
              tone="bg-indigo-50 text-indigo-600"
            />
          </div>

          {/* 🔍 SEARCH & FILTERS */}
          <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search holidays by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-md border-slate-200 pl-11 pr-4 text-sm font-semibold shadow-none"
              />
            </div>

            {viewMode === 'calendar' && (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-1 shadow-none">
                <Button variant="outline" size="sm" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="h-8 w-8 rounded-md p-0 shadow-none">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="min-w-[140px] px-4 text-sm font-bold text-secondary text-center">
                  {formatDate(selectedMonth, { month: 'long', year: 'numeric' })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="h-8 w-8 rounded-md p-0 shadow-none">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-1 shadow-none">
              {[2025, 2026].map(year => (
                <Button
                  type="button"
                  variant={selectedYear === year ? 'navy' : 'ghost'}
                  size="sm"
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "h-8 rounded-md px-4 text-xs shadow-none",
                    selectedYear !== year && "text-secondary"
                  )}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
          </Card>

          {/* 🗓️ MAIN CONTENT AREA */}
          {viewMode === 'calendar' ? (
            <>

              <CalendarGrid
                days={calendarDays}
                selectedDate={selectedDate ? toInputDate(selectedDate) : null}
                onSelectDate={(day) => {
                  const [year, month, d] = day.date.split('-').map(Number);
                  const localDate = new Date(year, month - 1, d);
                  setSelectedDate(localDate);
                  if (isAdmin && day.status !== 'holiday') {
                    setFormData(createDefaultHolidayFormData(localDate));
                    setShowModal(true);
                  }
                }}
              />


              {/* 🔍 SELECTED DATE DETAIL PANEL */}
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {selectedDate ? (
                  <Card className="rounded-md border border-slate-200 bg-white p-6 shadow-none">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Calendar size={25} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-extrabold text-secondary">
                            {formatDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </h3>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {formatDate(selectedDate, { weekday: 'long' })}
                          </p>
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setFormData(createDefaultHolidayFormData(selectedDate));
                              setShowModal(true);
                            }}
                            className="h-11 rounded-md px-5 shadow-none"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Holiday
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-8">
                      {filteredHolidays.filter(h => isSameDay(new Date(h.date), selectedDate)).length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {filteredHolidays.filter(h => isSameDay(new Date(h.date), selectedDate)).map(h => (
                            <Card key={h.id} className="group relative rounded-md border border-slate-200 bg-white p-5 shadow-none transition-colors hover:border-blue-300">
                              <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                  <div className={cn(
                                    "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                                    h.type === 'MANDATORY' ? "bg-rose-100/70 text-rose-700" : "bg-amber-100/70 text-amber-700"
                                  )}>
                                    {h.type}
                                  </div>
                                  <h4 className="text-lg font-extrabold text-secondary">{h.name}</h4>
                                  <p className="max-w-md text-sm font-semibold leading-relaxed text-muted-foreground">
                                    {h.description || 'No additional archival notes provided for this institutional event.'}
                                  </p>
                                  <div className="flex items-center gap-3 pt-2">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                      <Clock className="w-3.5 h-3.5" />
                                      {h.isHalfDay ? 'Half-Day' : 'Full-Day Holiday'}
                                    </div>
                                  </div>
                                </div>

                                {isAdmin ? (
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleEdit(h)}
                                      className="h-9 w-9 rounded-md p-0 shadow-none"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleDelete(h)}
                                      className="h-9 w-9 rounded-md p-0 text-rose-600 shadow-none hover:border-rose-200 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 py-12">
                          <div className="mb-3 rounded-full bg-blue-50 p-4 text-blue-300">
                            <CalendarDays className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-semibold text-muted-foreground">No holiday entries for this date.</p>
                          {isAdmin ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setFormData(createDefaultHolidayFormData(selectedDate));
                                setShowModal(true);
                              }}
                              className="mt-4 h-9 rounded-md px-4 text-xs shadow-none text-blue-700"
                            >
                              Add Holiday
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className="rounded-[32px] border border-dashed border-primary/20 p-12 text-center">
                    <p className="text-primary/40 font-bold">Select a date to view institutional archival details.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <DataTable
              columns={columns}
              data={filteredHolidays}
              getRowKey={h => h.id}
              onRowClick={isAdmin ? (h) => handleEdit(h) : undefined}
              emptyState={
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400">
                    <CalendarX  size={25} />
                  </div>
                  <h3 className="text-lg font-extrabold text-secondary">No holidays found</h3>
                  <p className="mt-1 max-w-[280px] text-sm font-medium text-muted-foreground">
                    We couldn&apos;t find any holiday records matching the current search.
                  </p>
                </div>
              }
            />
          )}


          {/* 📋 ADD/EDIT MODAL */}
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent
              onPointerDownOutside={(e) => {
              }}
              className="flex max-h-[86vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 sm:max-w-[640px]"
            >
              <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      Holiday Registry
                    </p>
                    <DialogTitle className="mt-1 text-2xl font-extrabold tracking-tight text-secondary">
                      {formData.id ? 'Edit Holiday Registry' : 'Create New Holiday'}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">
                      {formData.id ? 'Modify holiday details and archival persistence.' : 'Set up a new organization-wide holiday event in the registry.'}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white p-6 sm:p-8">
                  <div className="space-y-2">
                    <label className="ml-1 text-[12px] font-extrabold text-secondary">Holiday Designation</label>
                    <Input
                      placeholder="e.g. Diwali Observance"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-11 rounded-md border-slate-200 bg-white text-sm font-semibold shadow-none"
                    />
                  </div>

                  {!formData.id ? (
                    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[12px] font-extrabold text-secondary">
                          Date Selection Mode
                        </label>
                        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                          <Button
                            type="button"
                            variant={formData.dateMode === 'single' ? 'navy' : 'ghost'}
                            size="sm"
                            onClick={() =>
                              setFormData((current) => ({
                                ...current,
                                dateMode: 'single',
                              }))
                            }
                            className={cn(
                              "h-7 rounded-md px-3 text-xs shadow-none",
                              formData.dateMode !== 'single' && "text-secondary"
                            )}
                          >
                            Single Date
                          </Button>
                          <Button
                            type="button"
                            variant={formData.dateMode === 'multiple' ? 'navy' : 'ghost'}
                            size="sm"
                            onClick={() =>
                              setFormData((current) => ({
                                ...current,
                                dateMode: 'multiple',
                              }))
                            }
                            className={cn(
                              "h-7 rounded-md px-3 text-xs shadow-none",
                              formData.dateMode !== 'multiple' && "text-secondary"
                            )}
                          >
                            Multiple Dates
                          </Button>
                        </div>
                      </div>

                      {formData.dateMode === 'multiple' ? (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={pickerDate}
                              onChange={(e) => setPickerDate(e.target.value)}
                              className="h-10 flex-1 rounded-md border-slate-200 bg-white text-sm font-semibold shadow-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                addDateToMultiSelect(pickerDate);
                              }}
                              className="h-10 rounded-md px-4 text-xs shadow-none"
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add Date
                            </Button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-muted-foreground">Shortcuts:</span>
                            {[1, 2, 3, 4].map((count) => (
                              <Button
                                key={count}
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addConsecutiveDays(count)}
                                className="h-7 rounded-md bg-white border border-slate-200 px-2.5 text-[11px] font-bold text-secondary shadow-none hover:bg-slate-100"
                              >
                                +{count} next {count === 1 ? 'day' : 'days'}
                              </Button>
                            ))}
                          </div>

                          {formData.dates.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Selected Dates ({formData.dates.length}):
                              </p>
                              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1">
                                {formData.dates.map((d) => (
                                  <span
                                    key={d}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"
                                  >
                                    {formatDate(d, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    <button
                                      type="button"
                                      onClick={() => removeDateFromMultiSelect(d)}
                                      className="rounded-full hover:bg-blue-100 p-0.5"
                                    >
                                      <CalendarX className="h-3 w-3 text-blue-700" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="ml-1 text-[12px] font-extrabold text-secondary">
                        {formData.dateMode === 'multiple' ? 'Primary Start Date' : 'Registry Date'}
                      </label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(event) => {
                          const val = event.target.value;
                          setFormData((current) => ({
                            ...current,
                            date: val,
                            dates: current.dateMode === 'single' ? [val] : current.dates,
                          }));
                          setPickerDate(val);
                        }}
                        required
                        className="h-11 rounded-md border-slate-200 bg-white text-sm font-semibold shadow-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 text-[12px] font-extrabold text-secondary">Categorization</label>
                      <SearchableSelect
                        value={formData.type}
                        onValueChange={(val) => setFormData({ ...formData, type: val as 'MANDATORY' | 'OPTIONAL' })}
                        options={[
                          { value: "MANDATORY", label: "Mandatory" },
                          { value: "OPTIONAL", label: "Optional" },
                        ]}
                        placeholder="Select type"
                        searchPlaceholder="Search type..."
                        noOptionsText="No type found"
                        className="h-11 rounded-md border-slate-200 bg-white text-sm font-bold shadow-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      id="isHalfDay"
                      checked={formData.isHalfDay}
                      onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300"
                    />
                    <label htmlFor="isHalfDay" className="cursor-pointer select-none text-sm font-semibold text-secondary">
                      This is a Half-Day Holiday
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-[12px] font-extrabold text-secondary">Description & Context</label>
                    <Textarea
                      placeholder="Additional archival notes for employees..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="min-h-[100px] resize-none rounded-md border-slate-200 bg-white text-sm font-semibold shadow-none"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:px-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="h-11 flex-1 rounded-md shadow-none"
                  >
                    Discard changes
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-11 flex-[2] rounded-md shadow-none"
                  >
                    {isSaving ? 'Saving...' : formData.id ? 'Authorize Updates' : 'Confirm Holiday'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* ⚠️ DELETE CONFIRMATION MODAL */}
          <Dialog open={!!holidayPendingDelete} onOpenChange={(open) => !isDeleting && !open && setHolidayPendingDelete(null)}>
            <DialogContent className="max-w-md rounded-md border border-slate-200 bg-white p-0 shadow-none">
              <div className="p-8">
                <DialogHeader className="space-y-3 text-left">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-headline text-[28px] font-bold text-primary">
                    Remove Holiday
                  </DialogTitle>
                  <DialogDescription className="text-[14px] leading-6 text-primary/65">
                    Are you sure you want to remove this holiday entry from the institutional registry? This action is permanent and may affect payroll calculations.
                  </DialogDescription>
                </DialogHeader>

                {holidayPendingDelete && (
                  <div className="mt-6 rounded-md border border-primary/10 bg-[#fffafa] px-5 py-4">
                    <p className="text-[11px] font-bold text-primary/40 uppercase tracking-wider">Holiday Designation</p>
                    <p className="mt-1 text-[15px] font-bold text-primary">{holidayPendingDelete.name}</p>
                    <p className="mt-1 text-[13px] font-medium text-primary/60">
                      {formatDate(holidayPendingDelete.date, { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}

                <div className="mt-8 flex flex-row justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setHolidayPendingDelete(null)}
                    disabled={isDeleting}
                    className="h-12 flex-1 rounded-md border-primary/10 font-bold text-primary hover:bg-primary/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="h-12 flex-1 rounded-md bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90 shadow-none"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete entry'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </WorkspacePage>
  );
};
