import api from '../api';

export type CurrencySettings = {
  reportingCurrency: string;
  defaultSpendCurrency: string;
  defaultCapexCurrency: string;
  allowedCurrencies: string[] | null;
};

export type RefreshCurrencyRatesResponse = {
  ok: boolean;
  queued: boolean;
  alreadyQueued: boolean;
  years: number[];
};

export async function fetchCurrencySettings(): Promise<CurrencySettings> {
  const res = await api.get('/currency/settings');
  return res.data as CurrencySettings;
}

export async function updateCurrencySettings(payload: Partial<CurrencySettings>): Promise<CurrencySettings> {
  const res = await api.patch('/currency/settings', payload);
  return res.data as CurrencySettings;
}

export async function refreshCurrencyRates(payload?: { years?: number[]; year?: number }): Promise<RefreshCurrencyRatesResponse> {
  const res = await api.post('/currency/rates/refresh', payload ?? {});
  return res.data as RefreshCurrencyRatesResponse;
}
