import React from 'react';
import {
  Avatar,
  Box,
  Menu,
  MenuItem,
  Popover,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { taskDetailTokens, taskDetailTypography, STATUS_DOT_COLORS, PRIORITY_DOT_COLORS, getScoreColor } from '../theme/taskDetailTokens';
import type { PriorityLevel } from '../theme/taskDetailTokens';
import type { TaskStatus } from '../task.constants';
import { TASK_STATUS_OPTIONS } from '../task.constants';
import { getTaskStatusLabel, getPriorityLabel } from '../../../utils/portfolioI18n';
import UserSelect from '../../../components/fields/UserSelect';
import DateEUField from '../../../components/fields/DateEUField';

interface TaskMetadataBarProps {
  status: TaskStatus;
  priorityLevel: PriorityLevel;
  priorityScore: number;
  assigneeUserId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  readOnly?: boolean;
  isProjectTask?: boolean;
  onPatch: (patch: Record<string, any>) => void;
  projectId?: string | null;
  projectName?: string | null;
  onNavigateToProject?: (projectId: string) => void;
}

/* ---- Shared chip style ---- */

const metaItemSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  cursor: 'pointer',
  ...taskDetailTypography.metaChip,
} as const;

const metaLabelSx = {
  ...taskDetailTypography.metaLabel,
} as const;

const dotSx = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
} as const;

/* ================================================================== */
/*  StatusChip                                                        */
/* ================================================================== */

function StatusChip({ status, readOnly, onPatch }: { status: TaskStatus; readOnly?: boolean; onPatch: (p: Record<string, any>) => void }) {
  const { t } = useTranslation('portfolio');
  const theme = useTheme();
  const mode = theme.palette.mode;
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const color = STATUS_DOT_COLORS[status]?.[mode] ?? STATUS_DOT_COLORS.open[mode];

  return (
    <>
      <Box
        sx={{ ...metaItemSx, color: theme.palette.kanap.text.primary, ...(readOnly && { cursor: 'default' }) }}
        onClick={readOnly ? undefined : (e) => setAnchor(e.currentTarget)}
      >
        <Box component="span" sx={{ ...dotSx, bgcolor: color }} />
        <span>{getTaskStatusLabel(t, status)}</span>
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {TASK_STATUS_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={opt.value === status}
            onClick={() => { onPatch({ status: opt.value }); setAnchor(null); }}
            sx={{ gap: '8px', fontSize: 13 }}
          >
            <Box component="span" sx={{ ...dotSx, bgcolor: STATUS_DOT_COLORS[opt.value]?.[mode] }} />
            {getTaskStatusLabel(t, opt.value)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/* ================================================================== */
/*  PriorityChip                                                      */
/* ================================================================== */

const PRIORITY_OPTIONS: PriorityLevel[] = ['blocker', 'high', 'normal', 'low', 'optional'];

function PriorityChip({ priority, readOnly, onPatch }: { priority: PriorityLevel; readOnly?: boolean; onPatch: (p: Record<string, any>) => void }) {
  const { t } = useTranslation('portfolio');
  const theme = useTheme();
  const mode = theme.palette.mode;
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  return (
    <>
      <Box
        sx={{ ...metaItemSx, color: theme.palette.kanap.text.primary, ...(readOnly && { cursor: 'default' }) }}
        onClick={readOnly ? undefined : (e) => setAnchor(e.currentTarget)}
      >
        <Box component="span" sx={{ ...metaLabelSx, color: theme.palette.kanap.text.tertiary }}>
          {t('workspace.task.sidebar.fields.priority')}
        </Box>
        <span>{getPriorityLabel(t, priority)}</span>
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {PRIORITY_OPTIONS.map((p) => (
          <MenuItem
            key={p}
            selected={p === priority}
            onClick={() => { onPatch({ priority_level: p }); setAnchor(null); }}
            sx={{ gap: '8px', fontSize: 13 }}
          >
            <Box component="span" sx={{ ...dotSx, bgcolor: PRIORITY_DOT_COLORS[p]?.[mode] }} />
            {getPriorityLabel(t, p)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/* ================================================================== */
/*  ScoreChip                                                         */
/* ================================================================== */

function ScoreChip({ score, isProjectTask }: { score: number; isProjectTask?: boolean }) {
  const { t } = useTranslation('portfolio');
  const theme = useTheme();
  const mode = theme.palette.mode;

  if (!isProjectTask || score == null) return null;

  const color = getScoreColor(score, mode);

  return (
    <Tooltip title={t('workspace.task.priority.title')} arrow>
      <Box sx={{ ...metaItemSx, cursor: 'default', color: theme.palette.kanap.text.primary }}>
        <Box component="span" sx={{ ...dotSx, bgcolor: color }} />
        <Box component="span" sx={{ ...taskDetailTypography.scoreValue }}>
          {Math.round(score)}
        </Box>
      </Box>
    </Tooltip>
  );
}

/* ================================================================== */
/*  AssigneeChip                                                      */
/* ================================================================== */

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase() || '?';
}

function AssigneeChip({ userId, name, readOnly, onPatch }: { userId: string | null; name: string | null; readOnly?: boolean; onPatch: (p: Record<string, any>) => void }) {
  const { t } = useTranslation('portfolio');
  const theme = useTheme();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  const displayName = name || t('workspace.task.sidebar.values.unassigned');

  return (
    <>
      <Box
        sx={{ ...metaItemSx, color: theme.palette.kanap.text.primary, ...(readOnly && { cursor: 'default' }) }}
        onClick={readOnly ? undefined : (e) => setAnchor(e.currentTarget)}
      >
        <Avatar
          sx={{
            width: taskDetailAvatarSizes.metadata,
            height: taskDetailAvatarSizes.metadata,
            fontSize: 9,
            fontWeight: 500,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          {getInitials(name)}
        </Avatar>
        <span>{displayName}</span>
      </Box>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, width: 260 } } }}
      >
        <UserSelect
          label={t('workspace.task.sidebar.fields.assignee')}
          value={userId}
          onChange={(v) => { onPatch({ assignee_user_id: v }); setAnchor(null); }}
          size="small"
        />
      </Popover>
    </>
  );
}

/* ================================================================== */
/*  DueDateChip                                                       */
/* ================================================================== */

function toYmdOnly(value: string | null): string {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  return value;
}

function formatShortDate(value: string | null): string {
  if (!value) return 'Not set';
  // Handle both YYYY-MM-DD and ISO datetime formats
  const d = new Date(value.includes('T') ? value : value + 'T00:00:00');
  if (isNaN(d.getTime())) return value;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function DueDateChip({ dueDate, readOnly, onPatch }: { dueDate: string | null; readOnly?: boolean; onPatch: (p: Record<string, any>) => void }) {
  const { t } = useTranslation('portfolio');
  const theme = useTheme();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  return (
    <>
      <Box
        sx={{ ...metaItemSx, color: theme.palette.kanap.text.primary, ...(readOnly && { cursor: 'default' }) }}
        onClick={readOnly ? undefined : (e) => setAnchor(e.currentTarget)}
      >
        <Box component="span" sx={{ ...metaLabelSx, color: theme.palette.kanap.text.tertiary }}>
          {t('workspace.task.sidebar.fields.dueDate')}
        </Box>
        <span>{formatShortDate(dueDate)}</span>
      </Box>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, width: 220 } } }}
      >
        <DateEUField
          label={t('workspace.task.sidebar.fields.dueDate')}
          valueYmd={toYmdOnly(dueDate)}
          onChangeYmd={(v) => { onPatch({ due_date: v || null }); setAnchor(null); }}
          size="small"
        />
      </Popover>
    </>
  );
}

/* ================================================================== */
/*  TaskMetadataBar                                                   */
/* ================================================================== */

import { taskDetailAvatarSizes } from '../theme/taskDetailTokens';

export default function TaskMetadataBar({
  status,
  priorityLevel,
  priorityScore,
  assigneeUserId,
  assigneeName,
  dueDate,
  readOnly,
  isProjectTask,
  onPatch,
  projectId,
  projectName,
  onNavigateToProject,
}: TaskMetadataBarProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: taskDetailTokens.metadataBar.gap,
        flexWrap: 'wrap',
        fontSize: '12px',
      }}
    >
      <StatusChip status={status} readOnly={readOnly} onPatch={onPatch} />
      <ScoreChip score={priorityScore} isProjectTask={isProjectTask} />
      <PriorityChip priority={priorityLevel} readOnly={readOnly} onPatch={onPatch} />
      <AssigneeChip userId={assigneeUserId} name={assigneeName} readOnly={readOnly} onPatch={onPatch} />
      <DueDateChip dueDate={dueDate} readOnly={readOnly} onPatch={onPatch} />

      {/* Project chip — clickable link to project workspace */}
      {isProjectTask && projectId && projectName && onNavigateToProject && (
        <Box
          component="a"
          href={`/portfolio/projects/${projectId}`}
          onClick={(e: React.MouseEvent) => { e.preventDefault(); onNavigateToProject(projectId); }}
          title={projectName}
          sx={{
            ...metaItemSx,
            textDecoration: 'none',
            color: theme.palette.kanap.text.primary,
            '&:hover .kanap-meta-project-name': {
              textDecoration: 'underline',
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
            },
            '&:hover .kanap-meta-arrow': {
              color: theme.palette.kanap.text.secondary,
            },
          }}
        >
          <Box component="span" sx={{ ...metaLabelSx, color: theme.palette.kanap.text.tertiary }}>
            Project
          </Box>
          <Box
            component="span"
            className="kanap-meta-project-name"
            sx={{
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {projectName}
          </Box>
          <Box
            component="span"
            className="kanap-meta-arrow"
            sx={{
              color: theme.palette.kanap.text.tertiary,
              fontSize: '11px',
              ml: '2px',
              transition: 'color 0.15s',
            }}
          >
            ↗
          </Box>
        </Box>
      )}
    </Box>
  );
}
