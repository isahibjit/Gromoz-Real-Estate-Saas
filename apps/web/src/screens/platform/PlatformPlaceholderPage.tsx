import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface PlatformPlaceholderPageProps {
  title: string;
  category?: string;
  description?: string;
}

export function PlatformPlaceholderPage({
  title,
  category = 'Platform Management',
  description = 'This feature module will be available in the upcoming platform release phase.',
}: PlatformPlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => navigate('/platform/dashboard')}
              className="hover:text-[#0D1F3D]"
            >
              Dashboard
            </button>
            <span>›</span>
            <span>{category}</span>
            <span>›</span>
            <span className="font-extrabold text-[#0D1F3D]">{title}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight mt-1.5">
            {title}
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/platform/dashboard')}
          className="gap-2 font-bold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      <div className="rounded-sm border border-slate-200 bg-white p-12 shadow-xs text-center space-y-4 max-w-2xl mx-auto my-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Layers className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0D1F3D]">{title} Module</h2>
          <p className="text-xs text-slate-500 font-medium mt-1.5 max-w-md mx-auto">
            {description}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" /> Scheduled for Phase 2: Plans & Entitlements
        </div>
        <div className="pt-4">
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate('/platform/tenants')}
            className="font-bold shadow-xs px-6"
          >
            Go to Tenant Management
          </Button>
        </div>
      </div>
    </div>
  );
}
