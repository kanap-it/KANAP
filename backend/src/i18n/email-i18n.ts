import { de } from './email-locales/de';
import { en, type EmailStrings } from './email-locales/en';
import { es } from './email-locales/es';
import { fr } from './email-locales/fr';

const locales = {
  en,
  fr,
  de,
  es,
} as const satisfies Record<string, EmailStrings>;

export type SupportedEmailLocale = keyof typeof locales;

export function resolveEmailLocale(raw: string | null | undefined): SupportedEmailLocale {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
    .split(/[-;,]/)[0]
    .trim();

  if (normalized in locales) {
    return normalized as SupportedEmailLocale;
  }

  return 'en';
}

export function getEmailStrings(locale: string | null | undefined): EmailStrings {
  return locales[resolveEmailLocale(locale)] ?? locales.en;
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''));
}
