import React from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import KanapDialog from '../design/KanapDialog';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import type { CatalogLocale, CatalogTranslations } from '../../services/itOpsSettings';
import { previewCatalogField, type CatalogDefaults, type LocalizableCatalogItem } from '../../utils/catalogLocalization';

export type CatalogTranslationsTarget = {
  item: LocalizableCatalogItem;
  /** The catalog carries a description (classification levels). */
  withDescription?: boolean;
  /** Shipped defaults, so the preview shows the automatic translation of an untouched value. */
  defaults?: CatalogDefaults;
  onSave: (translations: CatalogTranslations | undefined) => void;
};

type Props = { target: CatalogTranslationsTarget | null; onClose: () => void };

/** Drops empty fields and locales; undefined when nothing is left. */
export function compactTranslations(draft: CatalogTranslations): CatalogTranslations | undefined {
  const result: CatalogTranslations = {};
  for (const [locale, entry] of Object.entries(draft) as Array<[CatalogLocale, { label?: string; description?: string }]>) {
    const label = entry?.label?.trim();
    const description = entry?.description?.trim();
    if (!label && !description) continue;
    result[locale] = { ...(label ? { label } : {}), ...(description ? { description } : {}) };
  }
  return Object.keys(result).length ? result : undefined;
}

const fieldSx = { '& input, & textarea': { fontSize: 13 } } as const;

/**
 * Per-value translations. The editable fields are the translations only: the base name and description stay
 * what the tenant typed, so saving here never rewrites them. Each field previews what will be shown when empty.
 */
export default function CatalogTranslationsDialog({ target, onClose }: Props) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = React.useState<CatalogTranslations>({});
  React.useEffect(() => { setDraft(target?.item.translations ? JSON.parse(JSON.stringify(target.item.translations)) : {}); }, [target]);
  if (!target) return null;
  const { item, withDescription, defaults } = target;
  const patch = (locale: CatalogLocale, field: 'label' | 'description', value: string) => setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
  const preview = (locale: CatalogLocale, field: 'label' | 'description') => previewCatalogField(item, locale, field, compactTranslations({ ...draft, [locale]: { ...draft[locale], [field]: '' } }), defaults);
  return (
    <KanapDialog open title={t('enumEditor.translationsTitle', { name: item.label })} onClose={onClose} onSave={() => { target.onSave(compactTranslations(draft)); onClose(); }} saveLabel={t('buttons.save')} sx={{ maxWidth: 620 }}>
      <Stack spacing={2}>
        <Box>
          <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary' }}>{t('enumEditor.baseName')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>{item.label}</Typography>
          {withDescription && item.description && <>
            <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary', mt: 1 }}>{t('enumEditor.baseDescription')}</Typography>
            <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>{item.description}</Typography>
          </>}
        </Box>
        <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary' }}>{t('enumEditor.translationsHelp')}</Typography>
        {SUPPORTED_LANGUAGES.map(({ code, nativeLabel }) => (
          <Stack key={code} spacing={0.75}>
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.secondary' }}>{nativeLabel}</Typography>
            <TextField value={draft[code]?.label ?? ''} onChange={(event) => patch(code, 'label', event.target.value)} size="small" fullWidth sx={fieldSx}
              placeholder={t('enumEditor.shownAs', { value: preview(code, 'label') })} inputProps={{ 'aria-label': `${t('enumEditor.name')} ${nativeLabel}` }} />
            {withDescription && (
              <TextField value={draft[code]?.description ?? ''} onChange={(event) => patch(code, 'description', event.target.value)} size="small" fullWidth multiline minRows={2} sx={fieldSx}
                placeholder={t('enumEditor.shownAs', { value: preview(code, 'description') || '—' })} inputProps={{ 'aria-label': `${t('enumEditor.description')} ${nativeLabel}` }} />
            )}
          </Stack>
        ))}
      </Stack>
    </KanapDialog>
  );
}

/** Opens the translations dialog for one value; `dialog` must be rendered by the caller. */
export function useCatalogTranslations() {
  const [target, setTarget] = React.useState<CatalogTranslationsTarget | null>(null);
  const dialog = target ? <div onSubmit={(event) => event.stopPropagation()}><CatalogTranslationsDialog target={target} onClose={() => setTarget(null)} /></div> : null;
  return { openTranslations: setTarget, dialog };
}
