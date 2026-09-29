import React from 'react';
import { Layers } from 'lucide-react';
import { Plan } from '../../types/plan.types';
import { PlatformModule } from '../../../modules/types/module.types';
import { DataTable } from '../../../../../../components/ui/DataTable';
export interface PlanModulesTabProps { plan: Plan; allModules?: PlatformModule[]; includedModules: PlatformModule[]; }
export function PlanModulesTab({ includedModules }: PlanModulesTabProps) { return <div className="space-y-4"><div><h3 className="text-base font-extrabold text-[#0D1F3D]">Included Modules</h3><p className="text-xs font-medium text-slate-600">Plans determine commercial pricing and which capability modules tenants inherit.</p></div><DataTable data={includedModules} columns={[{ header: 'Module', cell: (module) => <span className="flex items-center gap-2 font-bold text-[#0D1F3D]"><Layers className="h-4 w-4" />{module.name}</span> }, { header: 'Code', cell: (module) => <span className="font-mono font-bold text-slate-800">{module.code}</span> }, { header: 'Category', cell: (module) => module.category }, { header: 'Features', cell: (module) => module.features?.length ?? 0 }]} emptyMessage="This plan has no included modules." /></div>; }
