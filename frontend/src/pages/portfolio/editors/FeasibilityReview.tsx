import React from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

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

const STATUS_LABELS: Record<FeasibilityReviewStatus, string> = {
  not_assessed: 'Not assessed',
  no_concerns: 'No concerns',
  minor_concerns: 'Minor concerns',
  major_concerns: 'Major concerns',
  blocker: 'Blocker',
};

const STATUS_ACCENT_STYLE: Record<FeasibilityReviewStatus, { border: string; selectBorder: string }> = {
  not_assessed: { border: 'grey.300', selectBorder: 'grey.400' },
  no_concerns: { border: 'success.main', selectBorder: 'success.main' },
  minor_concerns: { border: 'warning.light', selectBorder: 'warning.main' },
  major_concerns: { border: 'warning.main', selectBorder: 'warning.dark' },
  blocker: { border: 'error.main', selectBorder: 'error.main' },
};

const COMMENT_FIELD_SX = {
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
  },
};

const DIMENSIONS: Array<{ key: FeasibilityReviewKey; label: string; description: string }> = [
  {
    key: 'technical_feasibility',
    label: 'Technical Feasibility',
    description: 'Is the proposed approach technically sound? Are the technologies proven and viable?',
  },
  {
    key: 'integration_compatibility',
    label: 'Integration & Compatibility',
    description: 'Interfaces, data flows, and dependencies with existing systems. Landscape fit and architectural coherence.',
  },
  {
    key: 'infrastructure_needs',
    label: 'Infrastructure Needs',
    description: 'Platform, network, hosting, and operations requirements.',
  },
  {
    key: 'security_compliance',
    label: 'Security & Compliance',
    description: 'Security posture impacts, legal obligations, and control requirements.',
  },
  {
    key: 'resource_skills',
    label: 'Resource & Skills',
    description: 'Capacity, ownership, expertise, and vendor availability.',
  },
  {
    key: 'delivery_constraints',
    label: 'Delivery Constraints',
    description: 'External dependencies, windows, lead times, and sequencing constraints.',
  },
  {
    key: 'change_management',
    label: 'Change Management',
    description: 'Adoption, communication, process changes, and training implications.',
  },
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
  for (const dim of DIMENSIONS) {
    const raw = value[dim.key];
    if (!isObject(raw)) continue;

    const rawStatus = String(raw.status || '').trim().toLowerCase();
    const status = FEASIBILITY_STATUSES.includes(rawStatus as FeasibilityReviewStatus)
      ? rawStatus as FeasibilityReviewStatus
      : 'not_assessed';
    const comment = String(raw.comment ?? '');
    normalized[dim.key] = { status, comment };
  }

  return normalized;
}

const getFocusHint = (categoryName?: string, streamName?: string): string => {
  const category = (categoryName || '').toLowerCase();
  const stream = (streamName || '').toLowerCase();

  if (
    category.includes('infrastructure') ||
    stream.includes('network') ||
    stream.includes('cloud') ||
    stream.includes('virtual') ||
    stream.includes('storage') ||
    stream.includes('database')
  ) {
    return 'Focus on resilience, capacity, change windows, rollback readiness, and support model fit.';
  }

  if (
    category.includes('business applications') ||
    stream.includes('sap') ||
    stream.includes('crm') ||
    stream.includes('erp') ||
    stream.includes('reporting')
  ) {
    return 'Focus on business-process fit, data quality/migration impact, integrations, and user adoption readiness.';
  }

  if (
    category.includes('security') ||
    stream.includes('security') ||
    stream.includes('compliance') ||
    stream.includes('risk')
  ) {
    return 'Focus on threat reduction, control coverage, regulatory urgency, and residual risk acceptance.';
  }

  return 'Keep comments short and concrete: key concern, impact, and required action.';
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
  const normalized = React.useMemo(() => normalizeFeasibilityReviewValue(value), [value]);
  const [expandedRows, setExpandedRows] = React.useState<Record<FeasibilityReviewKey, boolean>>({
    technical_feasibility: false,
    integration_compatibility: false,
    infrastructure_needs: false,
    security_compliance: false,
    resource_skills: false,
    delivery_constraints: false,
    change_management: false,
  });

  const setDimensionStatus = (key: FeasibilityReviewKey, status: FeasibilityReviewStatus) => {
    onChange({
      ...normalized,
      [key]: {
        ...normalized[key],
        status,
      },
    });
  };

  const toggleExpanded = (key: FeasibilityReviewKey) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
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
        {getFocusHint(categoryName, streamName)}
      </Typography>

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: '36%' }}>Dimension</TableCell>
              <TableCell sx={{ width: '18%' }}>Status</TableCell>
              <TableCell sx={{ width: '46%' }}>Comment</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DIMENSIONS.map((dim) => {
              const current = normalized[dim.key];
              const accent = STATUS_ACCENT_STYLE[current.status];
              const isExpanded = expandedRows[dim.key];
              return (
                <React.Fragment key={dim.key}>
                  <TableRow
                    hover
                    sx={{
                      '& > td:first-of-type': {
                        borderLeft: 4,
                        borderLeftColor: accent.border,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dim.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dim.description}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => toggleExpanded(dim.key)}
                          sx={{ px: 0 }}
                        >
                          {isExpanded ? 'Hide detailed notes' : 'Detailed notes'}
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={current.status}
                          label="Status"
                          disabled={disabled}
                          onChange={(e) => setDimensionStatus(dim.key, e.target.value as FeasibilityReviewStatus)}
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: accent.selectBorder,
                            },
                          }}
                        >
                          {FEASIBILITY_STATUSES.map((status) => (
                            <MenuItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        maxRows={4}
                        value={current.comment}
                        placeholder="Key note, blocker, or next action"
                        onChange={(e) => setDimensionComment(dim.key, e.target.value)}
                        disabled={disabled}
                        sx={COMMENT_FIELD_SX}
                      />
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ bgcolor: 'action.hover' }}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={4}
                          maxRows={12}
                          value={current.comment}
                          placeholder={`Detailed notes for ${dim.label}`}
                          onChange={(e) => setDimensionComment(dim.key, e.target.value)}
                          disabled={disabled}
                          sx={COMMENT_FIELD_SX}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
