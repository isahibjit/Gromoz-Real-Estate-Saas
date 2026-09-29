import { Plus, Trash2 } from "lucide-react";
import { Button, Input, SearchableSelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui";

import type { ProjectConfigurationVariant } from "./projectsData";

interface ProjectConfigurationVariantsProps {
  value: readonly ProjectConfigurationVariant[];
  configurationOptions: readonly { value: string; label: string; description?: string }[];
  onChange: (value: ProjectConfigurationVariant[]) => void;
}

const createVariantId = () =>
  `configuration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createProjectConfigurationVariant = (): ProjectConfigurationVariant => ({
  id: createVariantId(),
  configuration: "",
  carpetArea: "",
  priceAmount: "",
  priceUnit: "Cr",
});

export function ProjectConfigurationVariants({ value, configurationOptions, onChange }: ProjectConfigurationVariantsProps) {
  const updateVariant = (id: string, patch: Partial<ProjectConfigurationVariant>) =>
    onChange(value.map((variant) => variant.id === id ? { ...variant, ...patch } : variant));

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-secondary">Configuration carpet size & price</h3>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Add each size and price separately. Multiple 2BHK / configuration variants are supported.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, createProjectConfigurationVariant()])}>
          <Plus className="size-4" /> Add configuration / 2BHK
        </Button>
      </div>
      {value.length ? (
        <div className="mt-4 space-y-3">
          {value.map((variant, index) => (
            <div key={variant.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary" htmlFor={`configuration-${variant.id}`}>Configuration</label>
                <SearchableSelect value={variant.configuration} options={[...configurationOptions]} placeholder="Select configuration (e.g. 2BHK)" ariaLabel={`Configuration variant ${index + 1}`} searchPlaceholder="Search configurations..." noOptionsText="No matching configurations" className="h-10 rounded-md text-sm font-semibold shadow-none" contentClassName="max-h-[280px]" portaled={false} modal={false} onValueChange={(configuration) => updateVariant(variant.id, { configuration })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary" htmlFor={`carpet-area-${variant.id}`}>Carpet area</label>
                <div className="relative">
                  <Input id={`carpet-area-${variant.id}`} inputMode="decimal" value={variant.carpetArea} placeholder="555" className="h-10 rounded-md border-slate-200 pr-14 text-sm font-semibold shadow-none" onChange={(event) => updateVariant(variant.id, { carpetArea: event.target.value.replace(/[^\d.]/g, "") })} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">sq.ft.</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary" htmlFor={`price-${variant.id}`}>Price</label>
                <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                  <Input id={`price-${variant.id}`} inputMode="decimal" value={variant.priceAmount} placeholder="1.24" className="h-10 rounded-md border-slate-200 text-sm font-semibold shadow-none" onChange={(event) => updateVariant(variant.id, { priceAmount: event.target.value.replace(/[^\d.]/g, "") })} />
                  <Select value={variant.priceUnit} onValueChange={(priceUnit) => updateVariant(variant.id, { priceUnit: priceUnit as ProjectConfigurationVariant["priceUnit"] })}>
                    <SelectTrigger className="h-10 rounded-md border-slate-200 text-sm font-semibold shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Lakh">Lakh</SelectItem><SelectItem value="Cr">Cr</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove configuration variant ${index + 1}`} className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onChange(value.filter((item) => item.id !== variant.id))}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      ) : <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-muted-foreground">No configuration variants added yet. Click &quot;+ Add configuration / 2BHK&quot; above to add carpet area and price.</div>}
    </section>
  );
}
