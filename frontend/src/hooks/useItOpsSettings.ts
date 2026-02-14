import { useQuery } from '@tanstack/react-query';
import { fetchItOpsSettings } from '../services/itOpsSettings';

export function useItOpsSettings() {
  return useQuery({
    queryKey: ['it-ops-settings'],
    queryFn: fetchItOpsSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export default useItOpsSettings;

