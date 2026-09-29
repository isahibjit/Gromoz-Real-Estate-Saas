import React from 'react';
import { PlatformModuleCategory } from '../types/module.types';

export interface ModuleCategoryBadgeProps {
  category: PlatformModuleCategory | string;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  CORE: 'Core Infrastructure',
  SALES: 'Sales Engine',
  FIELD_OPS: 'Field Operations',
  AUTOMATION: 'Automation & AI',
  ENTERPRISE: 'Enterprise Suite',
};

export function ModuleCategoryBadge({ category, className = '' }: ModuleCategoryBadgeProps) {
  const label = categoryLabels[category] || category;

  return (
    <span
      className={`inline-flex items-center rounded-sm bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/80 ${className}`}
    >
      {label}
    </span>
  );
}
