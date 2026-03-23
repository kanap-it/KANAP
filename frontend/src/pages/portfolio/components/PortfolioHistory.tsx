import React from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { contentToPlainText } from '../../../utils/contentToPlainText';
import {
  getDecisionOutcomeLabel,
  getFeasibilityStatusLabel,
} from '../../../utils/portfolioI18n';

interface Activity {
  id: string;
  type: 'comment' | 'change' | 'decision';
  content: string | null;
  context: string | null;
  decision_outcome: string | null;
  changed_fields?: Record<string, [unknown, unknown]>;
  author_id: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface PortfolioHistoryProps {
  entityType: 'request' | 'project';
  activities: Activity[];
}

// Labels for common field names
const FIELD_LABEL_KEYS: Record<string, string> = {
  name: 'name',
  purpose: 'purpose',
  status: 'status',
  current_situation: 'currentSituation',
  expected_benefits: 'expectedBenefits',
  risks: 'risks',
  feasibility_review: 'feasibilityReview',
  source_id: 'source',
  category_id: 'category',
  stream_id: 'stream',
  requestor_id: 'requestor',
  target_delivery_date: 'targetDeliveryDate',
  origin_task_id: 'originTask',
  company_id: 'company',
  department_id: 'department',
  business_sponsor_id: 'businessSponsor',
  business_lead_id: 'businessLead',
  it_sponsor_id: 'itSponsor',
  it_lead_id: 'itLead',
  planned_start: 'plannedStart',
  planned_end: 'plannedEnd',
  estimated_effort_it: 'estimatedEffortIt',
  estimated_effort_business: 'estimatedEffortBusiness',
  actual_effort_it: 'actualEffortIt',
  actual_effort_business: 'actualEffortBusiness',
  execution_progress: 'progress',
  priority_score: 'priorityScore',
  priority_override: 'priorityOverride',
  override_value: 'overrideValue',
  override_justification: 'overrideJustification',
  business_team: 'businessTeam',
  it_team: 'itTeam',
  dependency: 'dependency',
  applications: 'applications',
  assets: 'assets',
  capex_items: 'capexItems',
  opex_items: 'opexItems',
  phase: 'phase',
  task_created: 'taskCreated',
  created_from_task: 'createdFromTask',
  converted_to_request: 'convertedToRequest',
  it_effort_allocation_mode: 'itEffortAllocationMode',
  business_effort_allocation_mode: 'businessEffortAllocationMode',
};

const humanize = (field: string) =>
  field
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());

const toCommentPreview = (value: string, maxLen = 180): string => {
  const text = contentToPlainText(value);
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.substring(0, maxLen)}...`;
};

export default function PortfolioHistory({
  entityType,
  activities,
}: PortfolioHistoryProps) {
  const { t } = useTranslation('portfolio');
  const formatFeasibilitySummary = (value: unknown): string => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return t('activity.history.values.notSet');
    }
    const raw = value as Record<string, any>;
    const parts: string[] = [];

    const dimensionLabels = {
      technical_feasibility: t('activity.history.feasibilityDimensions.technicalFeasibility'),
      integration_compatibility: t('activity.history.feasibilityDimensions.integrationCompatibility'),
      infrastructure_needs: t('activity.history.feasibilityDimensions.infrastructureNeeds'),
      security_compliance: t('activity.history.feasibilityDimensions.securityCompliance'),
      resource_skills: t('activity.history.feasibilityDimensions.resourceSkills'),
      delivery_constraints: t('activity.history.feasibilityDimensions.deliveryConstraints'),
      change_management: t('activity.history.feasibilityDimensions.changeManagement'),
    };

    for (const [key, label] of Object.entries(dimensionLabels)) {
      const status = String(raw?.[key]?.status || '').trim();
      if (!status || status === 'not_assessed') continue;
      parts.push(`${label}: ${getFeasibilityStatusLabel(t, status)}`);
    }

    if (parts.length === 0) return t('activity.history.values.allDimensionsNotAssessed');
    if (parts.length <= 2) return parts.join('; ');
    return t('activity.history.values.dimensionsAssessed', { count: parts.length });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFieldValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return t('activity.history.values.empty');
    if (typeof value === 'boolean') return value ? t('activity.history.values.yes') : t('activity.history.values.no');
    if (Array.isArray(value)) {
      if (value.length === 0) return t('activity.history.values.empty');
      return value.map((entry) => String(entry)).join(', ');
    }
    if (field === 'feasibility_review') {
      return formatFeasibilitySummary(value);
    }
    if (field.endsWith('_date') || field === 'planned_start' || field === 'planned_end') {
      return value ? new Date(String(value)).toLocaleDateString('en-GB') : t('activity.history.values.none');
    }
    // For rich text content, show truncated plain-text preview
    if (typeof value === 'string') {
      const textOnly = contentToPlainText(value);
      if (textOnly.length > 50) {
        return textOnly.substring(0, 50) + '...';
      }
      return textOnly || t('activity.history.values.empty');
    }
    return String(value);
  };

  const formatFieldLabel = (field: string): string => {
    if (field.startsWith('phase.')) {
      const parts = field.split('.');
      if (parts.length >= 3) {
        const phaseIdOrName = parts[1];
        const phaseField = parts.slice(2).join('.');
        if (phaseIdOrName.length >= 8 && phaseIdOrName.includes('-')) {
          return t('activity.history.fields.phaseWithId', {
            phase: phaseIdOrName.slice(0, 8),
            field: humanize(phaseField),
          });
        }
        return t('activity.history.fields.phaseWithName', {
          phase: phaseIdOrName,
          field: humanize(phaseField),
        });
      }
    }
    const key = FIELD_LABEL_KEYS[field];
    return key ? t(`activity.history.fields.${key}`) : humanize(field);
  };

  const getActivityDescription = (activity: Activity): React.ReactNode => {
    if (activity.type === 'comment') {
      return t('activity.history.actions.addedComment');
    }
    if (activity.type === 'decision') {
      const outcomeLabel = activity.decision_outcome
        ? getDecisionOutcomeLabel(t, activity.decision_outcome)
        : '';
      return outcomeLabel
        ? t('activity.history.actions.decisionWithOutcome', { outcome: outcomeLabel })
        : t('activity.labels.decision');
    }
    if (activity.type === 'change' && activity.changed_fields) {
      const entries = Object.entries(activity.changed_fields);
      if (entries.length === 1) {
        const [field, [oldVal, newVal]] = entries[0];
        const fieldLabel = formatFieldLabel(field);
        if ((oldVal === null || oldVal === undefined) && (newVal !== null && newVal !== undefined)) {
          return t('activity.history.actions.addedField', {
            field: fieldLabel,
            value: formatFieldValue(field, newVal),
          });
        }
        if ((oldVal !== null && oldVal !== undefined) && (newVal === null || newVal === undefined)) {
          return t('activity.history.actions.removedField', {
            field: fieldLabel,
            value: formatFieldValue(field, oldVal),
          });
        }
        return t('activity.history.actions.changedField', {
          field: fieldLabel,
          from: formatFieldValue(field, oldVal),
          to: formatFieldValue(field, newVal),
        });
      }
      return t('activity.history.actions.updatedMultiple', {
        changes: entries.map(([field, [oldVal, newVal]]) => {
        const label = formatFieldLabel(field);
        if ((oldVal === null || oldVal === undefined) && (newVal !== null && newVal !== undefined)) {
          return t('activity.history.actions.addedField', {
            field: label,
            value: formatFieldValue(field, newVal),
          });
        }
        if ((oldVal !== null && oldVal !== undefined) && (newVal === null || newVal === undefined)) {
          return t('activity.history.actions.removedField', {
            field: label,
            value: formatFieldValue(field, oldVal),
          });
        }
        return t('activity.history.actions.changedField', {
          field: label,
          from: formatFieldValue(field, oldVal),
          to: formatFieldValue(field, newVal),
        });
      }).join(' | '),
      });
    }
    return t('activity.history.actions.recorded');
  };

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'comment':
        return 'primary.main';
      case 'change':
        return 'grey.400';
      case 'decision':
        return 'warning.main';
      default:
        return 'grey.400';
    }
  };

  if (activities.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        {t('activity.messages.noHistory')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {activities.map((activity) => (
        <Box
          key={activity.id}
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
            borderLeft: 3,
            borderColor: getActivityColor(activity.type),
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              label={
                activity.type === 'comment'
                  ? t('activity.labels.comment')
                  : activity.type === 'change'
                  ? t('activity.labels.change')
                  : t('activity.labels.decision')
              }
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {getActivityDescription(activity)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {`${activity.first_name || ''} ${activity.last_name || ''}`.trim() || t('activity.authorUnknown')} &bull;{' '}
              {formatTime(activity.created_at)}
            </Typography>
          </Stack>
          {activity.type === 'decision' && activity.context && (
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ display: 'block', mt: 0.5 }}
            >
              {activity.context}
            </Typography>
          )}
          {activity.type === 'comment' && activity.content && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                pl: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {toCommentPreview(activity.content)}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}
