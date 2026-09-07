import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import KanapDialog from '../design/KanapDialog';
import type { CatalogUsage } from '../../services/itOpsSettings';

type Props = {
  open: boolean;
  name: string;
  usage: CatalogUsage | null;
  /** The usage check failed: removal is refused and the reason shown instead of the counts. */
  failed?: boolean;
  onRetire: () => void;
  onClose: () => void;
};

/** Shown when a catalog value still has references: the way out is "no longer offered", never an orphaning delete. */
export default function CatalogUsageDialog({ open, name, usage, failed, onRetire, onClose }: Props) {
  const { t } = useTranslation('common');
  return (
    <KanapDialog open={open} title={t('enumEditor.usageTitle')} onClose={onClose} onSave={onRetire} saveLabel={t('enumEditor.noLongerOffered')}>
      <Stack spacing={1.25}>
        <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>{failed ? t('enumEditor.usageFailed') : t('enumEditor.usageIntro', { name })}</Typography>
        <Stack spacing={0.5}>
          {(usage?.usage ?? []).map((item) => (
            <Stack key={item.record} direction="row" spacing={1.5} alignItems="baseline">
              <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>{t(`enumEditor.records.${item.record}`, { count: item.count })}</Typography>
              {item.listPath && <Link component={RouterLink} to={item.listPath} target="_blank" rel="noopener" sx={{ fontSize: 12 }}>{t('enumEditor.usageView')}</Link>}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </KanapDialog>
  );
}
