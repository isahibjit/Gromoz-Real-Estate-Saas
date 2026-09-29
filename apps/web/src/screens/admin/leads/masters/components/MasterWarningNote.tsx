import { Lightbulb } from "lucide-react";

export function MasterWarningNote() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3">
      <Lightbulb className="h-5 w-5 text-orange-500 shrink-0" />
      <p className="text-sm font-bold text-orange-800">
        Note: System default masters cannot be deleted but can be deactivated.
      </p>
    </div>
  );
}
