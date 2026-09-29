import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "ui";
import { cn } from "ui";
import { api } from "../../../common/api";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrKeys } from "../useHrWorkspace";
import {
  Calculator,
  Pin,
  Calendar,
  CalendarRange,
  Info,
  Loader2,
} from "lucide-react";

interface PayrollSettings {
  workingDays: number[];
  divisorType: "FIXED" | "ACTUAL_DAYS" | "WORKING_DAYS";
  fixedDivisor: number;
}

interface PayrollSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollSettingsModal: React.FC<PayrollSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PayrollSettings>({
    workingDays: [1, 2, 3, 4, 5, 6],
    divisorType: "FIXED",
    fixedDivisor: 30,
  });

  const { data, isLoading } = useQuery<PayrollSettings>({
    queryKey: hrKeys.settings,
    queryFn: async () => (await api.get<PayrollSettings>("/payroll/settings")).data,
    enabled: isOpen,
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (updatedSettings: PayrollSettings) => {
      await api.patch("/payroll/settings", updatedSettings);
    },
    onSuccess: () => {
      toast.success("Payroll configuration updated.");
      queryClient.invalidateQueries({ queryKey: ["hr"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Failed to save payroll settings:", error);
      toast.error(error.response?.data?.message ?? "Failed to update configuration.");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[860px] p-0 border-none bg-transparent shadow-none !rounded-none">
        <div className="flex max-h-[95vh] overflow-y-auto !rounded-md flex-col border border-[#780037]/20 bg-white p-0">
          <div className="shrink-0 border-b border-[#780037]/10 bg-[#FCF6F6] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-white text-slate-600 shadow-sm">
                <Calculator className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mt-1 font-headline text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Payroll Configuration
                </h2>
                <p className="mt-2 max-w-[620px] text-sm font-medium leading-relaxed text-on-surface-variant">
                  Configure salary calculation logic. Working days now come from each employee's assigned shift.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-surface-container-lowest">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-primary/60 font-bold animate-pulse">Syncing system settings...</p>
              </div>
            ) : (
              <>
                {/* Calculation Logic */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-headline font-bold text-slate-800">Salary Divisor Logic</h3>
                    <span className="px-3 py-1 rounded-full bg-tertiary/5 text-tertiary text-xs font-black uppercase tracking-widest border border-tertiary/10">
                      Math Engine
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        id: "FIXED",
                        title: "Fixed Divisor",
                        desc: "Standard 30-day logic (e.g. 30k = 1k/day)",
                        icon: Pin,
                      },
                      {
                        id: "ACTUAL_DAYS",
                        title: "Calendar Days",
                        desc: "Divisor changes by month (28-31 days)",
                        icon: Calendar,
                      },
                      {
                        id: "WORKING_DAYS",
                        title: "Working Days",
                        desc: "Divisor = employee shift working days minus public holidays",
                        icon: CalendarRange,
                      },
                    ].map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSettings((s) => ({ ...s, divisorType: type.id as any }))}
                          className={cn(
                            "text-left p-4 rounded-md border-2 transition-all space-y-2 group",
                            settings.divisorType === type.id
                              ? "bg-white border-primary shadow-ambient scale-[1.02]"
                              : "bg-white/70 border-primary/5 hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <IconComponent className={cn("size-5", settings.divisorType === type.id ? "text-primary" : "text-primary/30")} />
                            {settings.divisorType === type.id && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className={cn("font-bold text-sm", settings.divisorType === type.id ? "text-slate-800" : "text-slate-500")}>{type.title}</p>
                          <p className="text-[11px] font-medium text-on-surface-variant opacity-60 leading-tight">{type.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {settings.divisorType === "FIXED" && (
                    <div className="mt-4 p-4 rounded-md bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Fixed Days per Month</p>
                        <p className="text-[11px] font-medium text-slate-500 italic">Used as the constant denominator for daily rate</p>
                      </div>
                      <input
                        type="number"
                        value={settings.fixedDivisor}
                        onChange={(e) => setSettings((s) => ({ ...s, fixedDivisor: parseInt(e.target.value) || 30 }))}
                        className="w-16 h-10 text-center rounded-lg border-2 border-primary/20 bg-white font-bold text-slate-800 outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Summary Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex gap-4">
                  <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    <strong>Calculation Formula:</strong> Net Salary = (Base Salary / {
                      settings.divisorType === "FIXED" ? settings.fixedDivisor : settings.divisorType === "ACTUAL_DAYS" ? "Month Days" : "Working Days"
                    }) x Payable Days. For Working Days, each employee's assigned shift defines the weekly calendar; public holidays still override it.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="px-8 py-3 bg-primary text-white text-sm font-bold rounded-md transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Updating..." : "Save Configuration"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
