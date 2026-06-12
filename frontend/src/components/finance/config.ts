export type FinanceModuleConfig = {
  module: 'opex' | 'capex';
  itemsApi: string;
  versionsApi: string;
  freezeScope: 'opex' | 'capex';
  i18nPrefix: 'opex' | 'capex';
  queryKeyPrefix: string;
};

export const OPEX_FINANCE_CONFIG: FinanceModuleConfig = {
  module: 'opex',
  itemsApi: '/spend-items',
  versionsApi: '/spend-versions',
  freezeScope: 'opex',
  i18nPrefix: 'opex',
  queryKeyPrefix: 'spend',
};

export const CAPEX_FINANCE_CONFIG: FinanceModuleConfig = {
  module: 'capex',
  itemsApi: '/capex-items',
  versionsApi: '/capex-versions',
  freezeScope: 'capex',
  i18nPrefix: 'capex',
  queryKeyPrefix: 'capex',
};
