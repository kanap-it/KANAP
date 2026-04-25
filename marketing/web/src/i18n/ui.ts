/**
 * i18n wiring for the marketing site.
 *
 * Each page resolves its locale from the URL (`/` for en, `/fr/...` etc.)
 * and pulls translation strings from the locale JSON files.
 *
 * For v1 phase 1 we expose:
 *  - Locale type
 *  - `getLocaleFromUrl(url)` to infer the locale from a page URL
 *  - `useTranslations(locale)` → `(key) => string`
 *  - `localePath(locale, path)` → build a locale-prefixed href
 *  - `relocatePath(currentUrl, targetLocale)` → preserve the current route
 *    when switching languages
 */

import en from './en.json';
import fr from './fr.json';
import de from './de.json';
import es from './es.json';

export const LOCALES = ['en', 'fr', 'de', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, fr, de, es };

export function getLocaleFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/');
  if ((LOCALES as readonly string[]).includes(first)) return first as Locale;
  return DEFAULT_LOCALE;
}

/**
 * Translation lookup. Falls back to English if the key is missing in the
 * target locale, and to the key itself if missing everywhere (so stray
 * keys surface visibly during development).
 */
export function useTranslations(locale: Locale) {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const fallback = DICTIONARIES[DEFAULT_LOCALE];
  return function t(key: string): string {
    return dict[key] ?? fallback[key] ?? key;
  };
}

/** Build a locale-prefixed path. English has no prefix (default locale). */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : '/' + path;
  if (locale === DEFAULT_LOCALE) return clean === '/' ? '/' : clean;
  return `/${locale}${clean === '/' ? '' : clean}`;
}

/**
 * Preserve the current route when switching language.
 *
 *   /features/budget      →  /fr/features/budget
 *   /fr/features/budget   →  /features/budget
 */
export function relocatePath(currentUrl: URL, targetLocale: Locale): string {
  const segments = currentUrl.pathname.split('/').filter(Boolean);
  if ((LOCALES as readonly string[]).includes(segments[0] ?? '')) {
    segments.shift();
  }
  const rest = '/' + segments.join('/');
  return localePath(targetLocale, rest === '/' ? '/' : rest);
}
