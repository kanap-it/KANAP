import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import { useLocale } from '../../../../i18n/useLocale';
import IntegratedDocumentEditor, { IntegratedDocumentEditorHandle } from '../../../../components/IntegratedDocumentEditor';
import { getDotColor, getPillBg } from '../../../../utils/statusColors';

type SummaryTabKey = 'activity' | 'timeline' | 'effort' | 'tasks' | 'knowledge';
type StatusColor = 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

type ProjectSummaryTabProps = {
  canEditManagedDocs: boolean;
  form: any;
  id: string;
  isCreate: boolean;
  onOpenTab: (tab: SummaryTabKey) => void;
  onPurposeDirtyChange: (dirty: boolean) => void;
  onPurposeDraftChange: (value: string) => void;
  purposeEditorRef: React.RefObject<IntegratedDocumentEditorHandle>;
  statusColor: StatusColor;
  statusLabel: string;
};

type ProjectTaskStatusSummary = {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  in_testing: number;
  done: number;
  cancelled: number;
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

function formatDateTime(locale: string, value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(locale: string, value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatVariance(planned?: string | null, baseline?: string | null) {
  if (!planned || !baseline) return null;
  const plannedTime = new Date(planned).getTime();
  const baselineTime = new Date(baseline).getTime();
  if (!Number.isFinite(plannedTime) || !Number.isFinite(baselineTime)) return null;
  const diff = Math.round((plannedTime - baselineTime) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'on_track';
  return diff > 0 ? `later:${diff}` : `earlier:${Math.abs(diff)}`;
}

function formatMd(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function ProjectSummaryTab({
  canEditManagedDocs,
  form,
  id,
  isCreate,
  onOpenTab,
  onPurposeDirtyChange,
  onPurposeDraftChange,
  purposeEditorRef,
  statusColor,
  statusLabel,
}: ProjectSummaryTabProps) {
  const { t } = useTranslation('portfolio');
  const locale = useLocale();
  const { palette: { mode } } = useTheme();
  const [purposeExpanded, setPurposeExpanded] = React.useState(true);

  const { data: taskSummary } = useQuery({
    queryKey: ['project-summary-task-status', id],
    queryFn: async () => {
      const res = await api.get<ProjectTaskStatusSummary>(`/portfolio/projects/${id}/tasks/status-summary`);
      return res.data;
    },
    enabled: !isCreate && !!id,
  });

  const { data: knowledgeContext } = useQuery({
    queryKey: ['project-summary-knowledge-context', id],
    queryFn: async () => {
      const res = await api.get<KnowledgeContextResponse>(`/portfolio/projects/${id}/knowledge-context`);
      return res.data;
    },
    enabled: !isCreate && !!id,
  });

  const sortedPhases = React.useMemo(
    () => [...(Array.isArray(form?.phases) ? form.phases : [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0)),
    [form?.phases],
  );

  const activePhase = React.useMemo(() => {
    if (sortedPhases.length === 0) return null;
    return sortedPhases.find((phase: any) => phase.status === 'in_progress')
      || sortedPhases.find((phase: any) => phase.status !== 'completed')
      || sortedPhases[sortedPhases.length - 1]
      || null;
  }, [sortedPhases]);

  const progressValue = Math.max(0, Math.min(100, Math.round(Number(form?.execution_progress) || 0)));
  const plannedTotal = (Number(form?.estimated_effort_it) || 0) + (Number(form?.estimated_effort_business) || 0);
  const actualTotal = (Number(form?.actual_effort_it) || 0) + (Number(form?.actual_effort_business) || 0);
  const activeTaskCount = (taskSummary?.open || 0) + (taskSummary?.in_progress || 0) + (taskSummary?.pending || 0) + (taskSummary?.in_testing || 0);
  const inProgressTaskCount = taskSummary?.in_progress || 0;
  const pendingTaskCount = taskSummary?.pending || 0;
  const doneTaskCount = taskSummary?.done || 0;
  const cancelledTaskCount = taskSummary?.cancelled || 0;
  const filledKeyRoles = [
    form?.business_sponsor_id,
    form?.business_lead_id,
    form?.it_sponsor_id,
    form?.it_lead_id,
  ].filter(Boolean).length;
  const contributorCount = (form?.business_team?.length || 0) + (form?.it_team?.length || 0);
  const dependencyCount = form?.dependencies?.length || 0;
  const sourceRequestCount = form?.source_requests?.length || 0;
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
  const latestActivityAt = formatDateTime(locale, latestActivity?.created_at);
  const latestKnowledgeUpdate = React.useMemo(() => {
    const items = (knowledgeContext?.groups || []).flatMap((group) => group.items || []);
    const latest = [...items].sort((a, b) => {
      const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
    return formatDateTime(locale, latest?.updated_at || latest?.created_at || null);
  }, [knowledgeContext?.groups, locale]);
  const scheduleStartVariance = formatVariance(form?.planned_start, form?.baseline_start_date);
  const scheduleEndVariance = formatVariance(form?.planned_end, form?.baseline_end_date);
  const renderVariance = (variance: string | null) => {
    if (!variance) return null;
    if (variance === 'on_track') return t('workspace.project.summary.values.onTrack');
    const [type, value] = variance.split(':');
    const count = Number(value) || 0;
    return type === 'later'
      ? t('workspace.project.summary.values.daysLater', { count })
      : t('workspace.project.summary.values.daysEarlier', { count });
  };

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <SummaryCard
          title={t('workspace.project.summary.cards.statusSnapshot')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('activity')}>
              {t('activity.tabs.comments')}
            </Button>
          ) : undefined}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: '9999px', bgcolor: getPillBg(statusColor, mode), color: getDotColor(statusColor, mode), fontSize: '12px', fontWeight: 500 }}>
              {statusLabel || t('workspace.project.summary.values.draft')}
            </Box>
            {!isCreate && form?.priority_score != null && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {t('workspace.project.summary.values.priority', {
                  value: Math.round(form.priority_score),
                })}
              </Typography>
            )}
            {!isCreate && activePhase?.name && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {t('workspace.project.summary.values.phase', { name: activePhase.name })}
              </Typography>
            )}
          </Stack>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                {t('workspace.project.summary.fields.executionProgress')}
              </Typography>
              <Typography variant="body2">{progressValue}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{ height: 8, borderRadius: 999 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {form?.actual_start
              ? t('workspace.project.summary.values.started', {
                date: formatDate(locale, form.actual_start) || t('workspace.project.summary.values.recently'),
              })
              : form?.planned_start
                ? t('workspace.project.summary.values.plannedToStart', {
                  date: formatDate(locale, form.planned_start),
                })
                : t('workspace.project.summary.values.noStartDate')}
          </Typography>
        </SummaryCard>

        <SummaryCard
          title={t('workspace.project.summary.cards.deliverySnapshot')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('timeline')}>
              {t('workspace.project.tabs.timeline')}
            </Button>
          ) : undefined}
        >
          <Stack spacing={1}>
            <Typography variant="body2">
              {t('workspace.project.summary.values.plannedWindow', {
                start: formatDate(locale, form?.planned_start) || t('workspace.project.summary.values.notSet'),
                end: formatDate(locale, form?.planned_end) || t('workspace.project.summary.values.notSet'),
              })}
            </Typography>
            {(scheduleStartVariance || scheduleEndVariance) ? (
              <Stack spacing={0.5}>
                {scheduleStartVariance && (
                  <Typography variant="body2" color="text.secondary">
                    {t('workspace.project.summary.values.startVariance', {
                      value: renderVariance(scheduleStartVariance),
                    })}
                  </Typography>
                )}
                {scheduleEndVariance && (
                  <Typography variant="body2" color="text.secondary">
                    {t('workspace.project.summary.values.endVariance', {
                      value: renderVariance(scheduleEndVariance),
                    })}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('workspace.project.summary.values.baselineComparisonPending')}
              </Typography>
            )}
            {form?.actual_end && (
              <Typography variant="body2" color="text.secondary">
                {t('workspace.project.summary.values.actualCompletion', {
                  date: formatDate(locale, form.actual_end),
                })}
              </Typography>
            )}
          </Stack>
        </SummaryCard>

        <SummaryCard
          title={t('workspace.project.summary.cards.effortAndTasks')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('effort')}>
              {t('workspace.project.tabs.progress')}
            </Button>
          ) : undefined}
        >
          <Stack spacing={1}>
            <Typography variant="body2">
              {t('workspace.project.summary.values.effortTotal', {
                actual: formatMd(actualTotal),
                planned: formatMd(plannedTotal),
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('workspace.project.summary.values.effortIt', {
                actual: formatMd(Number(form?.actual_effort_it) || 0),
                planned: formatMd(Number(form?.estimated_effort_it) || 0),
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('workspace.project.summary.values.effortBusiness', {
                actual: formatMd(Number(form?.actual_effort_business) || 0),
                planned: formatMd(Number(form?.estimated_effort_business) || 0),
              })}
            </Typography>
            <DividerLine />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {t('workspace.project.summary.values.activeTasks', { count: activeTaskCount })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {t('workspace.project.summary.values.inProgressTasks', { count: inProgressTaskCount })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {t('workspace.project.summary.values.pendingTasks', { count: pendingTaskCount })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {t('workspace.project.summary.values.doneTasks', { count: doneTaskCount })}
              </Typography>
              {cancelledTaskCount > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  {t('workspace.project.summary.values.cancelledTasks', { count: cancelledTaskCount })}
                </Typography>
              )}
            </Stack>
          </Stack>
        </SummaryCard>

        <SummaryCard
          title={t('workspace.project.summary.cards.teamAndRelations')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('tasks')}>
              {t('workspace.project.tabs.tasks')}
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.25}>
            <Typography variant="body2">
              {t('workspace.project.summary.values.keyRolesAssigned', { count: filledKeyRoles })}
            </Typography>
            <Typography variant="body2">
              {t('workspace.project.summary.values.contributorsLinked', { count: contributorCount })}
            </Typography>
            <Typography variant="body2">
              {t('workspace.project.summary.values.dependenciesTracked', { count: dependencyCount })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sourceRequestCount > 0
                ? t('workspace.project.summary.values.sourceRequestsLinked', { count: sourceRequestCount })
                : t('workspace.project.summary.values.noSourceRequests')}
            </Typography>
            {form?.department?.name && (
              <Typography variant="body2" color="text.secondary">
                {t('workspace.project.summary.values.department', { name: form.department.name })}
              </Typography>
            )}
          </Stack>
        </SummaryCard>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <IntegratedDocumentEditor
          ref={purposeEditorRef}
          collapsed={!purposeExpanded}
          collapsible
          entityType="projects"
          entityId={isCreate ? null : id}
          headerTitle={<Typography variant="h6" sx={{ fontWeight: 600 }}>{t('workspace.project.summary.cards.purpose')}</Typography>}
          slotKey="purpose"
          label={t('workspace.project.summary.cards.purpose')}
          hideHeaderLabel
          onToggleCollapsed={() => setPurposeExpanded((prev) => !prev)}
          placeholder={t('workspace.project.summary.placeholders.purpose')}
          minRows={14}
          maxRows={26}
          disabled={!canEditManagedDocs}
          showManagedDocChip={false}
          draftValue={form?.purpose || ''}
          onDraftChange={onPurposeDraftChange}
          onDirtyChange={onPurposeDirtyChange}
        />
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <SummaryCard
          title={t('workspace.project.summary.cards.knowledgeSummary')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('knowledge')}>
              {t('workspace.project.tabs.knowledge')}
            </Button>
          ) : undefined}
        >
          {isCreate ? (
            <Typography variant="body2" color="text.secondary">
              {t('workspace.project.summary.values.knowledgeAfterSave')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('workspace.project.summary.values.knowledgeDocuments', {
                  count: directKnowledgeGroup?.total || 0,
                  related: relatedKnowledgeCount > 0
                    ? ` • ${t('workspace.project.summary.values.relatedCount', { count: relatedKnowledgeCount })}`
                    : '',
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {latestKnowledgeUpdate
                  ? t('workspace.project.summary.values.latestKnowledgeUpdate', { date: latestKnowledgeUpdate })
                  : t('workspace.project.summary.values.noKnowledgeActivity')}
              </Typography>
            </Stack>
          )}
        </SummaryCard>

        <SummaryCard
          title={t('workspace.project.summary.cards.recentActivity')}
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('activity')}>
              {t('activity.tabs.comments')}
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.25}>
            {latestActivity ? (
              <>
                <Typography variant="body2">
                  {t('workspace.project.summary.values.latestEntryBy', {
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
              <Typography variant="body2">{t('workspace.project.summary.values.noActivity')}</Typography>
            )}
          </Stack>
        </SummaryCard>
      </Box>
    </Stack>
  );
}

function DividerLine() {
  return (
    <Box
      sx={{
        height: 1,
        bgcolor: 'divider',
      }}
    />
  );
}
