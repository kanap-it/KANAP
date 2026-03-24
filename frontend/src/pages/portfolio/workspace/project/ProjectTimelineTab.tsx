import React from 'react';
import type { TFunction } from 'i18next';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import DateEUField from '../../../../components/fields/DateEUField';
import { getApiErrorMessage } from '../../../../utils/apiErrorMessage';
import { useLocale } from '../../../../i18n/useLocale';
import {
  getMilestoneStatusLabel,
  getPhaseStatusLabel,
} from '../../../../utils/portfolioI18n';
import { ProjectTimeline } from '../../components/ProjectTimeline';

type ProjectTimelineTabProps = {
  canManage: boolean;
  form: any;
  projectId: string;
  onError: (message: string) => void;
  onNavigateToTask: (path: string) => void;
  onRefetch: () => Promise<unknown>;
  onSetForm: React.Dispatch<React.SetStateAction<any>>;
  onUpdate: (patch: any) => void;
};

type SortablePhaseRowProps = {
  canManage: boolean;
  milestones: any[];
  onError: (message: string) => void;
  onNavigateToTask: (path: string) => void;
  onRefetch: () => Promise<unknown>;
  onSetForm: React.Dispatch<React.SetStateAction<any>>;
  phase: any;
  projectId: string;
  index: number;
};

function getDateVariance(planned: string | null, baseline: string | null): number | null {
  if (!planned || !baseline) return null;
  const plannedTime = new Date(planned).getTime();
  const baselineTime = new Date(baseline).getTime();
  return Math.round((plannedTime - baselineTime) / (1000 * 60 * 60 * 24));
}

function formatDateVariance(t: TFunction, diff: number | null) {
  if (diff == null) return null;
  if (diff === 0) return t('workspace.project.timeline.values.onTrack');
  if (diff > 0) return t('workspace.project.timeline.values.daysLater', { count: diff });
  return t('workspace.project.timeline.values.daysEarlier', { count: Math.abs(diff) });
}

function SortablePhaseRow({
  canManage,
  milestones,
  onError,
  onNavigateToTask,
  onRefetch,
  onSetForm,
  phase,
  projectId,
  index,
}: SortablePhaseRowProps) {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.08)' : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell sx={{ width: 56, cursor: canManage ? 'grab' : 'default', px: 1 }} {...attributes} {...listeners}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {canManage && <DragIndicatorIcon fontSize="small" sx={{ color: 'action.active' }} />}
          <span>{index + 1}</span>
        </Box>
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={phase.name}
          fullWidth
          disabled={!canManage}
          onChange={(event) => {
            const nextName = event.target.value;
            onSetForm((prev: any) => ({
              ...prev,
              phases: (prev?.phases || []).map((current: any) =>
                current.id === phase.id ? { ...current, name: nextName } : current
              ),
            }));
          }}
          onBlur={async () => {
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { name: phase.name });
              await onRefetch();
            } catch (error: any) {
              onError(
                getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updatePhaseFailed')),
              );
            }
          }}
        />
      </TableCell>
      <TableCell>
        <DateEUField
          valueYmd={phase.planned_start || ''}
          label=""
          disabled={!canManage}
          onChangeYmd={async (value) => {
            onSetForm((prev: any) => ({
              ...prev,
              phases: (prev?.phases || []).map((current: any) =>
                current.id === phase.id ? { ...current, planned_start: value } : current
              ),
            }));
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { planned_start: value || null });
              await onRefetch();
            } catch (error: any) {
              onError(
                getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updatePhaseFailed')),
              );
            }
          }}
        />
      </TableCell>
      <TableCell>
        <DateEUField
          valueYmd={phase.planned_end || ''}
          label=""
          disabled={!canManage}
          onChangeYmd={async (value) => {
            onSetForm((prev: any) => ({
              ...prev,
              phases: (prev?.phases || []).map((current: any) =>
                current.id === phase.id ? { ...current, planned_end: value } : current
              ),
            }));
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { planned_end: value || null });
              await onRefetch();
            } catch (error: any) {
              onError(
                getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updatePhaseFailed')),
              );
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Select
          size="small"
          value={phase.status || 'pending'}
          fullWidth
          disabled={!canManage}
          onChange={async (event) => {
            const nextStatus = event.target.value;
            onSetForm((prev: any) => ({
              ...prev,
              phases: (prev?.phases || []).map((current: any) =>
                current.id === phase.id ? { ...current, status: nextStatus } : current
              ),
            }));
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { status: nextStatus });
              await onRefetch();
            } catch (error: any) {
              onError(
                getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updatePhaseFailed')),
              );
            }
          }}
        >
          <MenuItem value="pending">{getPhaseStatusLabel(t, 'pending')}</MenuItem>
          <MenuItem value="in_progress">{getPhaseStatusLabel(t, 'in_progress')}</MenuItem>
          <MenuItem value="completed">{getPhaseStatusLabel(t, 'completed')}</MenuItem>
        </Select>
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <Checkbox
          size="small"
          checked={!!milestones.find((milestone: any) => milestone.phase_id === phase.id)}
          disabled={!canManage}
          onChange={async (event) => {
            try {
              await api.post(`/portfolio/projects/${projectId}/phases/${phase.id}/toggle-milestone`, {
                enabled: event.target.checked,
                milestone_name: t('workspace.project.timeline.defaults.phaseComplete', { phase: phase.name }),
              });
              await onRefetch();
            } catch (error: any) {
              onError(
                getApiErrorMessage(error, t, t('workspace.project.timeline.messages.toggleMilestoneFailed')),
              );
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0}>
          <IconButton
            size="small"
            disabled={!canManage}
            title={t('workspace.project.timeline.actions.addTaskToPhase')}
            onClick={() => {
              onNavigateToTask(`/portfolio/tasks/new/overview?projectId=${projectId}&phaseId=${phase.id}`);
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={!canManage}
            title={t('workspace.project.timeline.actions.deletePhase')}
            onClick={async () => {
              try {
                await api.delete(`/portfolio/projects/${projectId}/phases/${phase.id}`);
                await onRefetch();
              } catch (error: any) {
                onError(
                  getApiErrorMessage(error, t, t('workspace.project.timeline.messages.deletePhaseFailed')),
                );
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default function ProjectTimelineTab({
  canManage,
  form,
  projectId,
  onError,
  onNavigateToTask,
  onRefetch,
  onSetForm,
  onUpdate,
}: ProjectTimelineTabProps) {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const locale = useLocale();
  const [phaseTemplates, setPhaseTemplates] = React.useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [replaceConfirmOpen, setReplaceConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    api.get('/portfolio/phase-templates')
      .then((res) => {
        setPhaseTemplates(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handlePhaseDragEnd = React.useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sortedPhases = [...(form?.phases || [])].sort((a: any, b: any) => a.sequence - b.sequence);
    const oldIndex = sortedPhases.findIndex((phase: any) => phase.id === active.id);
    const newIndex = sortedPhases.findIndex((phase: any) => phase.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedPhases, oldIndex, newIndex).map((phase: any, index: number) => ({
      ...phase,
      sequence: index,
    }));
    onSetForm((prev: any) => ({ ...prev, phases: reordered }));

    try {
      await api.post(`/portfolio/projects/${projectId}/phases/reorder`, {
        phase_ids: reordered.map((phase: any) => phase.id),
      });
    } catch (error: any) {
      await onRefetch();
      onError(
        getApiErrorMessage(error, t, t('workspace.project.timeline.messages.reorderPhasesFailed')),
      );
    }
  }, [form?.phases, onError, onRefetch, onSetForm, projectId, t]);

  const baselineStartVariance = getDateVariance(form?.planned_start, form?.baseline_start_date);
  const baselineEndVariance = getDateVariance(form?.planned_end, form?.baseline_end_date);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          {t('workspace.project.timeline.sections.projectDates')}
        </Typography>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <DateEUField
              label={t('workspace.project.fields.plannedStart')}
              valueYmd={form?.planned_start || ''}
              onChangeYmd={(value) => onUpdate({ planned_start: value })}
            />
            <DateEUField
              label={t('workspace.project.fields.plannedEnd')}
              valueYmd={form?.planned_end || ''}
              onChangeYmd={(value) => onUpdate({ planned_end: value })}
            />
          </Stack>
          {(form?.actual_start || form?.actual_end) && (
            <Stack direction="row" spacing={2}>
              <TextField
                label={t('workspace.project.timeline.fields.actualStart')}
                value={form?.actual_start ? new Date(form.actual_start).toLocaleDateString(locale) : '-'}
                disabled
                sx={{ flex: 1 }}
              />
              <TextField
                label={t('workspace.project.timeline.fields.actualEnd')}
                value={form?.actual_end ? new Date(form.actual_end).toLocaleDateString(locale) : '-'}
                disabled
                sx={{ flex: 1 }}
              />
            </Stack>
          )}
        </Stack>
      </Box>

      <Divider />

      {(form?.phases?.length || 0) === 0 ? (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {t('workspace.project.timeline.sections.applyPhaseTemplate')}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              displayEmpty
              size="small"
              sx={{ minWidth: 250 }}
            >
              <MenuItem value="" disabled>{t('workspace.project.timeline.states.selectTemplate')}</MenuItem>
              {phaseTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>
              ))}
            </Select>
            <Button
              variant="contained"
              disabled={!selectedTemplateId || !canManage}
              onClick={async () => {
                if (!selectedTemplateId) return;
                try {
                  await api.post(`/portfolio/projects/${projectId}/apply-template`, { template_id: selectedTemplateId });
                  await onRefetch();
                  setSelectedTemplateId('');
                } catch (error: any) {
                  onError(
                    getApiErrorMessage(error, t, t('workspace.project.timeline.messages.applyTemplateFailed')),
                  );
                }
              }}
            >
              {t('workspace.project.timeline.actions.applyTemplate')}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('workspace.project.timeline.sections.phases')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled={!canManage}
                onClick={async () => {
                  try {
                    await api.post(`/portfolio/projects/${projectId}/phases`, {
                      name: t('workspace.project.timeline.defaults.newPhase'),
                    });
                    await onRefetch();
                  } catch (error: any) {
                    onError(
                      getApiErrorMessage(error, t, t('workspace.project.timeline.messages.addPhaseFailed')),
                    );
                  }
                }}
              >
                {t('workspace.project.timeline.actions.addPhase')}
              </Button>
              <Button
                size="small"
                color="warning"
                disabled={!canManage}
                onClick={() => setReplaceConfirmOpen(true)}
              >
                {t('workspace.project.timeline.actions.replaceWithTemplate')}
              </Button>
            </Stack>
          </Stack>
          <ProjectTimeline
            projectId={projectId}
            phases={(form?.phases || []).map((phase: any) => ({
              id: phase.id,
              name: phase.name,
              planned_start: phase.planned_start,
              planned_end: phase.planned_end,
              status: phase.status || 'pending',
              sequence: phase.sequence,
            }))}
            onUpdate={onRefetch}
            canManage={canManage}
            tableView={(
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePhaseDragEnd}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 56 }}>#</TableCell>
                      <TableCell>{t('workspace.project.timeline.fields.name')}</TableCell>
                      <TableCell sx={{ width: 140 }}>{t('workspace.project.timeline.fields.start')}</TableCell>
                      <TableCell sx={{ width: 140 }}>{t('workspace.project.timeline.fields.end')}</TableCell>
                      <TableCell sx={{ width: 130 }}>{t('workspace.project.fields.status')}</TableCell>
                      <TableCell sx={{ width: 80, textAlign: 'center' }}>
                        {t('workspace.project.timeline.fields.milestone')}
                      </TableCell>
                      <TableCell sx={{ width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <SortableContext
                    items={(form?.phases || []).sort((a: any, b: any) => a.sequence - b.sequence).map((phase: any) => phase.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {(form?.phases || []).sort((a: any, b: any) => a.sequence - b.sequence).map((phase: any, index: number) => (
                        <SortablePhaseRow
                          key={phase.id}
                          canManage={canManage}
                          milestones={form?.milestones || []}
                          onError={onError}
                          onNavigateToTask={onNavigateToTask}
                          onRefetch={onRefetch}
                          onSetForm={onSetForm}
                          phase={phase}
                          projectId={projectId}
                          index={index}
                        />
                      ))}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
            )}
          />
        </Box>
      )}

      <Divider />
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('workspace.project.timeline.sections.milestones')}
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={!canManage}
            onClick={async () => {
              try {
                await api.post(`/portfolio/projects/${projectId}/milestones`, {
                  name: t('workspace.project.timeline.defaults.newMilestone'),
                });
                await onRefetch();
              } catch (error: any) {
                onError(
                  getApiErrorMessage(error, t, t('workspace.project.timeline.messages.addMilestoneFailed')),
                );
              }
            }}
          >
            {t('workspace.project.timeline.actions.addMilestone')}
          </Button>
        </Stack>
        {(form?.milestones?.length || 0) === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {t('workspace.project.timeline.states.noMilestones')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('workspace.project.timeline.fields.name')}</TableCell>
                <TableCell sx={{ width: 180 }}>{t('workspace.project.fields.phase')}</TableCell>
                <TableCell sx={{ width: 140 }}>{t('workspace.project.timeline.fields.targetDate')}</TableCell>
                <TableCell sx={{ width: 130 }}>{t('workspace.project.fields.status')}</TableCell>
                <TableCell sx={{ width: 50 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {(form?.milestones || []).map((milestone: any) => {
                const linkedPhase = (form?.phases || []).find((phase: any) => phase.id === milestone.phase_id);
                return (
                  <TableRow key={milestone.id}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={milestone.name}
                        fullWidth
                        disabled={!canManage}
                        onChange={(event) => {
                          const nextName = event.target.value;
                          onSetForm((prev: any) => ({
                            ...prev,
                            milestones: (prev?.milestones || []).map((current: any) =>
                              current.id === milestone.id ? { ...current, name: nextName } : current
                            ),
                          }));
                        }}
                        onBlur={async () => {
                          try {
                            await api.patch(`/portfolio/projects/${projectId}/milestones/${milestone.id}`, { name: milestone.name });
                          } catch (error: any) {
                            onError(
                              getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updateMilestoneFailed')),
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={linkedPhase ? 'text.primary' : 'text.secondary'}>
                        {linkedPhase ? linkedPhase.name : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <DateEUField
                        valueYmd={milestone.target_date || ''}
                        label=""
                        disabled={!canManage || !!linkedPhase}
                        onChangeYmd={async (value) => {
                          onSetForm((prev: any) => ({
                            ...prev,
                            milestones: (prev?.milestones || []).map((current: any) =>
                              current.id === milestone.id ? { ...current, target_date: value } : current
                            ),
                          }));
                          try {
                            await api.patch(`/portfolio/projects/${projectId}/milestones/${milestone.id}`, { target_date: value || null });
                          } catch (error: any) {
                            onError(
                              getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updateMilestoneFailed')),
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={milestone.status || 'pending'}
                        fullWidth
                        disabled={!canManage}
                        onChange={async (event) => {
                          const nextStatus = event.target.value;
                          onSetForm((prev: any) => ({
                            ...prev,
                            milestones: (prev?.milestones || []).map((current: any) =>
                              current.id === milestone.id ? { ...current, status: nextStatus } : current
                            ),
                          }));
                          try {
                            await api.patch(`/portfolio/projects/${projectId}/milestones/${milestone.id}`, { status: nextStatus });
                          } catch (error: any) {
                            onError(
                              getApiErrorMessage(error, t, t('workspace.project.timeline.messages.updateMilestoneFailed')),
                            );
                          }
                        }}
                      >
                        <MenuItem value="pending">{getMilestoneStatusLabel(t, 'pending')}</MenuItem>
                        <MenuItem value="achieved">{getMilestoneStatusLabel(t, 'achieved')}</MenuItem>
                        <MenuItem value="missed">{getMilestoneStatusLabel(t, 'missed')}</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        disabled={!canManage || !!linkedPhase}
                        title={linkedPhase ? t('workspace.project.timeline.messages.unlinkPhaseMilestoneFirst') : undefined}
                        onClick={async () => {
                          try {
                            await api.delete(`/portfolio/projects/${projectId}/milestones/${milestone.id}`);
                            await onRefetch();
                          } catch (error: any) {
                            onError(
                              getApiErrorMessage(error, t, t('workspace.project.timeline.messages.deleteMilestoneFailed')),
                            );
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>

      {(form?.baseline_start_date || form?.baseline_end_date) && (
        <>
          <Divider />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('workspace.project.timeline.sections.baseline')}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('workspace.project.timeline.fields.baselineStart')}
              </Typography>
              <Typography>{form?.baseline_start_date ? new Date(form.baseline_start_date).toLocaleDateString(locale) : '-'}</Typography>
              {baselineStartVariance != null && (
                <Typography variant="caption" color={baselineStartVariance > 0 ? 'error.main' : 'success.main'}>
                  {formatDateVariance(t, baselineStartVariance)}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('workspace.project.timeline.fields.baselineEnd')}
              </Typography>
              <Typography>{form?.baseline_end_date ? new Date(form.baseline_end_date).toLocaleDateString(locale) : '-'}</Typography>
              {baselineEndVariance != null && (
                <Typography variant="caption" color={baselineEndVariance > 0 ? 'error.main' : 'success.main'}>
                  {formatDateVariance(t, baselineEndVariance)}
                </Typography>
              )}
            </Box>
          </Stack>
        </>
      )}

      <Dialog open={replaceConfirmOpen} onClose={() => setReplaceConfirmOpen(false)}>
        <DialogTitle>{t('workspace.project.timeline.dialogs.replaceAll.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('workspace.project.timeline.dialogs.replaceAll.description')}
          </DialogContentText>
          <Select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            displayEmpty
            fullWidth
            size="small"
          >
            <MenuItem value="" disabled>{t('workspace.project.timeline.states.selectTemplate')}</MenuItem>
            {phaseTemplates.map((template) => (
              <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceConfirmOpen(false)}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={!selectedTemplateId}
            onClick={async () => {
              if (!selectedTemplateId) return;
              try {
                await api.post(`/portfolio/projects/${projectId}/apply-template`, {
                  template_id: selectedTemplateId,
                  replace: true,
                });
                await onRefetch();
                setSelectedTemplateId('');
                setReplaceConfirmOpen(false);
              } catch (error: any) {
                onError(
                  getApiErrorMessage(error, t, t('workspace.project.timeline.messages.applyTemplateFailed')),
                );
              }
            }}
          >
            {t('workspace.project.timeline.actions.replaceAll')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
