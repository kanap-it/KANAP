import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useTranslation } from 'react-i18next';
import { Gantt } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/style.css';
import api from '../../../api';
import LightModeIsland from '../../../components/LightModeIsland';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';

interface ProjectPhase {
  id: string;
  name: string;
  planned_start: string | null;
  planned_end: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  sequence: number;
}

interface Props {
  projectId: string;
  phases: ProjectPhase[];
  onUpdate: () => void;
  canManage: boolean;
  tableView: React.ReactNode; // The existing table view to render
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#ffa726',
  in_progress: '#42a5f5',
  completed: '#66bb6a',
};

export function ProjectTimeline({ projectId, phases, onUpdate, canManage, tableView }: Props) {
  const { t } = useTranslation(['portfolio', 'errors']);
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');

  // Transform phases to Gantt format (only phases with dates)
  const ganttTasks = useMemo(() => phases
    .filter((p) => p.planned_start && p.planned_end)
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => ({
      id: p.id,
      text: p.name,
      start: new Date(p.planned_start!),
      end: new Date(p.planned_end!),
      progress: p.status === 'completed' ? 1 : p.status === 'in_progress' ? 0.5 : 0,
      type: 'task' as const,
      _status: p.status,
    })), [phases]);

  // Timezone-safe date formatting
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle task update in Gantt (after drag ends)
  const handleGanttUpdate = useCallback(async (ev: {
    id: string | number;
    task: { start?: Date; end?: Date };
    inProgress?: boolean;
  }) => {
    // Only process when drag is complete
    if (ev.inProgress || !canManage) return;

    const { id, task } = ev;
    if (!task.start || !task.end) return;

    // Validate end >= start
    if (task.end < task.start) {
      alert(t('workspace.project.timeline.messages.invalidDateRange'));
      onUpdate();
      return;
    }
    try {
      await api.patch(`/portfolio/projects/${projectId}/phases/${id}`, {
        planned_start: formatLocalDate(task.start),
        planned_end: formatLocalDate(task.end),
      });
      onUpdate();
    } catch (e: any) {
      alert(getApiErrorMessage(e, t, t('workspace.project.timeline.messages.updatePhaseFailed')));
      onUpdate();
    }
  }, [projectId, onUpdate, canManage, t]);

  // Custom task template for status colors
  const taskTemplate = useCallback(({ data }: { data: any }) => {
    const status = data._status || 'pending';
    const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return (
      <div
        style={{
          backgroundColor: color,
          height: '100%',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '8px',
          color: '#fff',
          fontSize: '12px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.text}
      </div>
    );
  }, []);

  return (
    <Box>
      {/* View Toggle - only show if there are phases with dates */}
      {phases.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="table">
              <ViewListIcon sx={{ mr: 0.5 }} fontSize="small" />
              {t('workspace.project.timeline.views.table')}
            </ToggleButton>
            <ToggleButton value="gantt">
              <BarChartIcon sx={{ mr: 0.5 }} fontSize="small" />
              {t('workspace.project.timeline.views.gantt')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Table View */}
      {viewMode === 'table' && tableView}

      {/* Gantt View */}
      {viewMode === 'gantt' && (
        <LightModeIsland sx={{ p: 0 }}>
          <Box sx={{ height: 400 }}>
            {ganttTasks.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body1">{t('workspace.project.timeline.states.noPlannedPhases')}</Typography>
                <Typography variant="body2">
                  {t('workspace.project.timeline.states.noPlannedPhasesHelp')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ height: '100%' }}>
                <Gantt
                  tasks={ganttTasks}
                  scales={[
                    { unit: 'month', step: 1, format: 'MMM yyyy' },
                    { unit: 'week', step: 1, format: 'w' },
                  ]}
                  cellWidth={40}
                  cellHeight={38}
                  columns={[
                    { id: 'text', header: t('workspace.project.fields.phase'), width: 180, flexgrow: 1 },
                  ]}
                  taskTemplate={taskTemplate}
                  readonly={!canManage}
                  onupdatetask={handleGanttUpdate}
                />
              </Box>
            )}
          </Box>
        </LightModeIsland>
      )}
    </Box>
  );
}
