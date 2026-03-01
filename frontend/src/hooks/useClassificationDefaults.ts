import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../auth/AuthContext';

export interface ClassificationDefaults {
  source_id: string | null;
  category_id: string | null;
  stream_id: string | null;
  company_id: string | null;
}

function normalizeDefaults(data: any): ClassificationDefaults {
  return {
    source_id: data?.default_source_id ?? null,
    category_id: data?.default_category_id ?? null,
    stream_id: data?.default_stream_id ?? null,
    company_id: data?.default_company_id ?? null,
  };
}

export function useClassificationDefaults() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['classification-defaults', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      try {
        const res = await api.get('/portfolio/team-members/me');
        return normalizeDefaults(res.data);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return normalizeDefaults(null);
        }
        throw error;
      }
    },
  });
}
