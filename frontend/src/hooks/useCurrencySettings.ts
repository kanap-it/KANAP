import { useQuery } from '@tanstack/react-query';
import { fetchCurrencySettings } from '../services/currency';

export function useCurrencySettings() {
  return useQuery({
    queryKey: ['currency-settings'],
    queryFn: fetchCurrencySettings,
    staleTime: 5 * 60 * 1000,
  });
}

export default useCurrencySettings;
