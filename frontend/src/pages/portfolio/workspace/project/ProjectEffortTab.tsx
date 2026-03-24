import React from 'react';
import type { TFunction } from 'i18next';
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import { getApiErrorMessage } from '../../../../utils/apiErrorMessage';
import { useLocale } from '../../../../i18n/useLocale';
import EffortAllocationDialog, { type EligibleUser } from '../../components/EffortAllocationDialog';
import EffortAllocationTable, { type EffortAllocationData } from '../../components/EffortAllocationTable';
import EffortConsumptionBar from '../../components/EffortConsumptionBar';
import LogTimeDialog, { type TimeEntryData } from '../../components/LogTimeDialog';

type ProjectEffortTabProps = {
  businessAllocationData?: EffortAllocationData | null;
  canContributeToProject: boolean;
  canManage: boolean;
  canProjectAdmin: boolean;
  form: any;
  itAllocationData?: EffortAllocationData | null;
  onError: (message: string) => void;
  onRefetch: () => Promise<unknown>;
  onRefetchBusinessAlloc: () => Promise<unknown>;
  onRefetchItAlloc: () => Promise<unknown>;
  onUpdate: (patch: any) => void;
  profileId?: string | null;
  projectId: string;
  taskTimeEntries: any[];
  taskTimeSummary?: { it_hours: number; business_hours: number; total_hours: number };
};

function getEffortVariance(estimated: number | null, baseline: number | null): number | null {
  if (estimated == null || baseline == null) return null;
  return estimated - baseline;
}

function formatEffortVariance(t: TFunction, diff: number | null) {
  if (diff == null) return null;
  if (diff === 0) return t('workspace.project.effort.values.onTrack');
  if (diff > 0) return t('workspace.project.effort.values.mdHigher', { count: diff });
  return t('workspace.project.effort.values.mdLower', { count: Math.abs(diff) });
}

export default function ProjectEffortTab({
  businessAllocationData,
  canContributeToProject,
  canManage,
  canProjectAdmin,
  form,
  itAllocationData,
  onError,
  onRefetch,
  onRefetchBusinessAlloc,
  onRefetchItAlloc,
  onUpdate,
  profileId,
  projectId,
  taskTimeEntries,
  taskTimeSummary,
}: ProjectEffortTabProps) {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const locale = useLocale();
  const [logTimeDialogOpen, setLogTimeDialogOpen] = React.useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = React.useState<TimeEntryData | undefined>(undefined);
  const [itAllocationDialogOpen, setItAllocationDialogOpen] = React.useState(false);
  const [businessAllocationDialogOpen, setBusinessAllocationDialogOpen] = React.useState(false);

  const itEligibleUsers = React.useMemo<EligibleUser[]>(() => {
    const users: EligibleUser[] = [];
    const seen = new Set<string>();
    if (form?.it_lead_id && form?.it_lead) {
      users.push({
        user_id: form.it_lead_id,
        email: form.it_lead.email,
        first_name: form.it_lead.first_name,
        last_name: form.it_lead.last_name,
        is_lead: true,
        allocation_pct: itAllocationData?.allocations.find((allocation) => allocation.user_id === form.it_lead_id)?.allocation_pct,
      });
      seen.add(form.it_lead_id);
    }
    for (const member of (form?.it_team || [])) {
      if (!seen.has(member.user_id)) {
        users.push({
          user_id: member.user_id,
          email: member.email,
          first_name: member.first_name,
          last_name: member.last_name,
          is_lead: false,
          allocation_pct: itAllocationData?.allocations.find((allocation) => allocation.user_id === member.user_id)?.allocation_pct,
        });
        seen.add(member.user_id);
      }
    }
    return users;
  }, [form?.it_lead, form?.it_lead_id, form?.it_team, itAllocationData?.allocations]);

  const businessEligibleUsers = React.useMemo<EligibleUser[]>(() => {
    const users: EligibleUser[] = [];
    const seen = new Set<string>();
    if (form?.business_lead_id && form?.business_lead) {
      users.push({
        user_id: form.business_lead_id,
        email: form.business_lead.email,
        first_name: form.business_lead.first_name,
        last_name: form.business_lead.last_name,
        is_lead: true,
        allocation_pct: businessAllocationData?.allocations.find((allocation) => allocation.user_id === form.business_lead_id)?.allocation_pct,
      });
      seen.add(form.business_lead_id);
    }
    for (const member of (form?.business_team || [])) {
      if (!seen.has(member.user_id)) {
        users.push({
          user_id: member.user_id,
          email: member.email,
          first_name: member.first_name,
          last_name: member.last_name,
          is_lead: false,
          allocation_pct: businessAllocationData?.allocations.find((allocation) => allocation.user_id === member.user_id)?.allocation_pct,
        });
        seen.add(member.user_id);
      }
    }
    return users;
  }, [businessAllocationData?.allocations, form?.business_lead, form?.business_lead_id, form?.business_team]);

  const progress = Number(form?.execution_progress) || 0;
  const estIt = Number(form?.estimated_effort_it) || 0;
  const estBusiness = Number(form?.estimated_effort_business) || 0;
  const actIt = Number(form?.actual_effort_it) || 0;
  const actBusiness = Number(form?.actual_effort_business) || 0;
  const totalEstimated = estIt + estBusiness;
  const totalActual = actIt + actBusiness;

  const taskTimeHours = taskTimeSummary?.total_hours || 0;
  const projectTimeHours = (form?.time_entries || []).reduce(
    (sum: number, entry: any) => sum + (Number(entry.hours) || 0),
    0,
  );
  const totalTimeHours = taskTimeHours + projectTimeHours;

  const projectEntries = (form?.time_entries || []).map((entry: any) => ({
    ...entry,
    source: 'project' as const,
    source_label: t('workspace.project.effort.values.projectOverhead'),
  }));
  const taskEntries = (taskTimeEntries || []).map((entry: any) => ({
    ...entry,
    source: 'task' as const,
    source_label: entry.task_title || t('workspace.project.effort.values.taskSourceFallback'),
  }));
  const allEntries = [...projectEntries, ...taskEntries].sort((a, b) => {
    const dateA = a.logged_at ? new Date(a.logged_at).getTime() : 0;
    const dateB = b.logged_at ? new Date(b.logged_at).getTime() : 0;
    return dateB - dateA;
  });

  const baselineItVariance = getEffortVariance(form?.estimated_effort_it, form?.baseline_effort_it);
  const baselineBusinessVariance = getEffortVariance(form?.estimated_effort_business, form?.baseline_effort_business);

  return (
    <>
      <Stack spacing={3}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('workspace.project.effort.sections.progressAndConsumption')}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: '80%' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('workspace.project.effort.values.executionProgress', { progress })}
                </Typography>
                <Slider
                  value={progress}
                  onChange={(_, value) => onUpdate({ execution_progress: value })}
                  min={0}
                  max={100}
                  step={5}
                  marks={[{ value: 0, label: '0%' }, { value: 50, label: '50%' }, { value: 100, label: '100%' }]}
                  disabled={!canManage}
                  sx={{
                    '& .MuiSlider-rail': { height: 4 },
                    '& .MuiSlider-track': { height: 4 },
                  }}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: '80%' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('workspace.project.effort.values.workloadConsumption', {
                    actual: Math.round(totalActual),
                    planned: Math.round(totalEstimated),
                  })}
                </Typography>
                <EffortConsumptionBar
                  itConsumed={actIt}
                  bizConsumed={actBusiness}
                  totalPlanned={totalEstimated}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('workspace.project.effort.sections.estimatedEffort')}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <TextField
              label={t('workspace.project.effort.fields.itEffort')}
              type="number"
              value={form?.estimated_effort_it != null ? Math.round(Number(form.estimated_effort_it)) : ''}
              onChange={(event) => onUpdate({ estimated_effort_it: event.target.value === '' ? null : Number(event.target.value) })}
              inputProps={{ step: 1, min: 0 }}
              fullWidth
              sx={{ mb: 2 }}
            />
            <EffortAllocationTable
              data={itAllocationData ?? null}
              effortType="it"
              estimatedEffort={Number(form?.estimated_effort_it) || 0}
              canManage={canManage}
              onEdit={() => setItAllocationDialogOpen(true)}
              onReset={async () => {
                try {
                  await api.delete(`/portfolio/projects/${projectId}/effort-allocations/it`);
                  await onRefetchItAlloc();
                } catch (error: any) {
                  onError(
                    getApiErrorMessage(error, t, t('workspace.project.effort.messages.resetAllocationsFailed')),
                  );
                }
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <TextField
              label={t('workspace.project.effort.fields.businessEffort')}
              type="number"
              value={form?.estimated_effort_business != null ? Math.round(Number(form.estimated_effort_business)) : ''}
              onChange={(event) => onUpdate({ estimated_effort_business: event.target.value === '' ? null : Number(event.target.value) })}
              inputProps={{ step: 1, min: 0 }}
              fullWidth
              sx={{ mb: 2 }}
            />
            <EffortAllocationTable
              data={businessAllocationData ?? null}
              effortType="business"
              estimatedEffort={Number(form?.estimated_effort_business) || 0}
              canManage={canManage}
              onEdit={() => setBusinessAllocationDialogOpen(true)}
              onReset={async () => {
                try {
                  await api.delete(`/portfolio/projects/${projectId}/effort-allocations/business`);
                  await onRefetchBusinessAlloc();
                } catch (error: any) {
                  onError(
                    getApiErrorMessage(error, t, t('workspace.project.effort.messages.resetAllocationsFailed')),
                  );
                }
              }}
            />
          </Box>
        </Stack>

        <Divider />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('workspace.project.effort.sections.actualEffort')}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingTimeEntry(undefined);
              setLogTimeDialogOpen(true);
            }}
            disabled={!canContributeToProject}
          >
            {t('dialogs.logTime.title.create')}
          </Button>
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label={t('workspace.project.effort.fields.itEffort')}
            value={form?.actual_effort_it != null ? Math.round(Number(form.actual_effort_it)) : '-'}
            disabled
            sx={{ flex: 1 }}
            InputProps={{ readOnly: true }}
          />
          <TextField
            label={t('workspace.project.effort.fields.businessEffort')}
            value={form?.actual_effort_business != null ? Math.round(Number(form.actual_effort_business)) : '-'}
            disabled
            sx={{ flex: 1 }}
            InputProps={{ readOnly: true }}
          />
        </Stack>

        {totalTimeHours > 0 && (
          (() => {
            const taskTimeMd = taskTimeHours / 8;
            const projectTimeMd = projectTimeHours / 8;
            const totalTimeMd = totalTimeHours / 8;
            const taskPercent = totalTimeHours > 0 ? Math.round((taskTimeHours / totalTimeHours) * 100) : 0;
            const projectPercent = 100 - taskPercent;

            return (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {t('workspace.project.effort.sections.timeBreakdown')}
                </Typography>
                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('workspace.project.effort.values.projectOverhead')}
                    </Typography>
                    <Typography variant="h6">
                      {t('workspace.project.effort.values.mdValue', { value: Math.round(projectTimeMd * 10) / 10 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('workspace.project.effort.values.shareOfTotal', {
                        percent: projectPercent,
                        hours: Math.round(projectTimeHours),
                      })}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('workspace.project.effort.values.taskTime')}
                    </Typography>
                    <Typography variant="h6">
                      {t('workspace.project.effort.values.mdValue', { value: Math.round(taskTimeMd * 10) / 10 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('workspace.project.effort.values.shareOfTotal', {
                        percent: taskPercent,
                        hours: Math.round(taskTimeHours),
                      })}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('workspace.project.effort.values.totalLogged')}
                    </Typography>
                    <Typography variant="h6">
                      {t('workspace.project.effort.values.mdValue', { value: Math.round(totalTimeMd * 10) / 10 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('workspace.project.effort.values.hoursValue', { hours: Math.round(totalTimeHours) })}
                    </Typography>
                  </Box>
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={projectPercent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'secondary.light',
                      '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="primary.main">
                      {t('workspace.project.effort.values.projectOverhead')}
                    </Typography>
                    <Typography variant="caption" color="secondary.main">
                      {t('workspace.project.effort.values.taskTime')}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            );
          })()
        )}

        <Divider />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('workspace.project.effort.sections.timeLog')}
        </Typography>
        {allEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {t('workspace.project.effort.states.noTimeLogged')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('workspace.project.effort.fields.date')}</TableCell>
                <TableCell>{t('workspace.project.effort.fields.source')}</TableCell>
                <TableCell>{t('workspace.project.effort.fields.person')}</TableCell>
                <TableCell>{t('workspace.project.effort.fields.type')}</TableCell>
                <TableCell align="right">{t('workspace.project.effort.fields.hours')}</TableCell>
                <TableCell>{t('workspace.project.effort.fields.notes')}</TableCell>
                <TableCell sx={{ width: 80 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {allEntries.map((entry: any) => {
                const canEditEntry = entry.source === 'project'
                  && canContributeToProject
                  && (
                    canProjectAdmin
                    || entry.logged_by_id === profileId
                    || entry.user_id === profileId
                  );
                const personName = [entry.user_first_name, entry.user_last_name].filter(Boolean).join(' ') || entry.user_email || '-';
                return (
                  <TableRow key={`${entry.source}-${entry.id}`}>
                    <TableCell>
                      {entry.logged_at ? new Date(entry.logged_at).toLocaleDateString(locale) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: entry.source === 'task' ? 'info.main' : 'text.secondary',
                        }}
                        title={entry.source_label}
                      >
                        {entry.source_label}
                      </Typography>
                    </TableCell>
                    <TableCell>{personName}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.category === 'it'
                          ? t('dialogs.logTime.categories.it')
                          : t('dialogs.logTime.categories.business')}
                        size="small"
                        color={entry.category === 'it' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {t('workspace.project.effort.values.hoursValue', { hours: entry.hours })}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {canEditEntry && (
                        <Stack direction="row" spacing={0}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingTimeEntry({
                                id: entry.id,
                                category: entry.category,
                                user_id: entry.user_id,
                                hours: entry.hours,
                                notes: entry.notes,
                              });
                              setLogTimeDialogOpen(true);
                            }}
                            title={t('actions.edit')}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={async () => {
                              if (!window.confirm(t('dialogs.logTime.confirmDelete'))) return;
                              try {
                                await api.delete(`/portfolio/projects/${projectId}/time-entries/${entry.id}`);
                                await onRefetch();
                              } catch (error: any) {
                                onError(
                                  getApiErrorMessage(error, t, t('workspace.project.effort.messages.deleteTimeEntryFailed')),
                                );
                              }
                            }}
                            title={t('common:buttons.delete')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {(form?.baseline_effort_it != null || form?.baseline_effort_business != null) && (
          <>
            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('workspace.project.effort.sections.baseline')}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('workspace.project.effort.fields.baselineItEffort')}
                </Typography>
                <Typography>
                  {form?.baseline_effort_it != null
                    ? t('workspace.project.effort.values.mdValue', { value: Math.round(Number(form.baseline_effort_it)) })
                    : '-'}
                </Typography>
                {baselineItVariance != null && (
                  <Typography variant="caption" color={baselineItVariance > 0 ? 'error.main' : 'success.main'}>
                    {formatEffortVariance(t, baselineItVariance)}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('workspace.project.effort.fields.baselineBusinessEffort')}
                </Typography>
                <Typography>
                  {form?.baseline_effort_business != null
                    ? t('workspace.project.effort.values.mdValue', { value: Math.round(Number(form.baseline_effort_business)) })
                    : '-'}
                </Typography>
                {baselineBusinessVariance != null && (
                  <Typography variant="caption" color={baselineBusinessVariance > 0 ? 'error.main' : 'success.main'}>
                    {formatEffortVariance(t, baselineBusinessVariance)}
                  </Typography>
                )}
              </Box>
            </Stack>
          </>
        )}
      </Stack>

      <LogTimeDialog
        open={logTimeDialogOpen}
        onClose={() => {
          setLogTimeDialogOpen(false);
          setEditingTimeEntry(undefined);
        }}
        projectId={projectId}
        onSuccess={() => {
          void onRefetch();
        }}
        editEntry={editingTimeEntry}
      />

      <EffortAllocationDialog
        open={itAllocationDialogOpen}
        onClose={() => setItAllocationDialogOpen(false)}
        projectId={projectId}
        effortType="it"
        eligibleUsers={itEligibleUsers}
        estimatedEffort={Number(form?.estimated_effort_it) || 0}
        onSuccess={() => {
          void onRefetchItAlloc();
        }}
      />

      <EffortAllocationDialog
        open={businessAllocationDialogOpen}
        onClose={() => setBusinessAllocationDialogOpen(false)}
        projectId={projectId}
        effortType="business"
        eligibleUsers={businessEligibleUsers}
        estimatedEffort={Number(form?.estimated_effort_business) || 0}
        onSuccess={() => {
          void onRefetchBusinessAlloc();
        }}
      />
    </>
  );
}
