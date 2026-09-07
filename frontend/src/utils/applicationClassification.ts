import i18n from '../i18n';
import type { ApplicationClassificationCatalog, CatalogLocale } from '../services/itOpsSettings';
import { localizeCatalogList, toCatalogLocale, type CatalogDefaults, type LocalizableCatalogItem } from './catalogLocalization';

type DefaultClassificationCopy = { label: string; description: string };
type ClassificationAxis = 'businessCriticalityLevels' | 'cyberCriticalityLevels' | 'dataClasses' | 'recoveryWaves';

const DEFAULT_CLASSIFICATION_COPY: Record<ClassificationAxis, Record<string, DefaultClassificationCopy>> = {
  businessCriticalityLevels: {
    business_critical: { label: 'Critical', description: 'The activity tolerates at most four hours of interruption.' },
    high: { label: 'High', description: 'The activity tolerates more than four hours, up to one day of interruption.' },
    medium: { label: 'Moderate', description: 'The activity tolerates more than one day, up to three days of interruption.' },
    low: { label: 'Low', description: 'The activity tolerates more than three days of interruption.' },
  },
  cyberCriticalityLevels: {
    low: { label: 'Low', description: 'Limited, local consequences of a compromise.' },
    moderate: { label: 'Moderate', description: 'Significant but contained harm.' },
    high: { label: 'High', description: 'Major harm to data, an important activity or several systems.' },
    critical: { label: 'Critical', description: 'Catastrophic consequences, serious harm to people or the environment, or widespread compromise of information systems.' },
  },
  dataClasses: {
    public: { label: 'Public', description: 'Information approved for public disclosure.' },
    internal: { label: 'Internal', description: 'Information intended for internal use; disclosure has limited consequences.' },
    confidential: { label: 'Confidential', description: 'Disclosure could cause significant harm; access is limited to authorised recipients.' },
    restricted: { label: 'Restricted', description: 'Disclosure could cause severe harm; access is strictly limited to those who need it.' },
  },
  recoveryWaves: {
    foundation: { label: 'V0 — Foundation', description: 'Shared prerequisites and foundation services.' },
    vital: { label: 'V1 — Vital activities', description: 'Restore vital activities after their prerequisites.' },
    priority: { label: 'V2 — Priority activities', description: 'Restore priority activities.' },
    normal: { label: 'V3 — Normal operation', description: 'Return to normal operation.' },
  },
};

function translatedDefault(axis: ClassificationAxis, code: string, source: DefaultClassificationCopy, locale: string = toCatalogLocale(i18n.resolvedLanguage || i18n.language)): DefaultClassificationCopy {
  const value = i18n.getResource(locale, 'classification-catalog', `${axis}.${code}`) as Partial<DefaultClassificationCopy> | undefined;
  return value && typeof value.label === 'string' && typeof value.description === 'string'
    ? value as DefaultClassificationCopy
    : source;
}

/** Shipped defaults of a classification axis, for the field-by-field display projection; undefined for other catalogs. */
export function classificationDefaults(axis: string): CatalogDefaults | undefined {
  const source = DEFAULT_CLASSIFICATION_COPY[axis as ClassificationAxis];
  if (!source) return undefined;
  return { source, translated: (locale, code) => source[code] ? translatedDefault(axis as ClassificationAxis, code, source[code], locale) : undefined };
}

/** Display projection of the classification catalog: tenant translations, shipped translations for untouched defaults, base text. */
export function localizeApplicationClassificationCatalog(catalog: ApplicationClassificationCatalog, locale: CatalogLocale = toCatalogLocale(i18n.resolvedLanguage || i18n.language)): ApplicationClassificationCatalog {
  const next = { ...catalog };
  (Object.keys(DEFAULT_CLASSIFICATION_COPY) as ClassificationAxis[]).forEach((axis) => {
    (next as unknown as Record<ClassificationAxis, unknown>)[axis] = localizeCatalogList(catalog[axis] as LocalizableCatalogItem[], locale, classificationDefaults(axis));
  });
  return next;
}

export function classificationText(source: string): string {
  const key = source.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return String(i18n.t(`it:classification.${key}`, { defaultValue: source }));
}
