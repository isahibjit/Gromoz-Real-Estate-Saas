import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Home,
  IndianRupee,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "ui";

import type { SiteVisitProjectOption } from "../leads/site-visits/useSiteVisits";
import {
  bookingAmountUnitOptions,
  getFirstInventoryImage,
  normalizeBookingAmountInput,
  toBookingAmountRupees,
  toRupeeAmount,
  type BookingAmountUnit,
} from "./bookingUiUtils";
import {
  useBookingMutations,
  useProjectBrokerageRule,
  type BookingStatus,
} from "./useBookings";
import { useMasterOptions } from "../projects/useProjectMasters";

export interface CreateBookingDialogLead {
  id: string;
  name: string;
  mobile?: string;
}

export interface CreateBookingDialogDefaults {
  bookingId?: string;
  status?: BookingStatus;
  projectId?: string;
  unitId?: string;
  flatNo?: string;
  bookingAmount?: string;
  agreementValue?: string;
  agreementValueUnit?: BookingAmountUnit;
  bookingDate?: string;
  notes?: string;
  nextAction?: string;
  siteVisitId?: string;
  preferredProjectName?: string;
  preferredLocation?: string;
  preferredConfiguration?: string;
  preferredBudget?: string;
  preferredProjectImage?: string;
  baseBrokerageAmount?: string | number;
  ladderBrokerageAmount?: string | number;
  aopBrokerageAmount?: string | number;
}

interface CreateBookingDialogProps {
  open: boolean;
  lead: CreateBookingDialogLead;
  projects: SiteVisitProjectOption[];
  defaults?: CreateBookingDialogDefaults;
  masterConfigurationOptions?: string[];
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const todayInput = () => new Date().toISOString().slice(0, 10);
const dateInputValue = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 10) : todayInput();

const isUnavailableUnit = (unit?: SiteVisitProjectOption["units"][number]) =>
  Boolean(
    unit &&
      (unit.availability === "Booked" ||
        unit.availability === "Sold" ||
        unit.bookingStatus.toLowerCase() === "booked"),
  );

const inrCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: string | number) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? inrCurrencyFormatter.format(Math.round(numericValue))
    : "Not set";
};

const formatCalculatedCurrency = (value: number) => {
  const roundedValue = Math.round(Number.isFinite(value) ? value : 0);
  return inrCurrencyFormatter.format(
    Object.is(roundedValue, -0) ? 0 : roundedValue,
  );
};

const percentageAmount = (base: number, percentage: number) =>
  Math.round(((base * percentage) / 100) * 100) / 100;

type BrokerageCalculationMode = "PERCENTAGE" | "FIXED";
type BrokerageRuleNumberField =
  | "baseBrokeragePct"
  | "baseBrokerageFixedAmount"
  | "ladderBrokeragePct"
  | "ladderBrokerageFixedAmount"
  | "aopBrokeragePct"
  | "aopBrokerageFixedAmount"
  | "gstPct"
  | "tdsPct"
  | "passbackDefaultAmount"
  | "salesIncentivePct"
  | "salesIncentiveFixedAmount"
  | "preSalesIncentivePct"
  | "preSalesIncentiveFixedAmount"
  | "teamLeaderIncentivePct"
  | "teamLeaderIncentiveFixedAmount";
type BrokerageRuleModeField =
  | "baseBrokerageMode"
  | "ladderBrokerageMode"
  | "aopBrokerageMode"
  | "salesIncentiveMode"
  | "preSalesIncentiveMode"
  | "teamLeaderIncentiveMode";

type BrokerageRuleForm = Record<BrokerageRuleNumberField, string> &
  Record<BrokerageRuleModeField, BrokerageCalculationMode>;
type BrokerageRuleFormField = keyof BrokerageRuleForm;

const defaultBrokerageRuleForm: BrokerageRuleForm = {
  baseBrokeragePct: "",
  baseBrokerageMode: "FIXED",
  baseBrokerageFixedAmount: "",
  ladderBrokeragePct: "",
  ladderBrokerageMode: "FIXED",
  ladderBrokerageFixedAmount: "",
  aopBrokeragePct: "",
  aopBrokerageMode: "FIXED",
  aopBrokerageFixedAmount: "",
  gstPct: "",
  tdsPct: "",
  passbackDefaultAmount: "",
  salesIncentivePct: "",
  salesIncentiveMode: "FIXED",
  salesIncentiveFixedAmount: "",
  preSalesIncentivePct: "",
  preSalesIncentiveMode: "FIXED",
  preSalesIncentiveFixedAmount: "",
  teamLeaderIncentivePct: "",
  teamLeaderIncentiveMode: "FIXED",
  teamLeaderIncentiveFixedAmount: "",
};

const brokerageRuleSections: Array<{
  title: string;
  fields: Array<{
    label: string;
    field: BrokerageRuleNumberField;
    suffix?: string;
    step?: string;
    modeField?: BrokerageRuleModeField;
    fixedField?: BrokerageRuleNumberField;
  }>;
}> = [
  {
    title: "Brokerage revenue",
    fields: [
      {
        label: "Base brokerage",
        field: "baseBrokeragePct",
        suffix: "%",
        modeField: "baseBrokerageMode",
        fixedField: "baseBrokerageFixedAmount",
      },
      {
        label: "Ladder brokerage",
        field: "ladderBrokeragePct",
        suffix: "%",
        modeField: "ladderBrokerageMode",
        fixedField: "ladderBrokerageFixedAmount",
      },
      {
        label: "AOP brokerage",
        field: "aopBrokeragePct",
        suffix: "%",
        modeField: "aopBrokerageMode",
        fixedField: "aopBrokerageFixedAmount",
      },
    ],
  },
  {
    title: "Taxes and passback",
    fields: [
      { label: "GST", field: "gstPct", suffix: "%" },
      { label: "TDS", field: "tdsPct", suffix: "%" },
      {
        label: "Default passback",
        field: "passbackDefaultAmount",
        step: "1",
        suffix: "₹",
      },
    ],
  },
  {
    title: "Incentive split",
    fields: [
      {
        label: "Sales incentive",
        field: "salesIncentivePct",
        step: "1",
        suffix: "%",
        modeField: "salesIncentiveMode",
        fixedField: "salesIncentiveFixedAmount",
      },
      {
        label: "Pre-sales incentive",
        field: "preSalesIncentivePct",
        step: "1",
        suffix: "%",
        modeField: "preSalesIncentiveMode",
        fixedField: "preSalesIncentiveFixedAmount",
      },
      {
        label: "Team leader incentive",
        field: "teamLeaderIncentivePct",
        step: "1",
        suffix: "%",
        modeField: "teamLeaderIncentiveMode",
        fixedField: "teamLeaderIncentiveFixedAmount",
      },
    ],
  },
];

const toRuleInputValue = (value: unknown) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(numeric);
};

const toRuleNumberValue = (value: string) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};
const hasRuleInputValue = (value: string) => value.trim().length > 0;

const toBrokerageRuleForm = (
  rule?:
    | Partial<
        Record<BrokerageRuleNumberField, unknown> &
          Record<BrokerageRuleModeField, BrokerageCalculationMode>
      >
    | null,
): BrokerageRuleForm => ({
  baseBrokeragePct: toRuleInputValue(rule?.baseBrokeragePct),
  baseBrokerageMode: rule?.baseBrokerageMode ?? "PERCENTAGE",
  baseBrokerageFixedAmount: toRuleInputValue(rule?.baseBrokerageFixedAmount),
  ladderBrokeragePct: toRuleInputValue(rule?.ladderBrokeragePct),
  ladderBrokerageMode: rule?.ladderBrokerageMode ?? "PERCENTAGE",
  ladderBrokerageFixedAmount: toRuleInputValue(rule?.ladderBrokerageFixedAmount),
  aopBrokeragePct: toRuleInputValue(rule?.aopBrokeragePct),
  aopBrokerageMode: rule?.aopBrokerageMode ?? "PERCENTAGE",
  aopBrokerageFixedAmount: toRuleInputValue(rule?.aopBrokerageFixedAmount),
  gstPct: toRuleInputValue(rule?.gstPct),
  tdsPct: toRuleInputValue(rule?.tdsPct),
  passbackDefaultAmount: toRuleInputValue(rule?.passbackDefaultAmount),
  salesIncentivePct: toRuleInputValue(rule?.salesIncentivePct),
  salesIncentiveMode: rule?.salesIncentiveMode ?? "FIXED",
  salesIncentiveFixedAmount: toRuleInputValue(rule?.salesIncentiveFixedAmount),
  preSalesIncentivePct: toRuleInputValue(rule?.preSalesIncentivePct),
  preSalesIncentiveMode: rule?.preSalesIncentiveMode ?? "FIXED",
  preSalesIncentiveFixedAmount: toRuleInputValue(
    rule?.preSalesIncentiveFixedAmount,
  ),
  teamLeaderIncentivePct: toRuleInputValue(rule?.teamLeaderIncentivePct),
  teamLeaderIncentiveMode: rule?.teamLeaderIncentiveMode ?? "FIXED",
  teamLeaderIncentiveFixedAmount: toRuleInputValue(
    rule?.teamLeaderIncentiveFixedAmount,
  ),
});

const normalizeRuleFormValue = (
  value: BrokerageRuleForm[BrokerageRuleFormField],
) =>
  value === "FIXED" || value === "PERCENTAGE"
    ? value
    : toRuleNumberValue(value);

const isBrokerageRuleFormEqual = (
  left: BrokerageRuleForm,
  right: BrokerageRuleForm,
) =>
  (Object.keys(defaultBrokerageRuleForm) as BrokerageRuleFormField[]).every(
    (field) =>
      normalizeRuleFormValue(left[field]) ===
      normalizeRuleFormValue(right[field]),
  );

export function CreateBookingDialog({
  open,
  lead,
  projects,
  defaults,
  masterConfigurationOptions,
  onOpenChange,
  onCreated,
}: CreateBookingDialogProps) {
  const bookingMutations = useBookingMutations();
  const isEditing = Boolean(defaults?.bookingId);
  const defaultProjectId = useMemo(() => {
    if (defaults?.projectId) return defaults.projectId;
    const preferredProjectName = defaults?.preferredProjectName
      ?.trim()
      .toLowerCase();
    const preferredLocation = defaults?.preferredLocation?.trim().toLowerCase();
    if (!preferredProjectName && !preferredLocation) return "";
    return (
      projects.find((project) => {
        const projectName = project.name.trim().toLowerCase();
        const projectLocation = project.location.trim().toLowerCase();
        return (
          (preferredProjectName &&
            (projectName === preferredProjectName ||
              projectName.includes(preferredProjectName))) ||
          (preferredLocation && projectLocation.includes(preferredLocation))
        );
      })?.id ?? ""
    );
  }, [
    defaults?.preferredLocation,
    defaults?.preferredProjectName,
    defaults?.projectId,
    projects,
  ]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [unitId, setUnitId] = useState(defaults?.unitId ?? "");
  const [unitType, setUnitType] = useState(defaults?.preferredConfiguration ?? "");
  const [flatNo, setFlatNo] = useState(defaults?.flatNo ?? "");
  const [bookingAmount, setBookingAmount] = useState(
    defaults?.bookingAmount ?? "",
  );
  const [agreementValue, setAgreementValue] = useState(
    defaults?.agreementValue ?? "",
  );
  const [agreementValueUnit, setAgreementValueUnit] =
    useState<BookingAmountUnit>(defaults?.agreementValueUnit ?? "Lakh");
  const [bookingDate, setBookingDate] = useState(
    dateInputValue(defaults?.bookingDate),
  );
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [nextAction, setNextAction] = useState(
    defaults?.nextAction ?? "Collect reservation amount and documents",
  );
  const [brokerageRuleForm, setBrokerageRuleForm] = useState<BrokerageRuleForm>(
    defaultBrokerageRuleForm,
  );
  const [baseBrokerageOverride, setBaseBrokerageOverride] = useState(
    defaults?.baseBrokerageAmount !== undefined
      ? String(defaults.baseBrokerageAmount)
      : "",
  );
  const [baseBrokerageOverrideMode, setBaseBrokerageOverrideMode] =
    useState<BrokerageCalculationMode>("FIXED");
  const [ladderBrokerageOverride, setLadderBrokerageOverride] = useState(
    defaults?.ladderBrokerageAmount !== undefined
      ? String(defaults.ladderBrokerageAmount)
      : "",
  );
  const [ladderBrokerageOverrideMode, setLadderBrokerageOverrideMode] =
    useState<BrokerageCalculationMode>("FIXED");
  const [aopBrokerageOverride, setAopBrokerageOverride] = useState(
    defaults?.aopBrokerageAmount !== undefined
      ? String(defaults.aopBrokerageAmount)
      : "",
  );
  const [aopBrokerageOverrideMode, setAopBrokerageOverrideMode] =
    useState<BrokerageCalculationMode>("FIXED");

  useEffect(() => {
    if (!open) return;
    setProjectId(defaultProjectId);
    setUnitId(defaults?.unitId ?? "");
    setUnitType(defaults?.preferredConfiguration ?? "");
    setFlatNo(defaults?.flatNo ?? "");
    setBookingAmount(defaults?.bookingAmount ?? "");
    setAgreementValue(defaults?.agreementValue ?? "");
    setAgreementValueUnit(defaults?.agreementValueUnit ?? "Lakh");
    setBookingDate(dateInputValue(defaults?.bookingDate));
    setNotes(defaults?.notes ?? "");
    setNextAction(defaults?.nextAction ?? "Collect reservation amount and documents");
    setBaseBrokerageOverride(
      defaults?.baseBrokerageAmount !== undefined
        ? String(defaults.baseBrokerageAmount)
        : "",
    );
    setBaseBrokerageOverrideMode("FIXED");
    setLadderBrokerageOverride(
      defaults?.ladderBrokerageAmount !== undefined
        ? String(defaults.ladderBrokerageAmount)
        : "",
    );
    setLadderBrokerageOverrideMode("FIXED");
    setAopBrokerageOverride(
      defaults?.aopBrokerageAmount !== undefined
        ? String(defaults.aopBrokerageAmount)
        : "",
    );
    setAopBrokerageOverrideMode("FIXED");
  }, [
    defaults?.aopBrokerageAmount,
    defaultProjectId,
    defaults?.agreementValue,
    defaults?.agreementValueUnit,
    defaults?.baseBrokerageAmount,
    defaults?.bookingAmount,
    defaults?.bookingDate,
    defaults?.ladderBrokerageAmount,
    defaults?.notes,
    defaults?.nextAction,
    defaults?.flatNo,
    defaults?.unitId,
    open,
  ]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projectId, projects],
  );
  const configurationMasters = useMasterOptions(
    "project_configuration",
    (masterConfigurationOptions ?? []).map((value) => ({
      label: value,
      value,
    })),
  );
  const brokerageRuleQuery = useProjectBrokerageRule(
    open && projectId ? projectId : undefined,
  );
  const savedBrokerageRuleForm = useMemo(
    () => toBrokerageRuleForm(brokerageRuleQuery.data),
    [brokerageRuleQuery.data],
  );
  const isBrokerageRuleDirty = !isBrokerageRuleFormEqual(
    brokerageRuleForm,
    savedBrokerageRuleForm,
  );
  const updateBrokerageRuleNumber = (
    field: BrokerageRuleNumberField,
    value: string,
  ) => {
    const normalizedValue = value.replace(/[^\d.]/g, "");
    setBrokerageRuleForm((prev) => ({
      ...prev,
      [field]: normalizedValue.split(".").slice(0, 2).join("."),
    }));
  };
  const updateBrokerageRuleMode = (
    field: BrokerageRuleModeField,
    value: string,
  ) => {
    setBrokerageRuleForm((prev) => ({
      ...prev,
      [field]: value === "FIXED" ? "FIXED" : "PERCENTAGE",
    }));
  };
  const availableUnits = useMemo(
    () =>
      (selectedProject?.units ?? []).filter((unit) => !isUnavailableUnit(unit)),
    [selectedProject?.units],
  );
  const preferredConfiguration = defaults?.preferredConfiguration
    ?.trim()
    .toLowerCase();
  const leadMatchedUnits = useMemo(
    () =>
      preferredConfiguration
        ? availableUnits.filter(
            (unit) =>
              unit.configuration?.trim().toLowerCase() ===
              preferredConfiguration,
          )
        : [],
    [availableUnits, preferredConfiguration],
  );
  const configurationOptions = useMemo(() => {
    const set = new Set<string>();
    if (defaults?.preferredConfiguration) set.add(defaults.preferredConfiguration);
    configurationMasters.options.forEach((item) => {
      if (item.value) set.add(item.value);
    });
    (masterConfigurationOptions ?? []).forEach((item) => {
      if (item) set.add(item);
    });
    (selectedProject?.units ?? []).forEach((unit) => {
      if (unit.configuration) set.add(unit.configuration);
    });
    if (set.size === 0) {
      [
        "1BHK",
        "2BHK",
        "3BHK",
        "4BHK",
        "1 RK",
        "Studio",
        "Villa",
        "Penthouse",
        "Duplex",
        "Plot",
        "Commercial",
        "Shop",
        "Office",
      ].forEach((item) => set.add(item));
    }
    return Array.from(set);
  }, [
    defaults?.preferredConfiguration,
    configurationMasters.options,
    masterConfigurationOptions,
    selectedProject?.units,
  ]);

  const unitOptions = useMemo(
    () => [
      ...leadMatchedUnits,
      ...availableUnits.filter(
        (unit) => !leadMatchedUnits.some((match) => match.id === unit.id),
      ),
      ...(selectedProject?.units ?? []).filter(
        (unit) =>
          isUnavailableUnit(unit) &&
          !leadMatchedUnits.some((match) => match.id === unit.id) &&
          !availableUnits.some((availableUnit) => availableUnit.id === unit.id),
      ),
    ],
    [availableUnits, leadMatchedUnits, selectedProject?.units],
  );
  useEffect(() => {
    if (!open) return;
    setBrokerageRuleForm(savedBrokerageRuleForm);
  }, [open, savedBrokerageRuleForm]);
  const suggestedUnit = useMemo(() => {
    if (!selectedProject || defaults?.unitId || leadMatchedUnits.length !== 1) {
      return undefined;
    }
    return leadMatchedUnits[0];
  }, [defaults?.unitId, leadMatchedUnits, selectedProject]);
  const selectedUnit = selectedProject?.units.find(
    (unit) => unit.id === unitId,
  );
  const selectedUnitUnavailable = isUnavailableUnit(selectedUnit);
  const isCurrentEditingUnit =
    isEditing &&
    Boolean(defaults?.unitId) &&
    selectedUnit?.id === defaults?.unitId;
  const selectedUnitImage = getFirstInventoryImage(
    selectedUnit,
    selectedProject,
  );
  const selectedProjectImage =
    getFirstInventoryImage(undefined, selectedProject) ||
    defaults?.preferredProjectImage ||
    "";
  const previewImage = selectedUnitImage || selectedProjectImage;
  const bookingAmountInRupees = toRupeeAmount(bookingAmount);
  const agreementValueInRupees =
    toBookingAmountRupees(agreementValue, agreementValueUnit) ||
    Number(selectedUnit?.price ?? 0) ||
    bookingAmountInRupees;
  const agreementValueAmount = Number(agreementValueInRupees) || 0;
  const brokeragePreview = useMemo(() => {
    const rule = brokerageRuleForm;
    const agreementAmount = agreementValueAmount;
    if (!rule || !Number.isFinite(agreementAmount) || agreementAmount <= 0) {
      return undefined;
    }

    const componentAmount = (
      percentageField: BrokerageRuleNumberField,
      modeField: BrokerageRuleModeField,
      fixedField: BrokerageRuleNumberField,
      bookingOverride: string,
      bookingOverrideMode: BrokerageCalculationMode,
    ) =>
      hasRuleInputValue(bookingOverride)
        ? bookingOverrideMode === "PERCENTAGE"
          ? percentageAmount(agreementAmount, toRuleNumberValue(bookingOverride))
          : toRuleNumberValue(bookingOverride)
        : rule[modeField] === "FIXED"
        ? toRuleNumberValue(rule[fixedField])
        : percentageAmount(
            agreementAmount,
            toRuleNumberValue(rule[percentageField]),
          );

    const baseAmount = componentAmount(
      "baseBrokeragePct",
      "baseBrokerageMode",
      "baseBrokerageFixedAmount",
      baseBrokerageOverride,
      baseBrokerageOverrideMode,
    );
    const ladderAmount = componentAmount(
      "ladderBrokeragePct",
      "ladderBrokerageMode",
      "ladderBrokerageFixedAmount",
      ladderBrokerageOverride,
      ladderBrokerageOverrideMode,
    );
    const aopAmount = componentAmount(
      "aopBrokeragePct",
      "aopBrokerageMode",
      "aopBrokerageFixedAmount",
      aopBrokerageOverride,
      aopBrokerageOverrideMode,
    );
    const grossAmount = baseAmount + ladderAmount + aopAmount;
    const gstAmount = percentageAmount(
      grossAmount,
      toRuleNumberValue(rule.gstPct),
    );
    const tdsAmount = percentageAmount(
      grossAmount,
      toRuleNumberValue(rule.tdsPct),
    );
    const passbackAmount = toRuleNumberValue(rule.passbackDefaultAmount);
    const rawNetAmount = grossAmount + gstAmount - tdsAmount - passbackAmount;

    return {
      baseAmount,
      ladderAmount,
      aopAmount,
      grossAmount,
      gstAmount,
      tdsAmount,
      passbackAmount,
      rawNetAmount,
      netAmount: Math.max(rawNetAmount, 0),
      isNegative: rawNetAmount < 0,
      isConfigured: brokerageRuleQuery.data?.isConfigured ?? true,
    };
  }, [
    agreementValueAmount,
    aopBrokerageOverride,
    aopBrokerageOverrideMode,
    baseBrokerageOverride,
    baseBrokerageOverrideMode,
    brokerageRuleForm,
    brokerageRuleQuery.data?.isConfigured,
    ladderBrokerageOverride,
    ladderBrokerageOverrideMode,
  ]);
  const brokerageComponentLabel = (
    label: string,
    percentageField: BrokerageRuleNumberField,
    modeField: BrokerageRuleModeField,
    fixedField: BrokerageRuleNumberField,
  ) =>
    brokerageRuleForm[modeField] === "FIXED"
      ? `${label} (${formatCalculatedCurrency(
          toRuleNumberValue(brokerageRuleForm[fixedField]),
        )} fixed)`
      : `${label} (${brokerageRuleForm[percentageField]}%)`;
  const selectedUnitLabel = [
    selectedUnit?.tower,
    selectedUnit?.unitNumber ? `Unit ${selectedUnit.unitNumber}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const brokeragePreviewItems = brokeragePreview
    ? [
        {
          label: brokerageComponentLabel(
            "Base brokerage",
            "baseBrokeragePct",
            "baseBrokerageMode",
            "baseBrokerageFixedAmount",
          ),
          value: brokeragePreview.baseAmount,
        },
        {
          label: brokerageComponentLabel(
            "Ladder brokerage",
            "ladderBrokeragePct",
            "ladderBrokerageMode",
            "ladderBrokerageFixedAmount",
          ),
          value: brokeragePreview.ladderAmount,
        },
        {
          label: brokerageComponentLabel(
            "AOP brokerage",
            "aopBrokeragePct",
            "aopBrokerageMode",
            "aopBrokerageFixedAmount",
          ),
          value: brokeragePreview.aopAmount,
        },
        {
          label: "Gross brokerage",
          value: brokeragePreview.grossAmount,
        },
        {
          label: `GST (${brokerageRuleForm.gstPct}%)`,
          value: brokeragePreview.gstAmount,
        },
        {
          label: `TDS (${brokerageRuleForm.tdsPct}%)`,
          value: -brokeragePreview.tdsAmount,
        },
        {
          label: "Passback",
          value: -brokeragePreview.passbackAmount,
        },
      ]
    : [];
  const getBookingOverrideAmount = (
    value: string,
    mode: BrokerageCalculationMode,
  ) => {
    if (!hasRuleInputValue(value)) return undefined;
    const numericValue = toRuleNumberValue(value);
    return mode === "PERCENTAGE"
      ? percentageAmount(agreementValueAmount, numericValue)
      : numericValue;
  };
  const leadPreferenceItems = [
    {
      label: "Preferred project",
      value: defaults?.preferredProjectName || selectedProject?.name,
      icon: Building2,
    },
    {
      label: "Preferred location",
      value: defaults?.preferredLocation || selectedProject?.location,
      icon: MapPin,
    },
    {
      label: "Configuration",
      value: defaults?.preferredConfiguration || selectedUnit?.configuration,
      icon: BedDouble,
    },
    {
      label: "Budget",
      value: defaults?.preferredBudget,
      icon: IndianRupee,
    },
  ].filter((item) => item.value);
  const canSubmit =
    Boolean(projectId) &&
    Boolean(unitType) &&
    Boolean(flatNo.trim()) &&
    Boolean(bookingAmountInRupees) &&
    Boolean(agreementValueInRupees) &&
    Boolean(bookingDate) &&
    (!selectedUnitUnavailable || isCurrentEditingUnit) &&
    !brokerageRuleQuery.isError &&
    !isBrokerageRuleDirty;

  const saveBrokerageRule = async () => {
    if (!projectId || !isBrokerageRuleDirty) return;
    const brokerageRulePayload = {
      baseBrokeragePct: toRuleNumberValue(brokerageRuleForm.baseBrokeragePct),
      baseBrokerageMode: brokerageRuleForm.baseBrokerageMode,
      baseBrokerageFixedAmount: toRuleNumberValue(
        brokerageRuleForm.baseBrokerageFixedAmount,
      ),
      ladderBrokeragePct: toRuleNumberValue(
        brokerageRuleForm.ladderBrokeragePct,
      ),
      ladderBrokerageMode: brokerageRuleForm.ladderBrokerageMode,
      ladderBrokerageFixedAmount: toRuleNumberValue(
        brokerageRuleForm.ladderBrokerageFixedAmount,
      ),
      aopBrokeragePct: toRuleNumberValue(brokerageRuleForm.aopBrokeragePct),
      aopBrokerageMode: brokerageRuleForm.aopBrokerageMode,
      aopBrokerageFixedAmount: toRuleNumberValue(
        brokerageRuleForm.aopBrokerageFixedAmount,
      ),
      gstPct: toRuleNumberValue(brokerageRuleForm.gstPct),
      tdsPct: toRuleNumberValue(brokerageRuleForm.tdsPct),
      passbackDefaultAmount: toRuleNumberValue(
        brokerageRuleForm.passbackDefaultAmount,
      ),
      salesIncentivePct: toRuleNumberValue(
        brokerageRuleForm.salesIncentivePct,
      ),
      salesIncentiveMode: brokerageRuleForm.salesIncentiveMode,
      salesIncentiveFixedAmount: toRuleNumberValue(
        brokerageRuleForm.salesIncentiveFixedAmount,
      ),
      preSalesIncentivePct: toRuleNumberValue(
        brokerageRuleForm.preSalesIncentivePct,
      ),
      preSalesIncentiveMode: brokerageRuleForm.preSalesIncentiveMode,
      preSalesIncentiveFixedAmount: toRuleNumberValue(
        brokerageRuleForm.preSalesIncentiveFixedAmount,
      ),
      teamLeaderIncentivePct: toRuleNumberValue(
        brokerageRuleForm.teamLeaderIncentivePct,
      ),
      teamLeaderIncentiveMode: brokerageRuleForm.teamLeaderIncentiveMode,
      teamLeaderIncentiveFixedAmount: toRuleNumberValue(
        brokerageRuleForm.teamLeaderIncentiveFixedAmount,
      ),
    };
    try {
      await bookingMutations.updateProjectBrokerageRule.mutateAsync({
        projectId,
        ...brokerageRulePayload,
      });
      toast.success("Project brokerage master updated.");
    } catch (err) {
      toast.error("Could not update brokerage master.");
    }
  };

  const baseBookingBrokerageAmount = getBookingOverrideAmount(
    baseBrokerageOverride,
    baseBrokerageOverrideMode,
  );
  const ladderBookingBrokerageAmount = getBookingOverrideAmount(
    ladderBrokerageOverride,
    ladderBrokerageOverrideMode,
  );
  const aopBookingBrokerageAmount = getBookingOverrideAmount(
    aopBrokerageOverride,
    aopBrokerageOverrideMode,
  );
  const bookingBrokerageOverridePayload = {
    ...(baseBookingBrokerageAmount !== undefined
      ? { baseBrokerageAmount: baseBookingBrokerageAmount }
      : {}),
    ...(ladderBookingBrokerageAmount !== undefined
      ? { ladderBrokerageAmount: ladderBookingBrokerageAmount }
      : {}),
    ...(aopBookingBrokerageAmount !== undefined
      ? { aopBrokerageAmount: aopBookingBrokerageAmount }
      : {}),
  };

  const createBooking = async () => {
    if (!canSubmit) return;
    if (defaults?.bookingId) {
      await bookingMutations.updateBooking.mutateAsync({
        leadId: lead.id,
        bookingId: defaults.bookingId,
        status: defaults.status,
        projectId,
        unitId: unitId || null,
        unitType: unitType || undefined,
        flatNo: flatNo.trim(),
        bookingAmount: bookingAmountInRupees,
        agreementValue: agreementValueInRupees,
        ...bookingBrokerageOverridePayload,
        bookingDate,
        remarks: notes,
        notes,
        nextAction,
      });
      toast.success("Booking updated successfully.");
    } else {
      await bookingMutations.createBooking.mutateAsync({
        leadId: lead.id,
        projectId,
        unitId: unitId || undefined,
        unitType: unitType || undefined,
        flatNo: flatNo.trim(),
        bookingAmount: bookingAmountInRupees,
        agreementValue: agreementValueInRupees,
        ...bookingBrokerageOverridePayload,
        bookingDate,
        remarks: notes,
        notes,
        nextAction,
        siteVisitId: defaults?.siteVisitId,
      });
      toast.success("Booking scheduled successfully.");
    }
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(96vw,92rem)] max-w-none flex-col overflow-hidden rounded-xl bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-slate-50/60 px-6 py-5">
          <DialogTitle className="text-2xl font-extrabold leading-tight text-secondary">
            {isEditing ? "Edit booking" : "Schedule booking"}
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-muted-foreground">
            {isEditing
              ? "Update booking details, commercials, notes, and inventory context."
              : "Record the customer&apos;s reservation intent. Inventory is blocked only after booking confirmation."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <Card className="rounded-md border border-blue-100 bg-blue-50/60 p-4 shadow-none">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white text-blue-700">
                  <CalendarCheck className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-secondary">
                    {lead.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {lead.mobile ?? "Lead contact"} · Scheduled booking
                    reservation
                  </p>
                </div>
              </div>
            </Card>

            {leadPreferenceItems.length ? (
              <Card className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-none">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      Project context from lead
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      These values are prefilled from the lead requirement when
                      available.
                    </p>
                  </div>
                  <Badge className="border-0 bg-blue-50 text-blue-700">
                    Auto-filled
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {leadPreferenceItems.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex min-w-0 items-start gap-2 rounded-md bg-slate-50 p-3"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold text-muted-foreground">
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-extrabold text-secondary">
                          {value}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <div className="mt-5 space-y-5">
              <Card className="rounded-md border border-slate-200 p-5 shadow-none">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-secondary">
                      Booking details
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Select the project, inventory unit, and planned
                      reservation date.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Project
                    <Select
                      value={projectId || "none"}
                      onValueChange={(value) => {
                        setProjectId(value === "none" ? "" : value);
                        setUnitId("");
                        setFlatNo("");
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-md bg-card text-sm font-bold shadow-none">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <span className="flex items-center gap-3">
                              {getFirstInventoryImage(undefined, project) ? (
                                <img
                                  src={getFirstInventoryImage(
                                    undefined,
                                    project,
                                  )}
                                  alt={project.name}
                                  className="h-10 w-14 rounded-md object-cover"
                                />
                              ) : (
                                <span className="flex h-10 w-14 items-center justify-center rounded-md bg-slate-100 text-primary">
                                  <Building2 className="size-4" />
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-extrabold text-secondary">
                                  {project.name}
                                </span>
                                <span className="block truncate text-xs font-semibold text-muted-foreground">
                                  {project.location}
                                </span>
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Property / Unit Type
                    <Select
                      value={unitType || "none"}
                      onValueChange={(value) =>
                        setUnitType(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger className="h-11 rounded-md bg-card text-sm font-bold shadow-none">
                        <SelectValue placeholder="Select property / unit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select property / unit type</SelectItem>
                        {configurationOptions.map((config) => (
                          <SelectItem key={config} value={config}>
                            {config}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Flat No.
                    <Input
                      value={flatNo}
                      placeholder="Type flat number"
                      className="h-11 rounded-md bg-card text-sm font-bold shadow-none"
                      onChange={(event) => {
                        setFlatNo(event.currentTarget.value);
                        setUnitId("");
                      }}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Planned booking date
                    <DatePicker
                      value={bookingDate}
                      onChange={(event) => setBookingDate(event.target.value)}
                    />
                  </label>
                </div>
              </Card>

              <Card className="rounded-md border border-slate-200 p-5 shadow-none">
                <div className="mb-4">
                  <h3 className="text-sm font-extrabold text-secondary">
                    Commercials
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Reservation amount is entered in rupees. Agreement value can
                    use Lakh or Cr.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Reservation amount received (INR)
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={bookingAmount}
                        inputMode="decimal"
                        placeholder="Example: 150000"
                        className="h-11 rounded-md pl-9 text-sm font-semibold"
                        onChange={(event) =>
                          setBookingAmount(
                            normalizeBookingAmountInput(event.target.value),
                          )
                        }
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {bookingAmountInRupees
                        ? `Will save as ${formatCurrency(
                            bookingAmountInRupees,
                          )}.`
                        : "Enter the reservation money in actual rupees. Example: 150000 = ₹1,50,000."}
                    </p>
                  </label>

                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Agreement value
                    <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                      <div className="relative">
                        <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={agreementValue}
                          inputMode="decimal"
                          placeholder="Example: 95"
                          className="h-11 rounded-md pl-9 text-sm font-semibold"
                          onChange={(event) =>
                            setAgreementValue(
                              normalizeBookingAmountInput(event.target.value),
                            )
                          }
                        />
                      </div>
                      <Select
                        value={agreementValueUnit}
                        onValueChange={(value) =>
                          setAgreementValueUnit(value as BookingAmountUnit)
                        }
                      >
                        <SelectTrigger
                          aria-label="Agreement value unit"
                          className="h-11 rounded-md bg-white text-sm font-bold shadow-none"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bookingAmountUnitOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {agreementValue
                        ? `Will save as ${formatCurrency(
                            agreementValueInRupees,
                          )}.`
                        : selectedUnit?.price
                        ? `Defaults to selected unit price ${formatCurrency(
                            selectedUnit.price,
                          )}.`
                        : "Example: 95 Lakh = ₹95,00,000."}
                    </p>
                  </label>
                </div>

                <div className="mt-5 rounded-md border border-blue-100 bg-blue-50/60 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-extrabold text-secondary">
                          Project brokerage & incentive master
                        </h4>
                        {brokerageRuleQuery.data?.isConfigured ? (
                          <Badge className="border-0 bg-green-50 text-success">
                            Project rule configured
                          </Badge>
                        ) : (
                          <Badge className="border-0 bg-amber-50 text-amber-700">
                            Using global defaults
                          </Badge>
                        )}
                        {isBrokerageRuleDirty ? (
                          <Badge className="border-0 bg-orange-50 text-primary">
                            Unsaved edits
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">
                        Set the project percentage master for base, ladder, and
                        AOP brokerage. GST and TDS stay percentage-based. If a
                        booking needs fixed brokerage, override the preview
                        amounts below.
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-md px-3 text-xs shadow-none"
                        disabled={
                          !isBrokerageRuleDirty ||
                          brokerageRuleQuery.isError ||
                          brokerageRuleQuery.isLoading ||
                          bookingMutations.updateProjectBrokerageRule.isPending
                        }
                        onClick={() =>
                          setBrokerageRuleForm(savedBrokerageRuleForm)
                        }
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        className="h-9 rounded-md px-3 text-xs"
                        disabled={
                          !projectId ||
                          !isBrokerageRuleDirty ||
                          brokerageRuleQuery.isError ||
                          brokerageRuleQuery.isLoading ||
                          bookingMutations.updateProjectBrokerageRule.isPending
                        }
                        onClick={() => void saveBrokerageRule()}
                      >
                        {bookingMutations.updateProjectBrokerageRule.isPending
                          ? "Saving..."
                          : "Save master"}
                      </Button>
                    </div>
                  </div>

                  {brokerageRuleQuery.isLoading && projectId ? (
                    <p className="mt-4 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Loading brokerage master for the selected project...
                    </p>
                  ) : brokerageRuleQuery.isError ? (
                    <p className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
                      Could not load this project&apos;s brokerage master. Ask
                      Admin to grant brokerage/incentive access for this user,
                      then try again.
                    </p>
                  ) : selectedProject ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                      {brokerageRuleSections.map((section) => (
                        <div
                          key={section.title}
                          className="min-w-0 rounded-md border border-slate-200 bg-white p-4"
                        >
                          <p className="mb-3 text-xs font-extrabold text-secondary">
                            {section.title}
                          </p>
                          <div className="space-y-2">
                            {section.fields.map((item) => {
                              const modeField = item.modeField;
                              const fixedField = item.fixedField;
                              const usesFixedAmount =
                                modeField &&
                                fixedField &&
                                brokerageRuleForm[modeField] === "FIXED";
                              const activeField =
                                usesFixedAmount && fixedField
                                  ? fixedField
                                  : item.field;
                              return (
                                <label
                                  key={item.field}
                                  className="flex min-w-0 flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"
                                >
                                  <span className="text-xs font-bold leading-snug text-secondary">
                                    {item.label}
                                  </span>
                                  <div
                                    className={cn(
                                      "grid min-w-0 gap-2",
                                      modeField &&
                                        fixedField &&
                                        "sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]",
                                    )}
                                  >
                                    {modeField && fixedField ? (
                                      <Select
                                        value={brokerageRuleForm[modeField]}
                                        onValueChange={(value) =>
                                          updateBrokerageRuleMode(
                                            modeField,
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-9 w-full rounded-md border-slate-200 bg-white text-xs font-extrabold shadow-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="FIXED">
                                            Fixed amount
                                          </SelectItem>
                                          <SelectItem value="PERCENTAGE">
                                            Percentage
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : null}
                                    <div className="relative min-w-0">
                                      <Input
                                        type="number"
                                        min="0"
                                        step={
                                          usesFixedAmount
                                            ? "1"
                                            : item.step ?? "0.01"
                                        }
                                        value={brokerageRuleForm[activeField]}
                                        className="h-9 w-full rounded-md border-slate-200 bg-white pr-8 text-right text-xs font-extrabold shadow-none"
                                        onChange={(event) =>
                                          updateBrokerageRuleNumber(
                                            activeField,
                                            event.target.value,
                                          )
                                        }
                                      />
                                      {usesFixedAmount || item.suffix ? (
                                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                                          {usesFixedAmount ? "₹" : item.suffix}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Select a project to load and edit its brokerage master.
                    </p>
                  )}

                  {isBrokerageRuleDirty ? (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      Save the brokerage master before scheduling. Existing
                      project bookings will be recalculated by the current API
                      after this master is saved.
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-secondary">
                        Brokerage preview
                      </h4>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        This uses the selected project&apos;s brokerage master
                        before the booking is saved.
                      </p>
                    </div>
                    {brokeragePreview ? (
                      <Badge
                        className={cn(
                          "w-fit border-0",
                          brokeragePreview.isNegative
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-success",
                        )}
                      >
                        Net will save as{" "}
                        {formatCalculatedCurrency(brokeragePreview.netAmount)}
                      </Badge>
                    ) : null}
                  </div>

                  {brokerageRuleQuery.isFetching && projectId ? (
                    <p className="mt-4 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Loading brokerage rule for the selected project...
                    </p>
                  ) : brokeragePreview ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-extrabold text-secondary">
                              Booking brokerage override
                            </p>
                            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                              Leave blank to use the project master. Choose
                              percentage for deal-specific rates or fixed for
                              direct rupee amounts.
                            </p>
                          </div>
                          <Badge className="w-fit border-0 bg-white text-blue-700">
                            Optional override
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          {[
                            {
                              label: "Base",
                              value: baseBrokerageOverride,
                              mode: baseBrokerageOverrideMode,
                              placeholder: formatCalculatedCurrency(
                                percentageAmount(
                                  agreementValueAmount,
                                  toRuleNumberValue(
                                    brokerageRuleForm.baseBrokeragePct,
                                  ),
                                ),
                              ),
                              onChange: setBaseBrokerageOverride,
                              onModeChange: setBaseBrokerageOverrideMode,
                            },
                            {
                              label: "Ladder",
                              value: ladderBrokerageOverride,
                              mode: ladderBrokerageOverrideMode,
                              placeholder: formatCalculatedCurrency(
                                percentageAmount(
                                  agreementValueAmount,
                                  toRuleNumberValue(
                                    brokerageRuleForm.ladderBrokeragePct,
                                  ),
                                ),
                              ),
                              onChange: setLadderBrokerageOverride,
                              onModeChange: setLadderBrokerageOverrideMode,
                            },
                            {
                              label: "AOP",
                              value: aopBrokerageOverride,
                              mode: aopBrokerageOverrideMode,
                              placeholder: formatCalculatedCurrency(
                                percentageAmount(
                                  agreementValueAmount,
                                  toRuleNumberValue(
                                    brokerageRuleForm.aopBrokeragePct,
                                  ),
                                ),
                              ),
                              onChange: setAopBrokerageOverride,
                              onModeChange: setAopBrokerageOverrideMode,
                            },
                          ].map((item) => (
                            <label
                              key={item.label}
                              className="space-y-1.5 text-[11px] font-extrabold text-secondary"
                            >
                              {item.label}
                              <div className="grid gap-2">
                                <Select
                                  value={item.mode}
                                  onValueChange={(value) =>
                                    item.onModeChange(
                                      value as BrokerageCalculationMode,
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-10 rounded-md bg-white text-xs font-bold shadow-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PERCENTAGE">
                                      Percentage
                                    </SelectItem>
                                    <SelectItem value="FIXED">
                                      Fixed amount
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="relative">
                                  {item.mode === "FIXED" ? (
                                    <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                  ) : null}
                                  <Input
                                    value={item.value}
                                    inputMode="decimal"
                                    placeholder={
                                      item.mode === "PERCENTAGE"
                                        ? "2"
                                        : item.placeholder
                                    }
                                    className={cn(
                                      "h-10 rounded-md bg-white text-sm font-semibold shadow-none",
                                      item.mode === "FIXED" ? "pl-8" : "pr-7",
                                    )}
                                    onChange={(event) =>
                                      item.onChange(
                                        normalizeBookingAmountInput(
                                          event.target.value,
                                        ),
                                      )
                                    }
                                  />
                                  {item.mode === "PERCENTAGE" ? (
                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-muted-foreground">
                                      %
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {brokeragePreviewItems.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "text-secondary",
                                item.value < 0 && "text-red-700",
                              )}
                            >
                              {formatCalculatedCurrency(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div
                        className={cn(
                          "rounded-md border px-3 py-2",
                          brokeragePreview.isNegative
                            ? "border-amber-200 bg-amber-50"
                            : "border-green-100 bg-green-50",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {brokeragePreview.isNegative ? (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                          )}
                          <div className="min-w-0 text-xs font-semibold">
                            <p
                              className={cn(
                                "font-extrabold",
                                brokeragePreview.isNegative
                                  ? "text-amber-800"
                                  : "text-success",
                              )}
                            >
                              Raw net calculation:{" "}
                              {formatCalculatedCurrency(
                                brokeragePreview.rawNetAmount,
                              )}
                            </p>
                            <p className="mt-1 text-secondary">
                              {brokeragePreview.isNegative
                                ? `Passback is higher than the calculated brokerage. The booking can still be scheduled, but total brokerage, pending brokerage, and commission base will save as ${formatCalculatedCurrency(
                                    0,
                                  )} unless the commercials change.`
                                : "The calculated net brokerage is positive and will be used as the booking brokerage base."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!brokeragePreview.isConfigured ? (
                        <p className="text-xs font-semibold text-muted-foreground">
                          This project is using fallback brokerage settings
                          because no project-specific master is configured.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Select a project and enter an agreement value to preview
                      brokerage before scheduling.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="rounded-md border border-slate-200 p-5 shadow-none">
                <div className="mb-4">
                  <h3 className="text-sm font-extrabold text-secondary">
                    Booking handoff
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Keep the follow-through action and buyer context together
                    for the team.
                  </p>
                </div>
                <div className="space-y-4">
                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Next action
                    <Input
                      value={nextAction}
                      className="h-11 rounded-md text-sm font-semibold"
                      onChange={(event) => setNextAction(event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                    Booking notes
                    <Textarea
                      value={notes}
                      placeholder="Buyer intent, reservation commitment, documentation notes..."
                      className="min-h-[132px] rounded-md text-sm font-semibold"
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                </div>
              </Card>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50 px-6 py-5 lg:border-l lg:border-t-0">
            <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none lg:sticky lg:top-0">
              <p className="text-sm font-extrabold text-secondary">
                Project details
              </p>
              {selectedProject ? (
                <div className="mt-4 space-y-4">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={`${selectedProject.name} preview`}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-primary">
                        <Building2 className="size-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-50 text-primary">
                        {selectedUnit ? (
                          <Home className="size-4" />
                        ) : (
                          <Building2 className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-secondary">
                          {selectedProject.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {selectedUnit
                            ? selectedUnitLabel || "Unit selected"
                            : selectedProject.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-0 bg-slate-100 text-secondary">
                        {selectedUnit?.configuration ??
                          defaults?.preferredConfiguration ??
                          "Configuration pending"}
                      </Badge>
                      {selectedUnit ? (
                        <Badge
                          className={cn(
                            "border-0",
                            isUnavailableUnit(selectedUnit)
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-success",
                          )}
                        >
                          {selectedUnit.availability}
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-blue-50 text-blue-700">
                          {availableUnits.length} available units
                        </Badge>
                      )}
                    </div>

                    {leadPreferenceItems.length ? (
                      <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3">
                        {leadPreferenceItems.slice(0, 4).map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-3 text-xs font-semibold"
                          >
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="max-w-[150px] truncate text-right text-secondary">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                        <span className="text-muted-foreground">
                          Reservation amount
                        </span>
                        <span className="text-secondary">
                          {formatCurrency(bookingAmountInRupees)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                        <span className="text-muted-foreground">
                          Agreement value
                        </span>
                        <span className="text-secondary">
                          {selectedUnit || agreementValue
                            ? formatCurrency(agreementValueInRupees)
                            : "Select unit"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                        <span className="text-muted-foreground">
                          Planned date
                        </span>
                        <span className="text-secondary">
                          {bookingDate || "Select date"}
                        </span>
                      </div>
                    </div>

                    {selectedUnit &&
                    selectedUnitUnavailable &&
                    !isCurrentEditingUnit ? (
                      <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        This unit is already booked or sold. Select another
                        unit.
                      </p>
                    ) : selectedUnit && isCurrentEditingUnit ? (
                      <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-secondary">
                        This is the booking&apos;s current unit. You can save
                        edits without changing inventory.
                      </p>
                    ) : !selectedUnit ? (
                      <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-secondary">
                        Project is ready from lead context. Select an inventory
                        unit to complete the reservation.
                      </p>
                    ) : (
                      <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-secondary">
                        This creates a scheduled booking reservation first.
                        Inventory stays available until the booking is
                        confirmed.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-muted-foreground">
                  Select a project to preview images, lead context, inventory
                  count, price context, and booking readiness.
                </div>
              )}
            </Card>
          </aside>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            {isBrokerageRuleDirty
              ? `Save the brokerage master before ${
                  isEditing ? "updating" : "scheduling"
                } so the booking uses the visible calculation.`
              : isEditing
              ? "Booking edits recalculate brokerage and incentives from the visible values."
              : "Scheduled reservations keep inventory available until booking confirmation."}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-5 shadow-none"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md px-5"
              disabled={
                !canSubmit ||
                bookingMutations.createBooking.isPending ||
                bookingMutations.updateBooking.isPending
              }
              onClick={createBooking}
            >
              <CheckCircle2 className="size-4" />
              {bookingMutations.createBooking.isPending ||
              bookingMutations.updateBooking.isPending
                ? isEditing
                  ? "Saving..."
                  : "Scheduling..."
                : isEditing
                ? "Save booking"
                : "Schedule booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
