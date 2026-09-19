import { useQuery } from '@tanstack/react-query';
import api from '../api';

export type LocationOption = { id: string; location_reference: string; name: string };

/**
 * Shared location options.
 *
 * One query key and one parameter set for every caller: React Query caches by key only,
 * and this key used to be declared in two places with different `limit` values (200 in
 * LocationSelect, 500 in ItOperationsSettingsPage). Whichever mounted first populated the
 * entry, so the other screen silently read a truncated list. Keep both in this module.
 */
export const LOCATION_OPTIONS_QUERY_KEY = ['locations', 'options'] as const;

/** Large enough for the IT settings picker, which needs the full catalogue. */
const LOCATION_OPTIONS_LIMIT = 500;

export function useLocationOptions() {
  return useQuery({
    queryKey: LOCATION_OPTIONS_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ items: LocationOption[] }>('/locations', {
        params: { limit: LOCATION_OPTIONS_LIMIT, sort: 'location_reference:ASC' },
      });
      return (res.data?.items || []) as LocationOption[];
    },
  });
}
