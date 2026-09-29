import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";

import { api } from "../../../../common/api";
import type { AddLeadFormData } from "./addLeadTypes";

const moneyMultiplier = (unit: string) => {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "cr" || normalized === "crore") return 10000000;
  if (normalized === "l" || normalized === "lac" || normalized === "lakh")
    return 100000;
  if (normalized === "k" || normalized === "thousand") return 1000;
  return 1;
};

const parseBudgetValue = (value: string) => {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lac|thousand|k|l)?/i);
  if (!match) return undefined;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric * moneyMultiplier(match[2] ?? "");
};

const parseBudgetRange = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return {};
  const hasPlus = normalized.includes("+");
  const parts = normalized.split("-").map((part) => part.trim());
  const minValue = parseBudgetValue(parts[0] ?? "");
  const maxValue = hasPlus ? undefined : parseBudgetValue(parts[1] ?? "");
  return {
    minBudget: minValue ? String(minValue) : undefined,
    maxBudget: maxValue ? String(maxValue) : undefined,
  };
};

const parseAreaValue = (value: string) => {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) ? String(numeric) : undefined;
};

const parseAreaRange = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return {};
  const hasPlus = normalized.includes("+");
  const parts = normalized.split("-").map((part) => part.trim());
  return {
    minArea: parseAreaValue(parts[0] ?? ""),
    maxArea: hasPlus ? undefined : parseAreaValue(parts[1] ?? ""),
  };
};

export const buildLeadPayload = (formData: AddLeadFormData) => {
  const budgetRange = parseBudgetRange(formData.budgetRange);
  const areaRange = parseAreaRange(formData.carpetAreaRange);

  return {
    leadName: formData.leadName,
    mobileNumber: formData.mobileNumber,
    mobileCountryCode: formData.mobileCountryCode,
    alternateNumber: formData.alternateNumber || undefined,
    alternateCountryCode: formData.alternateCountryCode,
    emailAddress: formData.emailAddress || undefined,
    gender: formData.gender || undefined,
    propertyType: formData.propertyType,
    configuration: formData.configuration || undefined,
    budgetRange: formData.budgetRange || undefined,
    minBudget: budgetRange.minBudget,
    maxBudget: budgetRange.maxBudget,
    minBudgetUnit: undefined,
    maxBudgetUnit: undefined,
    preferredLocation: formData.preferredLocation,
    preferredProject: formData.preferredProject || undefined,
    possessionTimeline: formData.possessionTimeline || undefined,
    carpetAreaRange: formData.carpetAreaRange || undefined,
    purpose: formData.purpose || undefined,
    minArea: areaRange.minArea,
    maxArea: areaRange.maxArea,
    zone: formData.zone || undefined,
    leadSource: formData.leadSource,
    campaign: formData.campaign || undefined,
    leadStage: formData.leadStage || undefined,
    leadStatus: formData.leadStatus,
    priority: formData.priority || undefined,
    interestLevel: formData.interestLevel || undefined,
    heardAboutUs: formData.heardAboutUs || undefined,
    remarks: formData.remarks || undefined,
    managerId: formData.managerId || undefined,
    telecallerId: formData.telecallerId || undefined,
    fieldExecutiveId: formData.fieldExecutiveId || undefined,
    referenceBy: formData.referenceBy || undefined,
    assignDate: formData.assignDate || undefined,
    followUpDate: formData.autoAssignFollowUp ? formData.followUpDate : undefined,
    followUpTime: formData.autoAssignFollowUp ? formData.followUpTime : undefined,
  };
};

export function useCreateLead(): UseMutationResult<any, Error, AddLeadFormData, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: AddLeadFormData) => {
      const { data } = await api.post("/leads", buildLeadPayload(formData));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
