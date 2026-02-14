import { useQuery } from '@tanstack/react-query';
import api from '../../api';
export { pickYearSlot } from './useOpexSummary';

export type SummaryRow = {
  id: string;
  description: string;
  company_name?: string;
  versions?: {
    yMinus1?: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
    };
    y?: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
    };
    yPlus1?: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
    };
    [key: string]: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
    } | undefined;
  };
};

export function useCapexSummaryAll(years?: number[], options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['capex-items-summary', 'all', years?.join(',')],
    queryFn: async () => {
      // Fetch all pages; fall back to a single large page if supported
      const limit = 500;
      let page = 1;
      let items: SummaryRow[] = [];
      let total = 0;
      const maxPages = 50;
      const yearsParam = years ? years.join(',') : undefined;
      do {
        const res = await api.get<{ items: SummaryRow[]; total: number; page: number; limit: number }>(
          '/capex-items/summary',
          { params: { page, limit, sort: 'created_at:DESC', years: yearsParam } }
        );
        const data = res.data;
        items = items.concat(data.items || []);
        total = data.total || items.length;
        page += 1;
        if (!data.items || data.items.length === 0) break;
      } while (items.length < total && page <= maxPages);
      return items;
    },
    enabled: options?.enabled !== false,
  });
}
