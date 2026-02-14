import { useQuery } from '@tanstack/react-query';
import api from '../api';

export interface CurrencyRateRow {
  fiscalYear: number;
  baseCurrency: string;
  rates: Record<string, number>;
  capturedAt: string;
  source: string;
}

export default function useCurrencyRates() {
  return useQuery<CurrencyRateRow[]>({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      const res = await api.get<CurrencyRateRow[]>('/currency/rates');
      return res.data;
    },
  });
}
