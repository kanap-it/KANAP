import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../../../api';
import IntegratedDocumentEditor, { IntegratedDocumentEditorHandle } from '../../../../components/IntegratedDocumentEditor';

type SummaryTabKey = 'activity' | 'timeline' | 'effort' | 'tasks' | 'knowledge';
type StatusColor = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info';

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

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
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
  if (diff === 0) return 'On track';
  return diff > 0 ? `${diff} day${diff === 1 ? '' : 's'} later` : `${Math.abs(diff)} day${diff === -1 ? '' : 's'} earlier`;
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
    ? [latestActivity?.first_name, latestActivity?.last_name].filter(Boolean).join(' ') || 'Unknown'
    : null;
  const latestActivityAt = formatDateTime(latestActivity?.created_at);
  const latestKnowledgeUpdate = React.useMemo(() => {
    const items = (knowledgeContext?.groups || []).flatMap((group) => group.items || []);
    const latest = [...items].sort((a, b) => {
      const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
    return formatDateTime(latest?.updated_at || latest?.created_at || null);
  }, [knowledgeContext?.groups]);
  const scheduleStartVariance = formatVariance(form?.planned_start, form?.baseline_start_date);
  const scheduleEndVariance = formatVariance(form?.planned_end, form?.baseline_end_date);

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
            {!isCreate && activePhase?.name && (
              <Chip
                label={`Phase: ${activePhase.name}`}
                size="small"
                variant="outlined"
                color={activePhase.status === 'completed' ? 'success' : activePhase.status === 'in_progress' ? 'primary' : 'default'}
              />
            )}
          </Stack>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                Execution progress
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
              ? `Started ${formatDate(form.actual_start) || 'recently'}`
              : form?.planned_start
                ? `Planned to start ${formatDate(form.planned_start)}`
                : 'No start date set yet.'}
          </Typography>
        </SummaryCard>

        <SummaryCard
          title="Delivery Snapshot"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('timeline')}>
              Timeline
            </Button>
          ) : undefined}
        >
          <Stack spacing={1}>
            <Typography variant="body2">
              Planned window: {formatDate(form?.planned_start) || 'Not set'} to {formatDate(form?.planned_end) || 'Not set'}
            </Typography>
            {(scheduleStartVariance || scheduleEndVariance) ? (
              <Stack spacing={0.5}>
                {scheduleStartVariance && (
                  <Typography variant="body2" color="text.secondary">
                    Start variance: {scheduleStartVariance}
                  </Typography>
                )}
                {scheduleEndVariance && (
                  <Typography variant="body2" color="text.secondary">
                    End variance: {scheduleEndVariance}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Baseline comparison will appear after the project moves into execution.
              </Typography>
            )}
            {form?.actual_end && (
              <Typography variant="body2" color="text.secondary">
                Actual completion: {formatDate(form.actual_end)}
              </Typography>
            )}
          </Stack>
        </SummaryCard>

        <SummaryCard
          title="Effort and Tasks"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('effort')}>
              Progress
            </Button>
          ) : undefined}
        >
          <Stack spacing={1}>
            <Typography variant="body2">
              Effort: {formatMd(actualTotal)} / {formatMd(plannedTotal)} MD actual vs planned
            </Typography>
            <Typography variant="body2" color="text.secondary">
              IT {formatMd(Number(form?.actual_effort_it) || 0)} / {formatMd(Number(form?.estimated_effort_it) || 0)} MD
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Business {formatMd(Number(form?.actual_effort_business) || 0)} / {formatMd(Number(form?.estimated_effort_business) || 0)} MD
            </Typography>
            <DividerLine />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Active ${activeTaskCount}`} />
              <Chip size="small" variant="outlined" label={`In Progress ${inProgressTaskCount}`} />
              <Chip size="small" variant="outlined" label={`Pending ${pendingTaskCount}`} />
              <Chip size="small" color="success" variant="outlined" label={`Done ${doneTaskCount}`} />
              {cancelledTaskCount > 0 && (
                <Chip size="small" color="default" variant="outlined" label={`Cancelled ${cancelledTaskCount}`} />
              )}
            </Stack>
          </Stack>
        </SummaryCard>

        <SummaryCard
          title="Team and Relations"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('tasks')}>
              Tasks
            </Button>
          ) : undefined}
        >
          <Stack spacing={1.25}>
            <Typography variant="body2">
              {filledKeyRoles} of 4 key roles assigned
            </Typography>
            <Typography variant="body2">
              {contributorCount} contributor{contributorCount === 1 ? '' : 's'} linked across business and IT teams
            </Typography>
            <Typography variant="body2">
              {dependencyCount} dependenc{dependencyCount === 1 ? 'y' : 'ies'} tracked
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sourceRequestCount > 0
                ? `${sourceRequestCount} source request${sourceRequestCount === 1 ? '' : 's'} linked`
                : 'No source requests linked'}
            </Typography>
            {form?.department?.name && (
              <Typography variant="body2" color="text.secondary">
                Department: {form.department.name}
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
          headerTitle={<Typography variant="h6" sx={{ fontWeight: 600 }}>Purpose</Typography>}
          slotKey="purpose"
          label="Purpose"
          hideHeaderLabel
          onToggleCollapsed={() => setPurposeExpanded((prev) => !prev)}
          placeholder="Describe the purpose of this project..."
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
          title="Knowledge Summary"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('knowledge')}>
              Knowledge
            </Button>
          ) : undefined}
        >
          {isCreate ? (
            <Typography variant="body2" color="text.secondary">
              Knowledge links become available after the first save.
            </Typography>
          ) : (
            <Stack spacing={1}>
              <Typography variant="body2">
                {(directKnowledgeGroup?.total || 0)} linked document{directKnowledgeGroup?.total === 1 ? '' : 's'}
                {relatedKnowledgeCount > 0 ? ` • ${relatedKnowledgeCount} related` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {latestKnowledgeUpdate
                  ? `Latest update ${latestKnowledgeUpdate}`
                  : 'No standalone knowledge activity yet.'}
              </Typography>
            </Stack>
          )}
        </SummaryCard>

        <SummaryCard
          title="Recent Activity"
          action={!isCreate ? (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => onOpenTab('activity')}>
              Activity
            </Button>
          ) : undefined}
        >
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
