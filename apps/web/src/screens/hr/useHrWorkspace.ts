import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

import { api } from "../../common/api";

type PunchInPayload = {
  checkInImageUrl: string;
  checkInLocationAddress?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  note?: string;
};

type PunchOutPayload = {
  checkOutImageUrl: string;
};

const hrKeys = {
  employees: ["hr", "employees"] as const,
  attendance: ["hr", "attendance"] as const,
  attendanceToday: ["hr", "attendance", "today"] as const,
  holidays: ["hr", "holidays"] as const,
  leaves: ["hr", "leaves"] as const,
  payroll: ["hr", "payroll"] as const,
  payslips: ["hr", "payslips"] as const,
  settings: ["hr", "payroll", "settings"] as const,
  shifts: ["hr", "shifts"] as const,
};

export function useHrQuery<T>(
  key: readonly unknown[],
  url: string,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean },
): UseQueryResult<T, any> {
  return useQuery({
    queryKey: [...key, params],
    queryFn: async () => (await api.get<T>(url, { params })).data,
    enabled: options?.enabled,
  });
}

export function useHrMutations(): {
  createEmployee: UseMutationResult<any, any, Record<string, unknown>, any>;
  updateEmployee: UseMutationResult<any, any, { id: string; data: Record<string, unknown> }, any>;
  deleteEmployee: UseMutationResult<any, any, string, any>;
  correctAttendance: UseMutationResult<any, any, { id: string; data: Record<string, unknown> }, any>;
  punchIn: UseMutationResult<any, any, PunchInPayload, any>;
  punchOut: UseMutationResult<any, any, PunchOutPayload, any>;
  createHoliday: UseMutationResult<any, any, Record<string, unknown>, any>;
  updateHoliday: UseMutationResult<any, any, { id: string; data: Record<string, unknown> }, any>;
  deleteHoliday: UseMutationResult<any, any, string, any>;
  createLeave: UseMutationResult<any, any, Record<string, unknown>, any>;
  decideLeave: UseMutationResult<any, any, { id: string; data: Record<string, unknown> }, any>;
  cancelLeave: UseMutationResult<any, any, string, any>;
  createShift: UseMutationResult<any, any, Record<string, unknown>, any>;
  updateShift: UseMutationResult<any, any, { id: string; data: Record<string, unknown> }, any>;
  runPayroll: UseMutationResult<any, any, Record<string, unknown>, any>;
  updatePayrollDraft: UseMutationResult<any, any, { id: string; data?: Record<string, unknown> }, any>;
  finalizePayroll: UseMutationResult<any, any, { id: string; data?: Record<string, unknown> }, any>;
  payPayroll: UseMutationResult<any, any, string, any>;
} {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["hr"] });

  const patchEmployeeCaches = (employee: any) => {
    if (!employee?.id) return;

    queryClient.setQueriesData(
      { queryKey: hrKeys.employees },
      (existing: any) => {
        if (!existing?.data || !Array.isArray(existing.data)) return existing;
        return {
          ...existing,
          data: existing.data.map((row: any) =>
            row?.id === employee.id ? { ...row, ...employee } : row,
          ),
        };
      },
    );

    queryClient.setQueriesData(
      { queryKey: ["hr", "employee", employee.id] },
      (existing: any) => {
        if (!existing) return employee;
        return { ...existing, ...employee };
      },
    );
  };

  return {
    createEmployee: useMutation({
      mutationFn: async (data: Record<string, unknown>) =>
        (await api.post("/employees", data)).data,
      onSuccess: (result) => {
        patchEmployeeCaches(result?.employee);
        invalidate();
      },
    }),
    updateEmployee: useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: Record<string, unknown>;
      }) => (await api.patch(`/employees/${id}`, data)).data,
      onSuccess: (employee) => {
        patchEmployeeCaches(employee);
        invalidate();
      },
    }),
    deleteEmployee: useMutation({
      mutationFn: async (id: string) => (await api.delete(`/employees/${id}`)).data,
      onSuccess: invalidate,
    }),
    correctAttendance: useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/attendance/${id}/correct`, data), onSuccess: invalidate }),
    punchIn: useMutation({ mutationFn: (data: PunchInPayload) => api.post("/attendance/punch-in", data), onSuccess: invalidate }),
    punchOut: useMutation({ mutationFn: (data: PunchOutPayload) => api.post("/attendance/punch-out", data), onSuccess: invalidate }),
    createHoliday: useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/holidays", data), onSuccess: invalidate }),
    updateHoliday: useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/holidays/${id}`, data), onSuccess: invalidate }),
    deleteHoliday: useMutation({ mutationFn: (id: string) => api.delete(`/holidays/${id}`), onSuccess: invalidate }),
    createLeave: useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/leaves", data), onSuccess: invalidate }),
    decideLeave: useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/leaves/${id}/decision`, data), onSuccess: invalidate }),
    cancelLeave: useMutation({ mutationFn: (id: string) => api.patch(`/leaves/${id}/cancel`), onSuccess: invalidate }),
    createShift: useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/shifts", data), onSuccess: invalidate }),
    updateShift: useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/shifts/${id}`, data), onSuccess: invalidate }),
    runPayroll: useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/payroll/run", data), onSuccess: invalidate }),
    updatePayrollDraft: useMutation({ mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) => api.patch(`/payroll/${id}/draft`, data), onSuccess: invalidate }),
    finalizePayroll: useMutation({ mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) => api.patch(`/payroll/${id}/finalize`, data), onSuccess: invalidate }),
    payPayroll: useMutation({ mutationFn: (id: string) => api.patch(`/payroll/${id}/pay`), onSuccess: invalidate }),
  };
}

export { hrKeys };
