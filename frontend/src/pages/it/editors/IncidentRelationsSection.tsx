import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import type { IncidentRow } from '../../../api/endpoints/incidents';
import { StatusDot } from '../../../components/design';
import { MONO_FONT_FAMILY } from '../../../config/ThemeContext';
import { formatShortDate } from '../../../lib/dateFormat';
import { buildItemPath, formatItemRef } from '../../../utils/item-ref';
import { getDotColor, INCIDENT_SEVERITY_COLORS } from '../../../utils/statusColors';

type Props = {
  assetId?: string;
  applicationId?: string;
};

const headerSx = {
  fontSize: 12,
  fontWeight: 500,
  color: 'kanap.text.tertiary',
  textAlign: 'left',
  pb: 1,
} as const;

const cellSx = {
  fontSize: 13,
  color: 'kanap.text.primary',
  py: '8px',
  verticalAlign: 'top',
} as const;

const refLinkSx = {
  fontFamily: MONO_FONT_FAMILY,
  fontSize: 12,
  color: 'kanap.text.secondary',
  fontVariantNumeric: 'tabular-nums',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
} as const;

/**
 * Read-only "Incidents" section for the Asset / Application relations tabs.
 * Linking is done from the incident side only; this section just surfaces them.
 */
export default function IncidentRelationsSection({ assetId, applicationId }: Props) {
  const { t, i18n } = useTranslation('it');
  const theme = useTheme();
  const params = assetId ? { asset_id: assetId } : { application_id: applicationId };

  const { data: items = [], isError } = useQuery({
    queryKey: ['incidents', 'linked', assetId || applicationId],
    queryFn: async () => {
      const res = await api.get<{ items: IncidentRow[] }>('/incidents', {
        params: { ...params, limit: 20, sort: 'detected_at:DESC' },
      });
      return res.data.items || [];
    },
    enabled: !!(assetId || applicationId),
  });

  return (
    <Box>
      <Typography component="h2" sx={{ m: 0, mb: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'kanap.text.primary' }}>
        {t('components.incidentRelations.title')}
      </Typography>
      {isError ? (
        <Typography sx={{ fontSize: 13, color: 'kanap.text.tertiary' }}>{t('components.incidentRelations.loadFailed')}</Typography>
      ) : items.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'kanap.text.tertiary' }}>{t('components.incidentRelations.empty')}</Typography>
      ) : (
        <Box
          component="table"
          sx={{
            width: '100%',
            maxWidth: 640,
            borderCollapse: 'collapse',
            '& th': { ...headerSx, borderBottom: `1px solid ${theme.palette.kanap.border.default}` },
            '& td': { ...cellSx, borderBottom: `1px solid ${theme.palette.kanap.border.soft}` },
            '& tbody tr:hover': { backgroundColor: theme.palette.kanap.bg.hover },
          }}
        >
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ width: 72 }}>{t('components.incidentRelations.columns.reference')}</Box>
              <Box component="th">{t('components.incidentRelations.columns.title')}</Box>
              <Box component="th" sx={{ width: 96 }}>{t('components.incidentRelations.columns.severity')}</Box>
              <Box component="th" sx={{ width: 96 }}>{t('components.incidentRelations.columns.status')}</Box>
              <Box component="th" sx={{ width: 96 }}>{t('components.incidentRelations.columns.detected')}</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {items.map((row) => {
              const ref = formatItemRef('incident', row.item_number);
              return (
                <Box component="tr" key={row.id}>
                  <Box component="td">
                    <Box component={RouterLink} to={`${buildItemPath('incident', ref)}/overview`} sx={refLinkSx}>{ref}</Box>
                  </Box>
                  <Box component="td" sx={{ overflowWrap: 'anywhere' }}>{row.title}</Box>
                  <Box component="td">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <StatusDot color={getDotColor(INCIDENT_SEVERITY_COLORS[row.severity] || 'default', theme.palette.mode)} />
                      {t(`enums.incidentSeverity.${row.severity}`, { defaultValue: row.severity })}
                    </Box>
                  </Box>
                  <Box component="td" sx={{ color: 'kanap.text.secondary' }}>
                    {t(`enums.incidentStatus.${row.status}`, { defaultValue: row.status })}
                  </Box>
                  <Box component="td" sx={{ color: 'kanap.text.secondary', whiteSpace: 'nowrap' }}>
                    {formatShortDate(row.detected_at, i18n.language)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
