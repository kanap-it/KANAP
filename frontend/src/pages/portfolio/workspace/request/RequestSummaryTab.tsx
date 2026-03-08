import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../../../api';
import IntegratedDocumentEditor, { IntegratedDocumentEditorHandle } from '../../../../components/IntegratedDocumentEditor';
import { normalizeFeasibilityReviewValue } from '../../editors/FeasibilityReview';

type SummaryTabKey = 'activity' | 'analysis' | 'knowledge';

type RecommendationColor = 'default' | 'success' | 'error' | 'warning' | 'info';
type StatusColor = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info';

type RequestSummaryTabProps = {
  canEditManagedDocs: boolean;
  form: any;
  id: string;
  isCreate: boolean;
  latestAnalysisRecommendation: any;
  latestRecommendationAuthor: string;
  latestRecommendationCreatedAt: string;
  latestRecommendationOutcome: string | null;
  latestRecommendationOutcomeColor: RecommendationColor;
  latestRecommendationStatusChange: [unknown, unknown] | undefined;
  onOpenTab: (tab: SummaryTabKey) => void;
  onPurposeDirtyChange: (dirty: boolean) => void;
  onPurposeDraftChange: (value: string) => void;
  purposeEditorRef: React.RefObject<IntegratedDocumentEditorHandle>;
  statusColor: StatusColor;
  statusLabel: string;
};

type KnowledgeContextItem = {
  id: string;
  updated_at: string | null;
  created_at: string | null;
};

type KnowledgeContextGroup = {
  key: string;
  total: number;
  items: KnowledgeContextItem[];
};

type KnowledgeContextResponse = {
  groups: KnowledgeContextGroup[];
};

const FEASIBILITY_STATUS_LABELS: Record<string, string> = {
  blocker: 'Blocker',
  major_concerns: 'Major concerns',
  minor_concerns: 'Minor concerns',
  no_concerns: 'No concerns',
  not_assessed: 'Not assessed',
};

const FEASIBILITY_STATUS_COLORS: Record<string, RecommendationColor> = {
  blocker: 'error',
  major_concerns: 'warning',
  minor_concerns: 'warning',
  no_concerns: 'success',
  not_assessed: 'default',
};

const FEASIBILITY_STATUS_ORDER = [
  'blocker',
  'major_concerns',
  'minor_concerns',
  'no_concerns',
  'not_assessed',
] as const;

function SummaryCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Stack spacing={1.5} sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RequestSummaryTab({
  canEditManagedDocs,
  form,
  id,
  isCreate,
  latestAnalysisRecommendation,
  latestRecommendationAuthor,
  latestRecommendationCreatedAt,
  latestRecommendationOutcome,
  latestRecommendationOutcomeColor,
  latestRecommendationStatusChange,
  onOpenTab,
  onPurposeDirtyChange,
  onPurposeDraftChange,
  purposeEditorRef,
  statusColor,
  statusLabel,
}: RequestSummaryTabProps) {
  const [purposeExpanded, setPurposeExpanded] = React.useState(true);
  const { data: knowledgeContext } = useQuery({
    queryKey: ['request-summary-knowledge-context', id],
    queryFn: async () => {
      const res = await api.get<KnowledgeContextResponse>(`/portfolio/requests/${id}/knowledge-context`);
      return res.data;
    },
    enabled: !isCreate && !!id,
  });

  const feasibilityReview = React.useMemo(
    () => normalizeFeasibilityReviewValue(form?.feasibility_review),
    [form?.feasibility_review],
  );

  const feasibilityCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(feasibilityReview).forEach((entry) => {
      const key = String(entry?.status || 'not_assessed');
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [feasibilityReview]);

  const topFeasibilityStatus = React.useMemo(
    () => FEASIBILITY_STATUS_ORDER.find((key) => (feasibilityCounts.get(key) || 0) > 0) || 'not_assessed',
    [feasibilityCounts],
  );

  const filledKeyRoles = [
    form?.business_sponsor_id,
    form?.business_lead_id,
    form?.it_sponsor_id,
    form?.it_lead_id,
  ].filter(Boolean).length;
  const contributorCount = (form?.business_team?.length || 0) + (form?.it_team?.length || 0);
  const businessProcesses = Array.isArray(form?.business_processes) ? form.business_processes : [];
  const recentActivities = Array.isArray(form?.activities) ? form.activities : [];
  const directKnowledgeGroup = React.useMemo(
    () => (knowledgeContext?.groups || []).find((group) => group.key === 'direct') || null,
    [knowledgeContext?.groups],
  );
  const relatedKnowledgeCount = React.useMemo(
    () => (knowledgeContext?.groups || [])
      .filter((group) => group.key !== 'direct')
      .reduce((sum, group) => sum + (group.total || 0), 0),
    [knowledgeContext?.groups],
  );
  const latestActivity = React.useMemo(() => {
    return [...recentActivities].sort((a, b) => {
      const aTime = new Date(a?.created_at || 0).getTime();
      const bTime = new Date(b?.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
  }, [recentActivities]);
  const latestActivityActor = latestActivity
    ? [latestActivity?.first_name, latestActivity?.last_name].filter(Boolean).join(' ') || 'Unknown'
    : null;
  const latestActivityAt = formatDateTime(latestActivity?.created_at);

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <SummaryCard
          title="Status Snapshot"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('activity')}>
              Activity
            </Button>
          ) : undefined}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={statusLabel || 'Draft'} color={statusColor} size="small" />
            {!isCreate && form?.priority_score != null && (
              <Chip
                label={`Priority ${Math.round(form.priority_score)}`}
                size="small"
                variant="outlined"
                color={form?.priority_override ? 'warning' : 'default'}
              />
            )}
          </Stack>
          <Stack spacing={1}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                Impacted business processes
              </Typography>
              {businessProcesses.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {businessProcesses.map((process: any) => (
                    <Chip key={process.id || process.name} size="small" label={process.name || process.id} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2">No business processes linked yet.</Typography>
              )}
            </Box>
            {latestActivity ? (
              <Typography variant="body2" color="text.secondary">
                Last activity update {latestActivityAt ? `the ${latestActivityAt}` : 'recently'} by {latestActivityActor || 'Unknown'}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No activity updates yet.
              </Typography>
            )}
          </Stack>
        </SummaryCard>

        <SummaryCard
          title="Analysis Snapshot"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('analysis')}>
              Analysis
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={FEASIBILITY_STATUS_COLORS[topFeasibilityStatus]}
                label={FEASIBILITY_STATUS_LABELS[topFeasibilityStatus]}
              />
              <Typography variant="body2">
                {7 - (feasibilityCounts.get('not_assessed') || 0)} of 7 dimensions assessed
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                Latest recommendation
              </Typography>
              {latestAnalysisRecommendation ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {latestRecommendationOutcome && (
                      <Chip
                        label={latestRecommendationOutcome}
                        size="small"
                        color={latestRecommendationOutcomeColor}
                      />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {latestRecommendationAuthor}
                      {latestRecommendationCreatedAt ? ` • ${latestRecommendationCreatedAt}` : ''}
                    </Typography>
                  </Stack>
                  {Array.isArray(latestRecommendationStatusChange) && latestRecommendationStatusChange.length === 2 && (
                    <Typography variant="body2">
                      Status changed from {String(latestRecommendationStatusChange[0] || '—')} to {String(latestRecommendationStatusChange[1] || '—')}.
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2">No analysis recommendation has been submitted yet.</Typography>
              )}
            </Stack>
          </Stack>
        </SummaryCard>

        <SummaryCard
          title="Team and Knowledge"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('knowledge')}>
              Knowledge
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.25}>
            <Stack spacing={1}>
              <Typography variant="body2">
                {filledKeyRoles} of 4 key roles assigned
              </Typography>
              <Typography variant="body2">
                {contributorCount} contributor{contributorCount === 1 ? '' : 's'} linked across business and IT teams
              </Typography>
              {form?.origin_task?.id && (
                <Typography variant="body2" color="text.secondary">
                  Origin task: {form.origin_task.item_number ? `T-${form.origin_task.item_number}` : form.origin_task.title || form.origin_task.id}
                </Typography>
              )}
            </Stack>
            <Divider flexItem sx={{ borderColor: 'divider', opacity: 0.75 }} />
            <Stack spacing={1}>
              <Typography variant="body2">
                {(directKnowledgeGroup?.total || 0)} linked document{directKnowledgeGroup?.total === 1 ? '' : 's'}
                {relatedKnowledgeCount > 0 ? ` • ${relatedKnowledgeCount} related` : ''}
              </Typography>
              {(directKnowledgeGroup?.total || 0) + relatedKnowledgeCount === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No standalone knowledge documents linked yet.
                </Typography>
              )}
            </Stack>
          </Stack>
        </SummaryCard>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
          <IntegratedDocumentEditor
            ref={purposeEditorRef}
            collapsed={!purposeExpanded}
            collapsible
            entityType="requests"
            entityId={isCreate ? null : id}
            headerTitle={<Typography variant="h6" sx={{ fontWeight: 600 }}>Purpose</Typography>}
            slotKey="purpose"
            label="Purpose"
            hideHeaderLabel
            onToggleCollapsed={() => setPurposeExpanded((prev) => !prev)}
            placeholder="Describe the purpose of this request..."
            minRows={14}
            maxRows={26}
            disabled={!canEditManagedDocs}
            showManagedDocChip={false}
            draftValue={form?.purpose || ''}
            onDraftChange={onPurposeDraftChange}
            onDirtyChange={onPurposeDirtyChange}
          />
      </Paper>

      <SummaryCard title="Recent Activity">
          <Stack spacing={1.25}>
            {latestActivity ? (
              <>
                <Typography variant="body2">
                  Latest entry by {latestActivityActor || 'Unknown'}
                </Typography>
                {latestActivityAt && (
                  <Typography variant="body2" color="text.secondary">
                    {latestActivityAt}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2">No activity yet.</Typography>
            )}
          </Stack>
      </SummaryCard>
    </Stack>
  );
}
