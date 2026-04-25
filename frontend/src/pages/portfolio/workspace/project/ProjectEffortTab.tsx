import React from 'react';
import type { TFunction } from 'i18next';
import {
  Box,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import { getApiErrorMessage } from '../../../../utils/apiErrorMessage';
import { useLocale } from '../../../../i18n/useLocale';
import EffortAllocationDialog, { type EligibleUser } from '../../components/EffortAllocationDialog';
import { type AllocationUser, type EffortAllocationData } from '../../components/EffortAllocationTable';
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

function getDatePart(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value;
}

function formatShortDate(value: string | null | undefined, locale: string): string {
  const datePart = getDatePart(value);
  if (!datePart) return '-';
  const [yearText, monthText, dayText] = datePart.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return '-';

  const date = new Date(year, month - 1, day);
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);
  const dayPart = parts.find((part) => part.type === 'day')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;
  const yearPart = parts.find((part) => part.type === 'year')?.value;

  return [dayPart, monthPart, yearPart].filter(Boolean).join(' ') || '-';
}

function formatMd(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const overviewSliderSx: SxProps<Theme> = (theme) => ({
  width: 200,
  height: 4,
  p: '0 !important',
  '& .MuiSlider-rail': { bgcolor: theme.palette.kanap.sliderTrack, opacity: 1 },
  '& .MuiSlider-track': { bgcolor: theme.palette.kanap.teal },
  '& .MuiSlider-thumb': { width: 10, height: 10, bgcolor: theme.palette.kanap.teal },
});

const effortTabSx: SxProps<Theme> = (theme) => ({
  '& .kanap-section': {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  '& .kanap-section-head': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  '& .kanap-section-title': {
    m: 0,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    color: theme.palette.kanap.text.primary,
  },
  '& .kanap-section-subtitle': {
    fontSize: 11,
    fontWeight: 400,
    color: theme.palette.kanap.text.tertiary,
    ml: '8px',
  },
  '& .kanap-link-teal': {
    appearance: 'none',
    border: 0,
    bgcolor: 'transparent',
    background: 'transparent',
    p: 0,
    m: 0,
    color: theme.palette.kanap.teal,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.4,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  '& .kanap-link-teal:hover': {
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  '& .kanap-link-teal:disabled': {
    color: theme.palette.kanap.text.tertiary,
    cursor: 'default',
    textDecoration: 'none',
  },
  '& .kanap-effort-overview': {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '28px',
    flexWrap: 'wrap',
    fontSize: 13,
    p: '14px 18px',
    bgcolor: theme.palette.kanap.bg.drawer,
    borderRadius: '8px',
    border: `1px solid ${theme.palette.kanap.border.soft}`,
    width: '100%',
    boxSizing: 'border-box',
  },
  '& .kanap-ov-group': {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  '& .kanap-ov-main': {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  '& .kanap-ov-label': {
    fontSize: 12,
    color: theme.palette.kanap.text.tertiary,
    whiteSpace: 'nowrap',
  },
  '& .kanap-ov-val': {
    fontWeight: 500,
    color: theme.palette.kanap.text.primary,
  },
  '& .kanap-ov-sub': {
    fontSize: 11,
    color: theme.palette.kanap.text.tertiary,
  },
  '& .kanap-ov-source': {
    fontSize: 10,
    color: theme.palette.kanap.text.tertiary,
    pl: 0,
  },
  '& .kanap-ov-meter': {
    width: 200,
    height: 4,
    borderRadius: '2px',
    overflow: 'hidden',
    bgcolor: theme.palette.kanap.sliderTrack,
  },
  '& .kanap-ov-meter-fill': {
    height: '100%',
    bgcolor: theme.palette.kanap.teal,
  },
  '& .kanap-alloc-grid': {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
    columnGap: '48px',
    rowGap: '24px',
  },
  '& .kanap-alloc-block + .kanap-alloc-block': {
    borderLeft: { xs: 0, md: `1px solid ${theme.palette.kanap.border.soft}` },
    pl: { xs: 0, md: '24px' },
  },
  '& .kanap-alloc-head': {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    mb: '10px',
    flexWrap: 'wrap',
  },
  '& .kanap-alloc-title, & .kanap-alloc-total': {
    fontSize: 13,
    fontWeight: 500,
    color: theme.palette.kanap.text.primary,
  },
  '& .kanap-alloc-total': {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  '& .kanap-alloc-effort-input': {
    width: '52px',
    border: 0,
    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
    borderRadius: 0,
    p: 0,
    bgcolor: 'transparent',
    color: theme.palette.kanap.text.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
    textAlign: 'right',
    outline: 'none',
  },
  '& .kanap-alloc-effort-input:focus': {
    borderBottomColor: theme.palette.kanap.teal,
  },
  '& .kanap-alloc-effort-input:disabled': {
    color: theme.palette.kanap.text.primary,
    borderBottomColor: 'transparent',
    WebkitTextFillColor: theme.palette.kanap.text.primary,
  },
  '& .kanap-alloc-tag': {
    fontSize: 11,
    color: theme.palette.kanap.text.tertiary,
  },
  '& .kanap-lead-tag': {
    fontSize: 10,
    color: theme.palette.kanap.text.tertiary,
    ml: '6px',
    fontWeight: 400,
  },
  '& .kanap-orphan-tag': {
    fontSize: 10,
    color: theme.palette.warning.main,
    ml: '6px',
    fontWeight: 400,
  },
  '& .kanap-alloc-warning': {
    mb: '8px',
    fontSize: 11,
    color: theme.palette.warning.main,
  },
  '& .kanap-table': {
    width: '100%',
    borderCollapse: 'collapse',
  },
  '& .kanap-table th': {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.kanap.text.tertiary,
    textAlign: 'left',
    p: '6px 8px',
    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
  },
  '& .kanap-table th.r': { textAlign: 'right' },
  '& .kanap-table td': {
    fontSize: 13,
    fontWeight: 400,
    color: theme.palette.kanap.text.primary,
    p: '8px 8px',
    borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
    verticalAlign: 'middle',
  },
  '& .kanap-table td.r': { textAlign: 'right' },
  '& .kanap-table tr:hover td': {
    bgcolor: theme.palette.action.hover,
  },
  '& .kanap-text-tertiary': {
    color: theme.palette.kanap.text.tertiary,
  },
  '& .kanap-link-subtle': {
    color: theme.palette.kanap.text.primary,
    textDecoration: 'none',
  },
  '& .kanap-link-subtle:hover': {
    color: theme.palette.kanap.teal,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  '& .kanap-bl-table': {
    width: 'auto',
    borderCollapse: 'collapse',
  },
  '& .kanap-bl-table th': {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.kanap.text.tertiary,
    textAlign: 'left',
    p: '6px 16px 6px 0',
    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
  },
  '& .kanap-bl-table td': {
    fontSize: 13,
    p: '6px 16px 6px 0',
    borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
  },
  '& .kanap-bl-label': {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.kanap.text.tertiary,
    cursor: 'help',
    borderBottom: `1px dotted ${theme.palette.kanap.text.tertiary}`,
  },
  '& .kanap-bl-late': {
    color: theme.palette.kanap.danger,
    fontSize: 12,
  },
  '& .kanap-bl-ok': {
    color: theme.palette.kanap.teal,
    fontSize: 12,
  },
});

type AllocationBlockProps = {
  canManage: boolean;
  data: EffortAllocationData | null;
  estimatedEffort: number;
  estimatedEffortValue: string;
  label: string;
  onEdit: () => void;
  onEstimatedEffortChange: (value: string) => void;
  onReset: () => void;
  t: TFunction;
};

function AllocationBlock({
  canManage,
  data,
  estimatedEffort,
  estimatedEffortValue,
  label,
  onEdit,
  onEstimatedEffortChange,
  onReset,
  t,
}: AllocationBlockProps) {
  const allocations = data?.allocations ?? [];
  const mode = data?.mode ?? 'auto';
  const hasOrphans = allocations.some((allocation) => allocation.is_orphaned);

  return (
    <Box className="kanap-alloc-block">
      <Box className="kanap-alloc-head">
        <Box component="span" className="kanap-alloc-title">{label}</Box>
        <Box component="span" className="kanap-alloc-total">
          <input
            className="kanap-alloc-effort-input"
            type="number"
            min={0}
            step={1}
            value={estimatedEffortValue}
            disabled={!canManage}
            onChange={(event) => onEstimatedEffortChange(event.target.value)}
            aria-label={`${label} estimated effort in MD`}
          />
          <Box component="span">MD</Box>
        </Box>
        <Box component="span" className="kanap-alloc-tag">
          {mode === 'auto'
            ? t('portfolio:dialogs.effortAllocation.chips.autoCalculated')
            : t('portfolio:dialogs.effortAllocation.chips.manual')}
        </Box>
        {canManage && (
          <>
            {mode === 'manual' && (
              <button
                type="button"
                className="kanap-link-teal"
                style={{ marginLeft: 'auto' }}
                onClick={onReset}
              >
                {t('common:buttons.reset')}
              </button>
            )}
            <button
              type="button"
              className="kanap-link-teal"
              style={mode === 'auto' ? { marginLeft: 'auto' } : undefined}
              onClick={onEdit}
            >
              {mode === 'auto'
                ? t('portfolio:dialogs.effortAllocation.actions.manual')
                : t('portfolio:dialogs.effortAllocation.actions.edit')}
            </button>
          </>
        )}
      </Box>

      {hasOrphans && (
        <Box className="kanap-alloc-warning">
          {t('portfolio:dialogs.effortAllocation.messages.orphanedUsers')}
        </Box>
      )}

      <table className="kanap-table">
        <thead>
          <tr>
            <th>{t('portfolio:dialogs.effortAllocation.table.contributor')}</th>
            <th className="r">%</th>
            <th className="r">MD</th>
          </tr>
        </thead>
        <tbody>
          {!data ? (
            <tr>
              <td colSpan={3} className="kanap-text-tertiary">
                {t('portfolio:dialogs.effortAllocation.states.loading')}
              </td>
            </tr>
          ) : allocations.length === 0 ? (
            <tr>
              <td colSpan={3} className="kanap-text-tertiary">
                {t('portfolio:dialogs.effortAllocation.states.empty', { effortType: label })}
              </td>
            </tr>
          ) : (
            allocations.map((allocation: AllocationUser) => {
              const mdValue = estimatedEffort > 0
                ? Math.round((allocation.allocation_pct / 100) * estimatedEffort * 10) / 10
                : 0;
              const displayName = `${allocation.first_name || ''} ${allocation.last_name || ''}`.trim() || allocation.email;

              return (
                <tr key={allocation.user_id}>
                  <td>
                    {displayName}
                    {allocation.is_lead && (
                      <Box component="span" className="kanap-lead-tag">
                        {t('portfolio:dialogs.effortAllocation.chips.lead')}
                      </Box>
                    )}
                    {allocation.is_orphaned && (
                      <Box component="span" className="kanap-orphan-tag">
                        {t('portfolio:dialogs.effortAllocation.chips.orphaned')}
                      </Box>
                    )}
                  </td>
                  <td className="r">{allocation.allocation_pct}%</td>
                  <td className="r">{formatMd(mdValue)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Box>
  );
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
  const [progress, setProgress] = React.useState(() => Number(form?.execution_progress) || 0);

  React.useEffect(() => {
    setProgress(Number(form?.execution_progress) || 0);
  }, [form?.execution_progress]);

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

  const estIt = Number(form?.estimated_effort_it) || 0;
  const estBusiness = Number(form?.estimated_effort_business) || 0;
  const estItInputValue = form?.estimated_effort_it != null ? String(Math.round(Number(form.estimated_effort_it))) : '';
  const estBusinessInputValue = form?.estimated_effort_business != null ? String(Math.round(Number(form.estimated_effort_business))) : '';
  const actIt = Number(form?.actual_effort_it) || 0;
  const actBusiness = Number(form?.actual_effort_business) || 0;
  const totalEstimated = estIt + estBusiness;
  const totalActual = actIt + actBusiness;

  const taskTimeHours = taskTimeSummary?.total_hours || 0;
  const projectTimeHours = (form?.time_entries || []).reduce(
    (sum: number, entry: any) => sum + (Number(entry.hours) || 0),
    0,
  );
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
  const taskTimeMd = taskTimeHours / 8;
  const projectTimeMd = projectTimeHours / 8;
  const actualEffortPct = totalEstimated > 0 ? Math.min(100, Math.round((totalActual / totalEstimated) * 100)) : 0;
  const hasBaseline = form?.baseline_effort_it != null || form?.baseline_effort_business != null;

  return (
    <>
      <Box sx={effortTabSx}>
        <Stack spacing={3}>
          <Box className="kanap-effort-overview">
            <Box className="kanap-ov-group">
              <Box className="kanap-ov-main">
                <Box component="span" className="kanap-ov-label">Progress</Box>
                <Slider
                  value={progress}
                  onChange={(_, value) => setProgress(value as number)}
                  onChangeCommitted={(_, value) => onUpdate({ execution_progress: value as number })}
                  min={0}
                  max={100}
                  step={5}
                  sx={overviewSliderSx}
                />
                <Box component="span" className="kanap-ov-val">{progress}%</Box>
              </Box>
              <Box component="span" className="kanap-ov-source">set manually</Box>
            </Box>
            <Box className="kanap-ov-group">
              <Box className="kanap-ov-main">
                <Box component="span" className="kanap-ov-label">Actual effort</Box>
                <Box className="kanap-ov-meter" aria-hidden="true">
                  <Box className="kanap-ov-meter-fill" style={{ width: `${actualEffortPct}%` }} />
                </Box>
                <Box component="span" className="kanap-ov-val">
                  {formatMd(totalActual)} / {formatMd(totalEstimated)} MD
                </Box>
                <Box component="span" className="kanap-ov-sub">
                  (Project {formatMd(projectTimeMd)} · Task {formatMd(taskTimeMd)})
                </Box>
              </Box>
              <Box component="span" className="kanap-ov-source">auto-calculated from time log</Box>
            </Box>
          </Box>

          <Box className="kanap-section">
            <Box className="kanap-section-head">
              <Typography component="h2" className="kanap-section-title">Allocation</Typography>
            </Box>
            <Box className="kanap-alloc-grid">
              <AllocationBlock
                canManage={canManage}
                data={itAllocationData ?? null}
                estimatedEffort={estIt}
                estimatedEffortValue={estItInputValue}
                label="IT"
                onEdit={() => setItAllocationDialogOpen(true)}
                onEstimatedEffortChange={(value) => {
                  if (value === '') {
                    onUpdate({ estimated_effort_it: null });
                    return;
                  }
                  const next = Number(value);
                  if (!Number.isFinite(next) || next < 0) return;
                  onUpdate({ estimated_effort_it: next });
                }}
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
                t={t}
              />
              <AllocationBlock
                canManage={canManage}
                data={businessAllocationData ?? null}
                estimatedEffort={estBusiness}
                estimatedEffortValue={estBusinessInputValue}
                label="Business"
                onEdit={() => setBusinessAllocationDialogOpen(true)}
                onEstimatedEffortChange={(value) => {
                  if (value === '') {
                    onUpdate({ estimated_effort_business: null });
                    return;
                  }
                  const next = Number(value);
                  if (!Number.isFinite(next) || next < 0) return;
                  onUpdate({ estimated_effort_business: next });
                }}
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
                t={t}
              />
            </Box>
          </Box>

          <Box className="kanap-section">
            <Box className="kanap-section-head">
              <Typography component="h2" className="kanap-section-title">Actual effort</Typography>
              <button
                type="button"
                className="kanap-link-teal"
                onClick={() => {
                  setEditingTimeEntry(undefined);
                  setLogTimeDialogOpen(true);
                }}
                disabled={!canContributeToProject}
              >
                + Log time
              </button>
            </Box>

            <Box>
              <table className="kanap-table">
                <thead>
                  <tr>
                    <th>{t('workspace.project.effort.fields.date')}</th>
                    <th>{t('workspace.project.effort.fields.source')}</th>
                    <th>{t('workspace.project.effort.fields.person')}</th>
                    <th>{t('workspace.project.effort.fields.type')}</th>
                    <th className="r">{t('workspace.project.effort.fields.hours')}</th>
                    <th>{t('workspace.project.effort.fields.notes')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="kanap-text-tertiary">No time logged yet.</td>
                    </tr>
                  ) : (
                    allEntries.map((entry: any) => {
                      const canEditEntry = entry.source === 'project'
                        && canContributeToProject
                        && (
                          canProjectAdmin
                          || entry.logged_by_id === profileId
                          || entry.user_id === profileId
                        );
                      const personName = [entry.user_first_name, entry.user_last_name].filter(Boolean).join(' ') || entry.user_email || '-';
                      const sourceContent = entry.source === 'task' && entry.task_id ? (
                        <a
                          className="kanap-link-subtle"
                          href={`/portfolio/tasks/${entry.task_id}`}
                          title={entry.source_label}
                        >
                          {entry.source_label}
                        </a>
                      ) : (
                        <Box component="span" className="kanap-text-tertiary" title={entry.source_label}>
                          {entry.source_label}
                        </Box>
                      );

                      return (
                        <tr key={`${entry.source}-${entry.id}`}>
                          <td>{formatShortDate(entry.logged_at, locale)}</td>
                          <td>{sourceContent}</td>
                          <td>{personName}</td>
                          <td className="kanap-text-tertiary">
                            {entry.category === 'it'
                              ? t('dialogs.logTime.categories.it')
                              : t('dialogs.logTime.categories.business')}
                          </td>
                          <td className="r">{Number(entry.hours || 0).toFixed(2)}h</td>
                          <td className="kanap-text-tertiary">{entry.notes || '-'}</td>
                          <td>
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Box>
          </Box>

          {hasBaseline && (
            <Box className="kanap-section">
              <Box className="kanap-section-head">
                <Typography component="h2" className="kanap-section-title">
                  Effort baseline
                  <Box component="span" className="kanap-section-subtitle">captured at In Progress</Box>
                </Typography>
              </Box>
              <table className="kanap-bl-table">
                <thead>
                  <tr>
                    <th />
                    <th>IT effort</th>
                    <th>Business effort</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <Tooltip title="Current estimated effort set by the project manager">
                        <Box component="span" className="kanap-bl-label">Estimated</Box>
                      </Tooltip>
                    </td>
                    <td>{formatMd(estIt)} MD</td>
                    <td>{formatMd(estBusiness)} MD</td>
                  </tr>
                  <tr>
                    <td>
                      <Tooltip title="Snapshot of estimated effort captured when the project entered In Progress">
                        <Box component="span" className="kanap-bl-label">Baseline</Box>
                      </Tooltip>
                    </td>
                    <td>{form?.baseline_effort_it != null ? `${formatMd(Number(form.baseline_effort_it))} MD` : '-'}</td>
                    <td>{form?.baseline_effort_business != null ? `${formatMd(Number(form.baseline_effort_business))} MD` : '-'}</td>
                  </tr>
                  <tr>
                    <td>
                      <Tooltip title="Difference between current estimate and baseline">
                        <Box component="span" className="kanap-bl-label">Variance</Box>
                      </Tooltip>
                    </td>
                    <td>
                      {baselineItVariance != null ? (
                        <Box component="span" className={baselineItVariance > 0 ? 'kanap-bl-late' : 'kanap-bl-ok'}>
                          {formatEffortVariance(t, baselineItVariance)}
                        </Box>
                      ) : '-'}
                    </td>
                    <td>
                      {baselineBusinessVariance != null ? (
                        <Box component="span" className={baselineBusinessVariance > 0 ? 'kanap-bl-late' : 'kanap-bl-ok'}>
                          {formatEffortVariance(t, baselineBusinessVariance)}
                        </Box>
                      ) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
          )}
        </Stack>
      </Box>

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
