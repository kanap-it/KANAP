import { useQuery } from '@tanstack/react-query';
import api from '../../api';

export type CoaListItem = {
  id: string;
  code: string;
  name: string;
  country_iso: string | null;
  is_default: boolean;
  is_global_default?: boolean;
  scope: 'GLOBAL' | 'COUNTRY';
  companies_count?: number;
  accounts_count?: number;
  created_at: string;
  updated_at: string;
};

export function useCoaList() {
  const query = useQuery({
    queryKey: ['chart-of-accounts-list'],
    queryFn: async () => {
      const res = await api.get('/chart-of-accounts', {
        params: { page: 1, limit: 1000, sort: 'code:ASC' },
      });
      return (res.data?.items || []) as CoaListItem[];
    },
    staleTime: 30_000,
  });

  return {
    coas: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}
