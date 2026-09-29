import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TenantCreateFormState, Tenant } from '../types/platform.types';
import { tenantService } from '../services/tenant.service';

const INITIAL_STATE: TenantCreateFormState = {
  companyName: '',
  legalEntityName: '',
  slug: '',
  domain: '',
  website: '',
  taxId: '',
  companySize: 'Medium (51 - 250 employees)',
  country: 'India',
  currency: 'INR - Indian Rupee (₹)',
  state: 'Maharashtra',
  city: 'Mumbai',
  addressLine1: '',
  addressLine2: '',
  pincode: '',
  dateFormat: 'DD MMM YYYY',
  financialYearStart: 'April',

  industryId: 'ind_pharma',
  timezone: 'Asia/Kolkata',
  totalEmployees: '',
  fieldUsers: '',
  yearsInBusiness: '5 - 10 Years',
  businessModel: 'B2B',
  branchCount: '',
  operatingCountries: 'India',
  preferredLanguage: 'English',
  description: '',
  weekStartDay: 'Monday',

  adminFullName: '',
  adminEmail: '',
  adminPhone: '',
  adminDesignation: '',
  adminDepartment: 'Administration',
  adminLanguage: 'English',
  adminTimezone: 'Asia/Kolkata',
  adminCommunicationEmail: '',
  adminUsername: '',
  adminPassword: '',
  adminConfirmPassword: '',
  sendInviteEmail: true,

  planId: 'plan_growth',
  provisioningType: 'Free Trial',
  userLicensesCount: 25,
  trialDurationDays: 14,
  trialConversionPolicy: 'Auto-convert to Growth Plan after trial',
  paymentCollectionMethod: 'Send Checkout Link to Customer',
  billingContactName: '',
  billingContactEmail: '',
  billingCycle: 'Yearly (Save 17%)',
  seatLimit: '150',
  storageLimit: '200 GB',
  subscriptionStartDate: '2026-05-24',

  inheritedModuleCodes: ['core_crm', 'field_visits', 'demo_scheduler', 'order_management', 'attendance'],

  isDraft: false,
};

interface TenantCreationContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  formState: TenantCreateFormState;
  updateFormState: (updates: Partial<TenantCreateFormState>) => void;
  loadTenantForEdit: (tenant: Tenant) => void;
  resetForm: () => void;
  saveDraft: () => Promise<void>;
  submitTenant: () => Promise<Tenant>;
  updateExistingTenant: (tenantId: string) => Promise<Tenant>;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  editingTenantId: string | null;
}

const TenantCreationContext = createContext<TenantCreationContextType | undefined>(undefined);

export const TenantCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<TenantCreateFormState>(INITIAL_STATE);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const updateFormState = (updates: Partial<TenantCreateFormState>) => {
    setFormState((prev) => {
      const next = { ...prev, ...updates };
      if (updates.companyName && !prev.slug && !editingTenantId) {
        next.slug = updates.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        next.domain = `${next.slug}.smartfieldwork.com`;
      }
      return next;
    });
    setIsDirty(true);
  };

  const loadTenantForEdit = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setFormState({
      companyName: tenant.companyName || '',
      legalEntityName: tenant.legalEntityName || tenant.companyName || '',
      slug: tenant.slug || '',
      domain: tenant.domain || '',
      website: tenant.website || '',
      taxId: tenant.taxId || '',
      companySize: tenant.companySize || 'Medium (51 - 250 employees)',
      country: tenant.country || 'India',
      currency: tenant.currency || 'INR - Indian Rupee (₹)',
      state: tenant.state || 'Maharashtra',
      city: tenant.city || 'Mumbai',
      addressLine1: tenant.addressLine1 || '',
      addressLine2: tenant.addressLine2 || '',
      pincode: tenant.pincode || '',
      dateFormat: tenant.dateFormat || 'DD MMM YYYY',
      financialYearStart: tenant.financialYearStart || 'April',

      industryId: tenant.industryId || 'ind_pharma',
      timezone: tenant.timezone || 'Asia/Kolkata',
      totalEmployees: tenant.totalEmployees || String(tenant.userLicensesCount || ''),
      fieldUsers: tenant.fieldUsers || '',
      yearsInBusiness: tenant.yearsInBusiness || '5 - 10 Years',
      businessModel: tenant.businessModel || 'B2B',
      branchCount: tenant.branchCount || '',
      operatingCountries: tenant.country || 'India',
      preferredLanguage: 'English',
      description: '',
      weekStartDay: tenant.weekStartDay || 'Monday',

      adminFullName: tenant.adminUser?.fullName || '',
      adminEmail: tenant.adminUser?.email || '',
      adminPhone: tenant.adminUser?.phone || '',
      adminDesignation: tenant.adminUser?.designation || '',
      adminDepartment: 'Administration',
      adminLanguage: 'English',
      adminTimezone: tenant.timezone || 'Asia/Kolkata',
      adminCommunicationEmail: tenant.adminUser?.email || '',
      adminUsername: tenant.adminUser?.email || '',
      adminPassword: '',
      adminConfirmPassword: '',
      sendInviteEmail: tenant.adminUser?.sendInviteEmail ?? true,

      planId: tenant.planId || 'plan_growth',
      provisioningType: tenant.provisioningType || 'Payment Required',
      userLicensesCount: tenant.userLicensesCount || 25,
      trialDurationDays: tenant.trialDurationDays || (tenant.trialStartDate && tenant.trialEndDate
        ? Math.ceil((new Date(tenant.trialEndDate).getTime() - new Date(tenant.trialStartDate).getTime()) / 86400000)
        : 14),
      trialConversionPolicy: tenant.trialConversionPolicy || '',
      paymentCollectionMethod: tenant.paymentCollectionMethod || 'Send Checkout Link to Customer',
      billingContactName: tenant.billingContactName || tenant.adminUser?.fullName || '',
      billingContactEmail: tenant.billingContactEmail || tenant.adminUser?.email || '',
      billingCycle: tenant.billingCycle || 'Yearly (Save 17%)',
      seatLimit: tenant.seatLimit || String(tenant.userLicensesCount || '150'),
      storageLimit: tenant.storageLimit || '200 GB',
      subscriptionStartDate: tenant.subscriptionStartDate || tenant.trialStartDate || tenant.createdAt?.split(' ·')[0] || '',

      inheritedModuleCodes: tenant.enabledModuleCodes || ['core_crm', 'field_visits'],
      isDraft: tenant.tenantStatus === 'Draft',
    });
    setIsDirty(false);
  };

  const resetForm = () => {
    setEditingTenantId(null);
    setFormState(INITIAL_STATE);
    setCurrentStep(1);
    setIsDirty(false);
  };

  const saveDraft = async () => {
    const draftState = { ...formState, isDraft: true };
    if (editingTenantId) {
      await tenantService.updateTenant(editingTenantId, {
        companyName: draftState.companyName,
        legalEntityName: draftState.legalEntityName,
        industryId: draftState.industryId,
        planId: draftState.planId,
        enabledModuleCodes: draftState.inheritedModuleCodes,
        userLicensesCount: draftState.userLicensesCount,
        provisioningType: draftState.provisioningType,
        paymentCollectionMethod: draftState.paymentCollectionMethod,
        tenantStatus: 'Draft',
      });
    } else {
      const created = await tenantService.createTenant(draftState);
      setEditingTenantId(created.id);
    }
    setIsDirty(false);
  };

  const submitTenant = async () => {
    const finalState = { ...formState, isDraft: false };
    if (editingTenantId) {
      const updated = await tenantService.updateTenant(editingTenantId, {
        companyName: finalState.companyName,
        legalEntityName: finalState.legalEntityName,
        slug: finalState.slug,
        domain: finalState.domain,
        website: finalState.website,
        taxId: finalState.taxId,
        country: finalState.country,
        currency: finalState.currency,
        timezone: finalState.timezone,
        companySize: finalState.companySize,
        industryId: finalState.industryId,
        planId: finalState.planId,
        provisioningType: finalState.provisioningType,
        paymentCollectionMethod: finalState.paymentCollectionMethod,
        userLicensesCount: finalState.userLicensesCount,
        enabledModuleCodes: finalState.inheritedModuleCodes,
        adminUser: {
          fullName: finalState.adminFullName,
          email: finalState.adminEmail,
          phone: finalState.adminPhone,
          designation: finalState.adminDesignation,
          sendInviteEmail: finalState.sendInviteEmail,
        },
        addressLine1: finalState.addressLine1,
        addressLine2: finalState.addressLine2,
        city: finalState.city,
        state: finalState.state,
        pincode: finalState.pincode,
        dateFormat: finalState.dateFormat,
        financialYearStart: finalState.financialYearStart,
        weekStartDay: finalState.weekStartDay,
        totalEmployees: finalState.totalEmployees,
        fieldUsers: finalState.fieldUsers,
        yearsInBusiness: finalState.yearsInBusiness,
        businessModel: finalState.businessModel,
        branchCount: finalState.branchCount,
        billingCycle: finalState.billingCycle,
        seatLimit: finalState.seatLimit,
        storageLimit: finalState.storageLimit,
      });
      setIsDirty(false);
      return updated;
    }

    const created = await tenantService.createTenant(finalState);
    setIsDirty(false);
    return created;
  };

  const updateExistingTenant = async (tenantId: string) => {
    setEditingTenantId(tenantId);
    return submitTenant();
  };

  return (
    <TenantCreationContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        formState,
        updateFormState,
        loadTenantForEdit,
        resetForm,
        saveDraft,
        submitTenant,
        updateExistingTenant,
        isDirty,
        setIsDirty,
        editingTenantId,
      }}
    >
      {children}
    </TenantCreationContext.Provider>
  );
};

export const useTenantCreation = () => {
  const context = useContext(TenantCreationContext);
  if (!context) {
    throw new Error('useTenantCreation must be used within a TenantCreationProvider');
  }
  return context;
};
