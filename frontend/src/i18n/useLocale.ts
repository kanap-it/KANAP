import { useTranslation } from 'react-i18next';
import { resolveSupportedLocale, SupportedLocale } from './index';

export function useLocale(): SupportedLocale {
  const { i18n } = useTranslation();
  return resolveSupportedLocale(i18n.resolvedLanguage || i18n.language || 'en');
}
