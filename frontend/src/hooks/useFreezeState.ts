import { useQuery } from '@tanstack/react-query';
import { fetchFreezeState, FreezeStateResponse } from '../services/freeze';

export function useFreezeState(year: number, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? Number.isFinite(year);
  return useQuery<FreezeStateResponse>({
    queryKey: ['freeze-state', year],
    queryFn: () => fetchFreezeState(year),
    enabled,
    staleTime: 60_000,
  });
}
