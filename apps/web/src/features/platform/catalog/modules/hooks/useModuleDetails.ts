import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PlatformModule } from '../types/module.types';
import { moduleService } from '../services/module.service';

export function useModuleDetails(moduleId: string | undefined) {
  const [module, setModule] = useState<PlatformModule | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModule = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    try {
      const [mod, history] = await Promise.all([
        moduleService.getModuleById(moduleId),
        moduleService.getHistory(moduleId).catch(() => []),
      ]);
      setModule(mod);
      setHistoryLogs(history || []);
    } catch {
      toast.error('Unable to load module details from server.');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void fetchModule();
  }, [fetchModule]);

  return {
    module,
    historyLogs,
    loading,
    refresh: fetchModule,
  };
}
