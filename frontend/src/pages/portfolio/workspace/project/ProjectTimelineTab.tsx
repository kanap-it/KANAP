import React from 'react';
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
import api from '../../../../api';
import DateEUField from '../../../../components/fields/DateEUField';
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
            } catch {}
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
            } catch {}
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
            } catch {}
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
            } catch {}
          }}
        >
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="in_progress">In Progress</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
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
                milestone_name: `${phase.name} Complete`,
              });
              await onRefetch();
            } catch (error: any) {
              onError(error?.response?.data?.message || 'Failed to toggle milestone');
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0}>
          <IconButton
            size="small"
            disabled={!canManage}
            title="Add task to phase"
            onClick={() => {
              onNavigateToTask(`/portfolio/tasks/new/overview?projectId=${projectId}&phaseId=${phase.id}`);
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={!canManage}
            title="Delete phase"
            onClick={async () => {
              try {
                await api.delete(`/portfolio/projects/${projectId}/phases/${phase.id}`);
                await onRefetch();
              } catch {}
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function getDateVariance(planned: string | null, baseline: string | null): string | null {
  if (!planned || !baseline) return null;
  const plannedTime = new Date(planned).getTime();
  const baselineTime = new Date(baseline).getTime();
  const diff = Math.round((plannedTime - baselineTime) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'On Track';
  if (diff > 0) return `+${diff} days`;
  return `${diff} days`;
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
      onError(error?.response?.data?.message || 'Failed to reorder phases');
    }
  }, [form?.phases, onError, onRefetch, onSetForm, projectId]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Project Dates</Typography>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <DateEUField
              label="Planned Start"
              valueYmd={form?.planned_start || ''}
              onChangeYmd={(value) => onUpdate({ planned_start: value })}
            />
            <DateEUField
              label="Planned End"
              valueYmd={form?.planned_end || ''}
              onChangeYmd={(value) => onUpdate({ planned_end: value })}
            />
          </Stack>
          {(form?.actual_start || form?.actual_end) && (
            <Stack direction="row" spacing={2}>
              <TextField
                label="Actual Start"
                value={form?.actual_start ? new Date(form.actual_start).toLocaleDateString() : '-'}
                disabled
                sx={{ flex: 1 }}
              />
              <TextField
                label="Actual End"
                value={form?.actual_end ? new Date(form.actual_end).toLocaleDateString() : '-'}
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Apply Phase Template</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              displayEmpty
              size="small"
              sx={{ minWidth: 250 }}
            >
              <MenuItem value="" disabled>Select a template...</MenuItem>
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
                  onError(error?.response?.data?.message || 'Failed to apply template');
                }
              }}
            >
              Apply Template
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Phases</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled={!canManage}
                onClick={async () => {
                  try {
                    await api.post(`/portfolio/projects/${projectId}/phases`, { name: 'New Phase' });
                    await onRefetch();
                  } catch (error: any) {
                    onError(error?.response?.data?.message || 'Failed to add phase');
                  }
                }}
              >
                Add Phase
              </Button>
              <Button
                size="small"
                color="warning"
                disabled={!canManage}
                onClick={() => setReplaceConfirmOpen(true)}
              >
                Replace with Template
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
                      <TableCell>Name</TableCell>
                      <TableCell sx={{ width: 140 }}>Start</TableCell>
                      <TableCell sx={{ width: 140 }}>End</TableCell>
                      <TableCell sx={{ width: 130 }}>Status</TableCell>
                      <TableCell sx={{ width: 80, textAlign: 'center' }}>Milestone</TableCell>
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Milestones</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={!canManage}
            onClick={async () => {
              try {
                await api.post(`/portfolio/projects/${projectId}/milestones`, { name: 'New Milestone' });
                await onRefetch();
              } catch (error: any) {
                onError(error?.response?.data?.message || 'Failed to add milestone');
              }
            }}
          >
            Add Milestone
          </Button>
        </Stack>
        {(form?.milestones?.length || 0) === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No milestones defined. Add milestones manually or enable phase milestones above.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell sx={{ width: 180 }}>Phase</TableCell>
                <TableCell sx={{ width: 140 }}>Target Date</TableCell>
                <TableCell sx={{ width: 130 }}>Status</TableCell>
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
                          } catch {}
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
                          } catch {}
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
                          } catch {}
                        }}
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="achieved">Achieved</MenuItem>
                        <MenuItem value="missed">Missed</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        disabled={!canManage || !!linkedPhase}
                        title={linkedPhase ? 'Uncheck phase milestone to delete' : undefined}
                        onClick={async () => {
                          try {
                            await api.delete(`/portfolio/projects/${projectId}/milestones/${milestone.id}`);
                            await onRefetch();
                          } catch {}
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Baseline (captured at In Progress)</Typography>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Baseline Start</Typography>
              <Typography>{form?.baseline_start_date ? new Date(form.baseline_start_date).toLocaleDateString() : '-'}</Typography>
              {getDateVariance(form?.planned_start, form?.baseline_start_date) && (
                <Typography variant="caption" color={getDateVariance(form?.planned_start, form?.baseline_start_date)?.startsWith('+') ? 'error.main' : 'success.main'}>
                  {getDateVariance(form?.planned_start, form?.baseline_start_date)}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Baseline End</Typography>
              <Typography>{form?.baseline_end_date ? new Date(form.baseline_end_date).toLocaleDateString() : '-'}</Typography>
              {getDateVariance(form?.planned_end, form?.baseline_end_date) && (
                <Typography variant="caption" color={getDateVariance(form?.planned_end, form?.baseline_end_date)?.startsWith('+') ? 'error.main' : 'success.main'}>
                  {getDateVariance(form?.planned_end, form?.baseline_end_date)}
                </Typography>
              )}
            </Box>
          </Stack>
        </>
      )}

      <Dialog open={replaceConfirmOpen} onClose={() => setReplaceConfirmOpen(false)}>
        <DialogTitle>Replace All Phases?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will delete all existing phases and milestones, then apply the selected template.
          </DialogContentText>
          <Select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            displayEmpty
            fullWidth
            size="small"
          >
            <MenuItem value="" disabled>Select a template...</MenuItem>
            {phaseTemplates.map((template) => (
              <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceConfirmOpen(false)}>Cancel</Button>
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
                onError(error?.response?.data?.message || 'Failed to apply template');
              }
            }}
          >
            Replace All
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
