import React from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { RichTextContent } from '../../../components/RichTextContent';

const DECISION_OUTCOME_LABELS: Record<string, string> = {
  go: 'Go',
  no_go: 'No-Go',
  defer: 'Defer',
  need_info: 'Need Info',
  analysis_complete: 'Analysis Complete',
};

const FEASIBILITY_STATUS_LABELS: Record<string, string> = {
  not_assessed: 'Not assessed',
  no_concerns: 'No concerns',
  minor_concerns: 'Minor concerns',
  major_concerns: 'Major concerns',
  blocker: 'Blocker',
};

const FEASIBILITY_DIMENSION_LABELS: Record<string, string> = {
  technical_feasibility: 'Technical Feasibility',
  integration_compatibility: 'Integration & Compatibility',
  infrastructure_needs: 'Infrastructure Needs',
  security_compliance: 'Security & Compliance',
  resource_skills: 'Resource & Skills',
  delivery_constraints: 'Delivery Constraints',
  change_management: 'Change Management',
};

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
const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  purpose: 'Purpose',
  status: 'Status',
  current_situation: 'Current Situation',
  expected_benefits: 'Expected Benefits',
  risks: 'Risks',
  feasibility_review: 'Feasibility Review',
  source_id: 'Source',
  category_id: 'Category',
  stream_id: 'Stream',
  requestor_id: 'Requestor',
  target_delivery_date: 'Target Delivery Date',
  company_id: 'Company',
  department_id: 'Department',
  business_sponsor_id: 'Business Sponsor',
  business_lead_id: 'Business Lead',
  it_sponsor_id: 'IT Sponsor',
  it_lead_id: 'IT Lead',
  planned_start: 'Planned Start',
  planned_end: 'Planned End',
  estimated_effort_it: 'IT Effort',
  estimated_effort_business: 'Business Effort',
  execution_progress: 'Progress',
  priority_score: 'Priority Score',
};

export default function PortfolioHistory({
  entityType,
  activities,
}: PortfolioHistoryProps) {
  const formatFeasibilitySummary = (value: unknown): string => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '(not set)';
    const raw = value as Record<string, any>;
    const parts: string[] = [];

    for (const [key, label] of Object.entries(FEASIBILITY_DIMENSION_LABELS)) {
      const status = String(raw?.[key]?.status || '').trim();
      if (!status || status === 'not_assessed') continue;
      parts.push(`${label}: ${FEASIBILITY_STATUS_LABELS[status] || status}`);
    }

    if (parts.length === 0) return 'All dimensions not assessed';
    if (parts.length <= 2) return parts.join('; ');
    return `${parts.length} dimensions assessed`;
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
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (field === 'feasibility_review') {
      return formatFeasibilitySummary(value);
    }
    if (field.endsWith('_date') || field === 'planned_start' || field === 'planned_end') {
      return value ? new Date(String(value)).toLocaleDateString('en-GB') : '(none)';
    }
    // For long HTML content, show truncated preview
    if (typeof value === 'string' && value.startsWith('<')) {
      const textOnly = value.replace(/<[^>]*>/g, '').trim();
      if (textOnly.length > 50) {
        return textOnly.substring(0, 50) + '...';
      }
      return textOnly || '(empty)';
    }
    return String(value);
  };

  const getActivityDescription = (activity: Activity): React.ReactNode => {
    if (activity.type === 'comment') {
      return 'Added a comment';
    }
    if (activity.type === 'decision') {
      const outcomeLabel = activity.decision_outcome
        ? DECISION_OUTCOME_LABELS[activity.decision_outcome] || activity.decision_outcome
        : '';
      return (
        <>
          Decision{outcomeLabel && `: ${outcomeLabel}`}
        </>
      );
    }
    if (activity.type === 'change' && activity.changed_fields) {
      const fields = Object.keys(activity.changed_fields);
      if (fields.length === 1) {
        const field = fields[0];
        const [oldVal, newVal] = activity.changed_fields[field];
        const fieldLabel = FIELD_LABELS[field] || field.replace(/_/g, ' ');
        return (
          <>
            {fieldLabel}: {formatFieldValue(field, oldVal)} &rarr;{' '}
            {formatFieldValue(field, newVal)}
          </>
        );
      }
      // Multiple fields changed
      const analysisFields = ['current_situation', 'expected_benefits', 'risks', 'purpose', 'feasibility_review'];
      const isAnalysisUpdate = fields.every((f) => analysisFields.includes(f));
      if (isAnalysisUpdate) {
        const labels = fields.map((f) => FIELD_LABELS[f] || f.replace(/_/g, ' '));
        return `Analysis updated: ${labels.join(', ')}`;
      }
      const labels = fields.map((f) => FIELD_LABELS[f] || f.replace(/_/g, ' '));
      return `Updated: ${labels.join(', ')}`;
    }
    return 'Activity recorded';
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
        No history recorded yet.
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
                  ? 'Comment'
                  : activity.type === 'change'
                  ? 'Change'
                  : 'Decision'
              }
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {getActivityDescription(activity)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {activity.first_name || ''} {activity.last_name || ''} &bull;{' '}
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
            <Box
              sx={{
                mt: 0.5,
                pl: 1,
                maxHeight: 60,
                overflow: 'hidden',
              }}
            >
              <RichTextContent content={activity.content} variant="compact" />
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
