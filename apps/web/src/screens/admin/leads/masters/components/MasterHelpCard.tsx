import { BookOpen } from "lucide-react";
import { Button } from "ui";

export function MasterHelpCard() {
  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm lg:w-[260px] xl:w-[280px]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-blue-600">
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-sm font-extrabold text-secondary">Need Help?</h3>
      <p className="mb-4 text-[13px] font-medium leading-relaxed text-slate-600">
        Masters are used across the system. Changes here will reflect in all
        related modules.
      </p>
      <Button
        variant="outline"
        className="w-full bg-white text-sm font-bold text-secondary shadow-sm hover:bg-slate-50"
      >
        Learn More
      </Button>
    </div>
  );
}
