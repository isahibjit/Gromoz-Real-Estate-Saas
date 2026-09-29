import React from 'react';
import { PlatformModuleStatus } from '../types/module.types';

export interface ModuleStatusBadgeProps {
  status: PlatformModuleStatus | string;
  className?: string;
}

export function ModuleStatusBadge({ status, className = '' }: ModuleStatusBadgeProps) {
  const normalized = (status || 'ACTIVE').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'BETA':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'DEPRECATED':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200/80';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600 border-slate-200/80';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${getStyle()} ${className}`}
    >
      {normalized}
    </span>
  );
}
