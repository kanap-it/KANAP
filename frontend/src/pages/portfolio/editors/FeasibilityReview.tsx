import React from 'react';
import {
  Box,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import { useTranslation } from 'react-i18next';
import { getFeasibilityStatusLabel } from '../../../utils/portfolioI18n';

export type FeasibilityReviewStatus =
  | 'not_assessed'
  | 'no_concerns'
  | 'minor_concerns'
  | 'major_concerns'
  | 'blocker';

export type FeasibilityReviewKey =
  | 'technical_feasibility'
  | 'integration_compatibility'
  | 'infrastructure_needs'
  | 'security_compliance'
  | 'resource_skills'
  | 'delivery_constraints'
  | 'change_management';

export type FeasibilityReviewEntry = {
  status: FeasibilityReviewStatus;
  comment: string;
};

export type FeasibilityReviewValue = Record<FeasibilityReviewKey, FeasibilityReviewEntry>;

const FEASIBILITY_STATUSES: FeasibilityReviewStatus[] = [
  'not_assessed',
  'no_concerns',
  'minor_concerns',
  'major_concerns',
  'blocker',
];

const STATUS_ACCENT_STYLE: Record<FeasibilityReviewStatus, { border: string; selectBorder: string }> = {
  not_assessed: { border: 'grey.300', selectBorder: 'grey.400' },
  no_concerns: { border: 'success.main', selectBorder: 'success.main' },
  minor_concerns: { border: 'warning.light', selectBorder: 'warning.main' },
  major_concerns: { border: 'warning.main', selectBorder: 'warning.dark' },
  blocker: { border: 'error.main', selectBorder: 'error.main' },
};

const DIMENSIONS: FeasibilityReviewKey[] = [
  'technical_feasibility',
  'integration_compatibility',
  'infrastructure_needs',
  'security_compliance',
  'resource_skills',
  'delivery_constraints',
  'change_management',
];

const EMPTY_REVIEW: FeasibilityReviewValue = {
  technical_feasibility: { status: 'not_assessed', comment: '' },
  integration_compatibility: { status: 'not_assessed', comment: '' },
  infrastructure_needs: { status: 'not_assessed', comment: '' },
  security_compliance: { status: 'not_assessed', comment: '' },
  resource_skills: { status: 'not_assessed', comment: '' },
  delivery_constraints: { status: 'not_assessed', comment: '' },
  change_management: { status: 'not_assessed', comment: '' },
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function normalizeFeasibilityReviewValue(value: unknown): FeasibilityReviewValue {
  if (!isObject(value)) return { ...EMPTY_REVIEW };

  const normalized = { ...EMPTY_REVIEW };
  for (const key of DIMENSIONS) {
    const raw = value[key];
    if (!isObject(raw)) continue;

    const rawStatus = String(raw.status || '').trim().toLowerCase();
    const status = FEASIBILITY_STATUSES.includes(rawStatus as FeasibilityReviewStatus)
      ? rawStatus as FeasibilityReviewStatus
      : 'not_assessed';
    const comment = String(raw.comment ?? '');
    normalized[key] = { status, comment };
  }

  return normalized;
}

const getFocusHintKey = (categoryName?: string, streamName?: string) => {
  const category = (categoryName || '').toLowerCase();
  const stream = (streamName || '').toLowerCase();

  if (
    category.includes('infrastructure')
    || stream.includes('network')
    || stream.includes('cloud')
    || stream.includes('virtual')
    || stream.includes('storage')
    || stream.includes('database')
  ) {
    return 'infrastructure';
  }

  if (
    category.includes('business applications')
    || stream.includes('sap')
    || stream.includes('crm')
    || stream.includes('erp')
    || stream.includes('reporting')
  ) {
    return 'businessApplications';
  }

  if (
    category.includes('security')
    || stream.includes('security')
    || stream.includes('compliance')
    || stream.includes('risk')
  ) {
    return 'security';
  }

  return 'default';
};

interface FeasibilityReviewProps {
  value: unknown;
  onChange: (next: FeasibilityReviewValue) => void;
  disabled?: boolean;
  categoryName?: string;
  streamName?: string;
}

export default function FeasibilityReview({
  value,
  onChange,
  disabled = false,
  categoryName,
  streamName,
}: FeasibilityReviewProps) {
  const { t } = useTranslation('portfolio');
  const normalized = React.useMemo(() => normalizeFeasibilityReviewValue(value), [value]);

  const setDimensionStatus = (key: FeasibilityReviewKey, status: FeasibilityReviewStatus) => {
    onChange({
      ...normalized,
      [key]: {
        ...normalized[key],
        status,
      },
    });
  };

  const setDimensionComment = (key: FeasibilityReviewKey, comment: string) => {
    onChange({
      ...normalized,
      [key]: {
        ...normalized[key],
        comment,
      },
    });
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        {t(`editors.feasibility.hints.${getFocusHintKey(categoryName, streamName)}`)}
      </Typography>

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: '36%' }}>{t('editors.feasibility.columns.dimension')}</TableCell>
              <TableCell sx={{ width: '18%' }}>{t('editors.feasibility.columns.status')}</TableCell>
              <TableCell sx={{ width: '46%' }}>{t('editors.feasibility.columns.comment')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DIMENSIONS.map((key) => {
              const current = normalized[key];
              const accent = STATUS_ACCENT_STYLE[current.status];
              const label = t(`editors.feasibility.dimensions.${key}.label`);
              return (
                <TableRow
                  key={key}
                  hover
                  sx={{
                    '& > td:first-of-type': {
                      borderLeft: 4,
                      borderLeftColor: accent.border,
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t(`editors.feasibility.dimensions.${key}.description`)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={current.status}
                      disabled={disabled}
                      onChange={(event) => setDimensionStatus(key, event.target.value as FeasibilityReviewStatus)}
                      variant="standard"
                      fullWidth
                      sx={{
                        fontSize: '0.875rem',
                        '&:before': { borderBottomColor: accent.selectBorder },
                        '&:after': { borderBottomColor: accent.selectBorder },
                      }}
                    >
                      {FEASIBILITY_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {getFeasibilityStatusLabel(t, status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Box
                      component={TextareaAutosize}
                      minRows={4}
                      maxRows={4}
                      value={current.comment}
                      placeholder={t('editors.feasibility.placeholders.comment')}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDimensionComment(key, event.target.value)}
                      disabled={disabled}
                      sx={{
                        display: 'block',
                        width: '100%',
                        m: 0,
                        p: '0 0 2px',
                        resize: 'none',
                        border: 0,
                        borderBottom: 1,
                        borderColor: 'divider',
                        outline: 0,
                        bgcolor: 'transparent',
                        color: 'text.primary',
                        font: 'inherit',
                        fontSize: '0.875rem',
                        lineHeight: 1.45,
                        overflowY: 'auto !important',
                        '&:focus': {
                          borderColor: 'primary.main',
                        },
                        '&::placeholder': {
                          color: 'text.disabled',
                          opacity: 1,
                        },
                        '&:disabled': {
                          color: 'text.disabled',
                          WebkitTextFillColor: 'currentColor',
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
