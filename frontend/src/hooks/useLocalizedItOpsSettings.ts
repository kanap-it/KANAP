import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useItOpsSettings } from './useItOpsSettings';
import type { ItOpsSettings } from '../services/itOpsSettings';
import { localizeCatalogList, toCatalogLocale } from '../utils/catalogLocalization';
import { classificationDefaults } from '../utils/applicationClassification';

const CATALOG_LISTS = [
  'applicationCategories', 'networkSegments', 'entities', 'serverKinds', 'serverProviders', 'serverRoles', 'hostingTypes', 'lifecycleStates',
  'interfaceProtocols', 'interfaceDataCategories', 'interfaceTriggerTypes', 'interfacePatterns', 'interfaceFormats', 'interfaceAuthModes',
  'operatingSystems', 'connectionTypes', 'domains', 'ipAddressTypes', 'accessMethods', 'pathHopFunctions', 'incidentCategories',
  'businessCriticalityLevels', 'cyberCriticalityLevels', 'dataClasses', 'recoveryWaves',
] as const;

/**
 * The single display projection of the IT Ops catalogs: every list localized for the user's language
 * (tenant translation, then shipped translation for untouched defaults, then base text). The raw query
 * data is left untouched for the settings editors.
 */
export function useLocalizedItOpsSettings() {
  const query = useItOpsSettings();
  const { i18n } = useTranslation();
  const locale = toCatalogLocale(i18n.resolvedLanguage || i18n.language);
  const data = useMemo<ItOpsSettings | undefined>(() => {
    if (!query.data) return undefined;
    const next: any = { ...query.data };
    for (const key of CATALOG_LISTS) next[key] = localizeCatalogList((query.data as any)[key], locale, classificationDefaults(key));
    return next as ItOpsSettings;
  }, [query.data, locale]);
  return { ...query, data };
}

export default useLocalizedItOpsSettings;
