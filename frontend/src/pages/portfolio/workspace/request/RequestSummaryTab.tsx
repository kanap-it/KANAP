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
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import IntegratedDocumentEditor, { IntegratedDocumentEditorHandle } from '../../../../components/IntegratedDocumentEditor';
import { normalizeFeasibilityReviewValue } from '../../editors/FeasibilityReview';
import { getFeasibilityStatusLabel } from '../../../../utils/portfolioI18n';

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
  const { t } = useTranslation('portfolio');
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
    ? [latestActivity?.first_name, latestActivity?.last_name].filter(Boolean).join(' ') || t('activity.authorUnknown')
    : null;
  const latestActivityAt = formatDateTime(latestActivity?.created_at);

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <SummaryCard
          title={t('workspace.request.summary.cards.statusSnapshot')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('activity')}>
              {t('activity.tabs.comments')}
            </Button>
          ) : undefined}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={statusLabel || t('workspace.request.summary.values.draft')} color={statusColor} size="small" />
            {!isCreate && form?.priority_score != null && (
              <Chip
                label={t('workspace.request.summary.values.priority', {
                  value: Math.round(form.priority_score),
                })}
                size="small"
                variant="outlined"
                color={form?.priority_override ? 'warning' : 'default'}
              />
            )}
          </Stack>
          <Stack spacing={1}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                {t('workspace.request.summary.fields.businessProcesses')}
              </Typography>
              {businessProcesses.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {businessProcesses.map((process: any) => (
                    <Chip key={process.id || process.name} size="small" label={process.name || process.id} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2">{t('workspace.request.summary.values.noBusinessProcesses')}</Typography>
              )}
            </Box>
            {latestActivity ? (
              <Typography variant="body2" color="text.secondary">
                {t('workspace.request.summary.values.lastActivityUpdate', {
                  date: latestActivityAt || t('workspace.request.summary.values.recently'),
                  actor: latestActivityActor || t('activity.authorUnknown'),
                })}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('workspace.request.summary.values.noActivityUpdates')}
              </Typography>
            )}
          </Stack>
        </SummaryCard>

        <SummaryCard
          title={t('workspace.request.summary.cards.analysisSnapshot')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('analysis')}>
              {t('workspace.request.tabs.analysis')}
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={FEASIBILITY_STATUS_COLORS[topFeasibilityStatus]}
                label={getFeasibilityStatusLabel(t, topFeasibilityStatus)}
              />
              <Typography variant="body2">
                {t('workspace.request.summary.values.dimensionsAssessed', {
                  count: 7 - (feasibilityCounts.get('not_assessed') || 0),
                })}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                {t('workspace.request.summary.fields.latestRecommendation')}
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
                      {t('workspace.request.summary.values.statusChanged', {
                        from: String(latestRecommendationStatusChange[0] || '—'),
                        to: String(latestRecommendationStatusChange[1] || '—'),
                      })}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2">{t('workspace.request.summary.values.noRecommendation')}</Typography>
              )}
            </Stack>
          </Stack>
        </SummaryCard>

        <SummaryCard
          title={t('workspace.request.summary.cards.teamAndKnowledge')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('knowledge')}>
              {t('workspace.request.tabs.knowledge')}
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.25}>
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('workspace.request.summary.values.keyRolesAssigned', { count: filledKeyRoles })}
              </Typography>
              <Typography variant="body2">
                {t('workspace.request.summary.values.contributorsLinked', { count: contributorCount })}
              </Typography>
              {form?.origin_task?.id && (
                <Typography variant="body2" color="text.secondary">
                  {t('workspace.request.summary.values.originTask', {
                    task: form.origin_task.item_number ? `T-${form.origin_task.item_number}` : form.origin_task.title || form.origin_task.id,
                  })}
                </Typography>
              )}
            </Stack>
            <Divider flexItem sx={{ borderColor: 'divider', opacity: 0.75 }} />
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('workspace.request.summary.values.knowledgeDocuments', {
                  count: directKnowledgeGroup?.total || 0,
                  related: relatedKnowledgeCount > 0
                    ? ` • ${t('workspace.request.summary.values.relatedCount', { count: relatedKnowledgeCount })}`
                    : '',
                })}
              </Typography>
              {(directKnowledgeGroup?.total || 0) + relatedKnowledgeCount === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('workspace.request.summary.values.noKnowledgeDocuments')}
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
            headerTitle={<Typography variant="h6" sx={{ fontWeight: 600 }}>{t('workspace.request.summary.cards.purpose')}</Typography>}
            slotKey="purpose"
            label={t('workspace.request.summary.cards.purpose')}
            hideHeaderLabel
            onToggleCollapsed={() => setPurposeExpanded((prev) => !prev)}
            placeholder={t('workspace.request.summary.placeholders.purpose')}
            minRows={14}
            maxRows={26}
            disabled={!canEditManagedDocs}
            showManagedDocChip={false}
            draftValue={form?.purpose || ''}
            onDraftChange={onPurposeDraftChange}
            onDirtyChange={onPurposeDirtyChange}
          />
      </Paper>

      <SummaryCard title={t('workspace.request.summary.cards.recentActivity')}>
          <Stack spacing={1.25}>
            {latestActivity ? (
              <>
                <Typography variant="body2">
                  {t('workspace.request.summary.values.latestEntryBy', {
                    actor: latestActivityActor || t('activity.authorUnknown'),
                  })}
                </Typography>
                {latestActivityAt && (
                  <Typography variant="body2" color="text.secondary">
                    {latestActivityAt}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2">{t('workspace.request.summary.values.noActivity')}</Typography>
            )}
          </Stack>
      </SummaryCard>
    </Stack>
  );
}
