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
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EventIcon from '@mui/icons-material/Event';
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
import { getDotColor } from '../../../../utils/statusColors';
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
  const [plannedYear, plannedMonth, plannedDay] = getDatePart(planned).split('-').map(Number);
  const [baselineYear, baselineMonth, baselineDay] = getDatePart(baseline).split('-').map(Number);
  if (!plannedYear || !plannedMonth || !plannedDay || !baselineYear || !baselineMonth || !baselineDay) return null;
  const plannedTime = Date.UTC(plannedYear, plannedMonth - 1, plannedDay);
  const baselineTime = Date.UTC(baselineYear, baselineMonth - 1, baselineDay);
  return Math.round((plannedTime - baselineTime) / (1000 * 60 * 60 * 24));
}

function getDatePart(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value;
}

function formatShortDate(value: string | null | undefined, locale: string): string {
  const datePart = getDatePart(value);
  if (!datePart) return '–';
  const [yearText, monthText, dayText] = datePart.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return '–';

  const date = new Date(year, month - 1, day);
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);
  const dayPart = parts.find((part) => part.type === 'day')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;
  const yearPart = parts.find((part) => part.type === 'year')?.value;

  return [dayPart, monthPart, yearPart].filter(Boolean).join(' ') || '–';
}

function formatCompactVariance(diff: number | null): { text: string; tone: 'late' | 'early' } | null {
  if (diff == null || diff === 0) return null;
  return {
    text: `${Math.abs(diff)}d ${diff > 0 ? 'late' : 'early'}`,
    tone: diff > 0 ? 'late' : 'early',
  };
}

function getPhaseStatusColorName(status: string): string {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'pending') return 'warning';
  return 'default';
}

function PhaseStatusValue({ status }: { status: string }) {
  const { t } = useTranslation(['portfolio']);

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
      <Box
        component="span"
        sx={(theme) => ({
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: getDotColor(getPhaseStatusColorName(status), theme.palette.mode),
        })}
      />
      <Box component="span" sx={(theme) => ({ fontSize: 13, fontWeight: 400, color: theme.palette.kanap.text.primary })}>
        {getPhaseStatusLabel(t, status)}
      </Box>
    </Box>
  );
}

function CompactPhaseDateField({
  disabled,
  locale,
  onChangeYmd,
  valueYmd,
}: {
  disabled?: boolean;
  locale: string;
  onChangeYmd: (next: string) => void;
  valueYmd?: string | null;
}) {
  const nativeRef = React.useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = React.useState(false);
  const normalizedYmd = getDatePart(valueYmd);

  const openPicker = () => {
    if (disabled) return;
    nativeRef.current?.showPicker?.();
    if (!nativeRef.current?.showPicker) nativeRef.current?.click();
  };

  return (
    <Box
      className="kanap-phase-date-field"
      sx={{
        position: 'relative',
        '&:hover .kanap-phase-calendar-button': {
          opacity: disabled ? 0 : 1,
        },
      }}
    >
      <input
        ref={nativeRef}
        type="date"
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
        value={normalizedYmd}
        disabled={disabled}
        onChange={(event) => onChangeYmd(event.target.value || '')}
      />
      <TextField
        value={formatShortDate(valueYmd, locale)}
        disabled={disabled}
        fullWidth
        onClick={openPicker}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        inputProps={{ readOnly: true }}
        InputProps={{
          disableUnderline: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                className="kanap-phase-calendar-button"
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  openPicker();
                }}
                aria-label="Open calendar"
                tabIndex={-1}
                disabled={disabled}
                sx={{
                  opacity: focused && !disabled ? 1 : 0,
                  transition: 'opacity 0.15s',
                  p: '2px',
                }}
              >
                <EventIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={(theme) => ({
          '& .MuiInputBase-root': {
            color: theme.palette.kanap.text.primary,
            fontFamily: theme.typography.fontFamily,
            fontSize: 13,
            fontWeight: 400,
            cursor: disabled ? 'default' : 'pointer',
          },
          '& .MuiInputBase-input': {
            p: '0 !important',
            height: 20,
            fontFamily: theme.typography.fontFamily,
            fontSize: 13,
            fontWeight: 400,
            cursor: disabled ? 'default' : 'pointer',
          },
          '& .MuiInputAdornment-root': {
            m: 0,
          },
        })}
      />
    </Box>
  );
}

const sectionSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const sectionHeadSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
};

const sectionTitleSx: SxProps<Theme> = (theme) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.4,
  color: theme.palette.kanap.text.primary,
});

const linkTealButtonSx: SxProps<Theme> = (theme) => ({
  minWidth: 0,
  height: 'auto',
  p: 0,
  color: theme.palette.kanap.teal,
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.4,
  '&:hover': {
    bgcolor: 'transparent',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
});

const phaseTableSx: SxProps<Theme> = (theme) => ({
  '& .MuiTableCell-head': {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.kanap.text.tertiary,
    textAlign: 'left',
    p: '8px 10px',
    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
  },
  '& .MuiTableCell-body': {
    fontSize: 13,
    fontWeight: 400,
    color: theme.palette.kanap.text.primary,
    p: '10px 10px',
    borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
    verticalAlign: 'middle',
  },
  '& .kanap-phase-row:hover .MuiTableCell-body': {
    bgcolor: theme.palette.action.hover,
  },
  '& .kanap-phase-row:focus-within .phase-row-actions, & .kanap-phase-row:hover .phase-row-actions': {
    opacity: 1,
  },
  '& .phase-row-actions': {
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  '& .kanap-phase-index': {
    fontSize: 12,
    fontWeight: 400,
    color: theme.palette.kanap.text.tertiary,
  },
  '& .kanap-phase-index svg': {
    color: theme.palette.kanap.text.tertiary,
    fontSize: 15,
  },
  '& .MuiInputBase-input': {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: 400,
    color: theme.palette.kanap.text.primary,
  },
  '& .MuiInputBase-input.Mui-disabled, & .MuiInputBase-root.Mui-disabled .MuiSelect-select': {
    WebkitTextFillColor: theme.palette.kanap.text.primary,
    color: theme.palette.kanap.text.primary,
  },
  '& .MuiInput-root:before, & .MuiInput-root:hover:not(.Mui-disabled):before, & .MuiInput-root:after': {
    borderBottom: 0,
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    p: '0 !important',
    minHeight: '20px !important',
  },
  '& .MuiSelect-icon': {
    color: theme.palette.kanap.text.tertiary,
    fontSize: 18,
  },
});

const timelineTableSx: SxProps<Theme> = (theme) => ({
  width: '100%',
  borderCollapse: 'collapse',
  '& .MuiTableCell-head': {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.kanap.text.tertiary,
    textAlign: 'left',
    p: '6px 12px 6px 0',
    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
  },
  '& .MuiTableCell-body': {
    fontSize: 13,
    p: '8px 12px 8px 0',
    borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
    verticalAlign: 'baseline',
  },
  '& .kanap-tl-label': {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.kanap.text.tertiary,
    cursor: 'help',
    borderBottom: `1px dotted ${theme.palette.kanap.text.tertiary}`,
  },
  '& .kanap-tl-sublabel': {
    fontSize: 11,
    fontWeight: 400,
    color: theme.palette.kanap.text.tertiary,
    ml: '6px',
  },
  '& .kanap-tl-value': {
    color: theme.palette.kanap.text.primary,
  },
  '& .kanap-tl-variance': {
    whiteSpace: 'nowrap',
  },
  '& .kanap-tl-sep': {
    color: theme.palette.kanap.text.tertiary,
    mx: '6px',
  },
  '& .kanap-bl-late': {
    color: theme.palette.kanap.danger,
    fontSize: 12,
  },
  '& .kanap-bl-early': {
    color: theme.palette.kanap.teal,
    fontSize: 12,
  },
});

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
  const locale = useLocale();
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
    <TableRow ref={setNodeRef} style={style} className="kanap-phase-row">
      <TableCell
        className="kanap-phase-index"
        sx={{ width: 56, cursor: canManage ? 'grab' : 'default', px: 1 }}
        {...attributes}
        {...listeners}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {canManage && <DragIndicatorIcon />}
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
        <CompactPhaseDateField
          valueYmd={phase.planned_start || ''}
          locale={locale}
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
        <CompactPhaseDateField
          valueYmd={phase.planned_end || ''}
          locale={locale}
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
          disableUnderline
          disabled={!canManage}
          renderValue={(value) => <PhaseStatusValue status={String(value)} />}
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
          <MenuItem value="pending"><PhaseStatusValue status="pending" /></MenuItem>
          <MenuItem value="in_progress"><PhaseStatusValue status="in_progress" /></MenuItem>
          <MenuItem value="completed"><PhaseStatusValue status="completed" /></MenuItem>
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
        <Stack className="phase-row-actions" direction="row" spacing={0}>
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
  const baselineStartDisplay = formatCompactVariance(baselineStartVariance);
  const baselineEndDisplay = formatCompactVariance(baselineEndVariance);
  const hasBaseline = !!(form?.baseline_start_date || form?.baseline_end_date);

  return (
    <Stack spacing={3}>
      {(form?.phases?.length || 0) === 0 ? (
        <Box className="kanap-section" sx={sectionSx}>
          <Box className="kanap-section-head" sx={sectionHeadSx}>
            <Typography className="kanap-section-title" sx={sectionTitleSx}>
              {t('workspace.project.timeline.sections.phases')}
            </Typography>
          </Box>
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
        <Box className="kanap-section" sx={sectionSx}>
          <Box className="kanap-section-head" sx={sectionHeadSx}>
            <Typography className="kanap-section-title" sx={sectionTitleSx}>
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
          </Box>
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
                <Table className="kanap-phases-table" size="small" sx={phaseTableSx}>
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
      <Box className="kanap-section" sx={sectionSx}>
        <Box className="kanap-section-head" sx={sectionHeadSx}>
          <Typography className="kanap-section-title" sx={sectionTitleSx}>
            {t('workspace.project.timeline.sections.milestones')}
          </Typography>
          <Button
            className="kanap-link-teal"
            sx={linkTealButtonSx}
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
            + Add milestone
          </Button>
        </Box>
        {(form?.milestones?.length || 0) === 0 ? (
          <Typography className="kanap-empty-state" sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.tertiary, m: 0 })}>
            No milestones defined.
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

      <Divider />
      <Box className="kanap-section" sx={sectionSx}>
        <Box className="kanap-section-head" sx={sectionHeadSx}>
          <Typography className="kanap-section-title" sx={sectionTitleSx}>
            Project timeline
          </Typography>
        </Box>

        <Table className="kanap-timeline-table" size="small" sx={timelineTableSx}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 100 }} />
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Tooltip title="Date when the project status was changed to In Progress">
                  <Box component="span" className="kanap-tl-label">Actual</Box>
                </Tooltip>
              </TableCell>
              <TableCell className="kanap-tl-value">
                {formatShortDate(form?.actual_start, locale)}
              </TableCell>
              <TableCell className="kanap-tl-value">
                {formatShortDate(form?.actual_end, locale)}
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow>
              <TableCell>
                <Tooltip title="Target dates set by the project manager during planning">
                  <Box component="span" className="kanap-tl-label">Planned</Box>
                </Tooltip>
              </TableCell>
              <TableCell className="kanap-tl-value">
                {formatShortDate(form?.planned_start, locale)}
              </TableCell>
              <TableCell className="kanap-tl-value">
                {formatShortDate(form?.planned_end, locale)}
              </TableCell>
              <TableCell />
            </TableRow>
            {hasBaseline && (
              <TableRow>
                <TableCell>
                  <Tooltip title="Snapshot of planned dates captured when the project entered In Progress">
                    <Box component="span" className="kanap-tl-label">
                      Baseline
                      <Box component="span" className="kanap-tl-sublabel">
                        at In Progress
                      </Box>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell className="kanap-tl-value">
                  {formatShortDate(form?.baseline_start_date, locale)}
                </TableCell>
                <TableCell className="kanap-tl-value">
                  {formatShortDate(form?.baseline_end_date, locale)}
                </TableCell>
                <TableCell className="kanap-tl-variance">
                  {baselineStartDisplay && (
                    <Box
                      component="span"
                      className={baselineStartDisplay.tone === 'late' ? 'kanap-bl-late' : 'kanap-bl-early'}
                    >
                      {baselineStartDisplay.text}
                    </Box>
                  )}
                  {baselineStartDisplay && baselineEndDisplay && (
                    <Box component="span" className="kanap-tl-sep">·</Box>
                  )}
                  {baselineEndDisplay && (
                    <Box
                      component="span"
                      className={baselineEndDisplay.tone === 'late' ? 'kanap-bl-late' : 'kanap-bl-early'}
                    >
                      {baselineEndDisplay.text}
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

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
