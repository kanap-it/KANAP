import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTheme, type Theme } from '@mui/material/styles';
import PageHeader from '../../components/PageHeader';
import ForbiddenPage from '../ForbiddenPage';
import { useAuth } from '../../auth/AuthContext';
import { KanapDialog, StatusDot } from '../../components/design';
import { drawerMenuItemSx, pageSelectSx } from '../../theme/formSx';
import { formatShortDateTime } from '../../lib/dateFormat';
import { useLocale } from '../../i18n/useLocale';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { getDotColor } from '../../utils/statusColors';
import AssetPickerPopover from './netbox/AssetPickerPopover';
import {
  netboxApi,
  type NetboxAssetRef,
  type NetboxDecision,
  type NetboxDecisionAction,
  type NetboxMappingEntry,
  type NetboxNotice,
  type NetboxPlanRow,
  type NetboxPreviewResult,
  type NetboxRecordResolveInput,
  type NetboxRecordRow,
  type NetboxRecordState,
  type NetboxStatus,
} from '../../api/endpoints/netbox';

const MONO_FONT = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";
const RECORD_STATES: NetboxRecordState[] = ['ambiguous', 'missing', 'error', 'ignored', 'linked'];
/** States surfaced first when the page opens without an explicit filter. */
const ATTENTION_STATES: NetboxRecordState[] = ['ambiguous', 'missing', 'error'];
const PAGE_SIZE = 50;

/** Stable diff keys from the API; anything else falls back to the raw key. */
const DIFF_FIELD_KEYS: string[] = [
  'name', 'kind', 'location', 'status', 'hostname', 'domain', 'operating_system',
  'primary_ip', 'serial_number', 'manufacturer', 'model', 'rack_location', 'rack_unit',
];

function stateDotColor(state: NetboxRecordState, mode: 'light' | 'dark'): string {
  switch (state) {
    case 'linked': return getDotColor('success', mode);
    case 'ambiguous':
    case 'missing': return getDotColor('warning', mode);
    case 'error': return getDotColor('error', mode);
    default: return getDotColor('default', mode);
  }
}

function syncResultColor(status: NetboxStatus['sync']['status'], mode: 'light' | 'dark'): string {
  switch (status) {
    case 'success': return getDotColor('success', mode);
    case 'failure': return getDotColor('error', mode);
    case 'running': return getDotColor('info', mode);
    default: return getDotColor('default', mode);
  }
}

/**
 * The one place a structured notice becomes display text: translate by code,
 * interpolate the params, and fall back to the server's English text for a code
 * this build does not know. `validation_failed` appends the asset service's own
 * detail after a translated lead-in.
 */
function useNoticeText() {
  const { t } = useTranslation('it');
  return React.useCallback((notice: NetboxNotice | null | undefined): string => {
    if (!notice) return '';
    const key = `pages.netbox.notices.${notice.code}`;
    if (notice.code === 'netbox_status_attention') {
      // The sentence takes the translated mid-sentence label, not the raw value.
      const value = notice.params?.value || '';
      const status = t(`pages.netbox.netboxStatusInline.${value}`, { defaultValue: value });
      return t(key, { status, defaultValue: notice.text });
    }
    if (notice.code === 'validation_failed') {
      const leadIn = t(key, { defaultValue: '' });
      if (!leadIn) return notice.text;
      const detail = notice.params?.detail;
      return detail ? `${leadIn} ${detail}` : leadIn;
    }
    return t(key, { ...notice.params, defaultValue: notice.text });
  }, [t]);
}

/** "3 minutes ago" style label; null when there is nothing to show. */
function useRelativeLabel() {
  const { t } = useTranslation('it');
  return React.useCallback((value: string | null): string | null => {
    if (!value) return null;
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (!Number.isFinite(minutes)) return null;
    if (minutes < 1) return t('pages.netbox.time.justNow');
    if (minutes < 60) return t('pages.netbox.time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('pages.netbox.time.hoursAgo', { count: hours });
    return t('pages.netbox.time.daysAgo', { count: Math.floor(hours / 24) });
  }, [t]);
}

const pageSx = (theme: Theme) => ({
  '& .kanap-strip': {
    // Five groups: pack them left with a generous gap. `space-between` is for the
    // two-metric case and scatters the groups across a wide list page.
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
    gap: '40px', flexWrap: 'wrap', fontSize: 13, p: '14px 18px',
    bgcolor: theme.palette.kanap.bg.drawer,
    borderRadius: '8px',
    border: `1px solid ${theme.palette.kanap.border.soft}`,
    width: '100%', boxSizing: 'border-box',
  },
  '& .kanap-strip-group': { display: 'flex', flexDirection: 'column', gap: '2px' },
  '& .kanap-strip-label': { fontSize: 12, color: theme.palette.kanap.text.tertiary, whiteSpace: 'nowrap' },
  '& .kanap-strip-val': { fontWeight: 500, color: theme.palette.kanap.text.primary, display: 'flex', alignItems: 'center', gap: '6px' },
  '& .kanap-strip-sub': { fontSize: 11, color: theme.palette.kanap.text.tertiary },
  '& .kanap-table': { width: '100%', borderCollapse: 'collapse' },
  '& .kanap-table th': {
    fontSize: 12, fontWeight: 500, color: theme.palette.kanap.text.tertiary,
    textAlign: 'left', p: '6px 8px',
    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
  },
  '& .kanap-table td': {
    fontSize: 13, fontWeight: 400, color: theme.palette.kanap.text.primary,
    p: '8px 8px', borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
    verticalAlign: 'middle',
  },
  '& .kanap-table tr:hover td': { bgcolor: theme.palette.action.hover },
  // Charter: no teal on table cell text. Links stay neutral at rest, underline on hover.
  '& .kanap-table td a': { color: 'inherit', textDecoration: 'none' },
  '& .kanap-table td a:hover': { textDecoration: 'underline' },
  '& .kanap-table td.nowrap, & .kanap-table th.nowrap': { whiteSpace: 'nowrap' },
  '& .kanap-table td.shrink, & .kanap-table th.shrink': { width: '1%', whiteSpace: 'nowrap' },
  '& .kanap-mono': { fontFamily: MONO_FONT, fontSize: 12, color: theme.palette.kanap.text.secondary, fontVariantNumeric: 'tabular-nums' },
  '& .kanap-muted': { color: theme.palette.kanap.text.tertiary },
  '& .kanap-subhead': { fontSize: 12, fontWeight: 500, color: theme.palette.kanap.text.tertiary, mb: 0.5 },
  // Both mapping tables get the same column geometry so roles and sites line up.
  '& .kanap-map-table': { maxWidth: 860 },
  '& .kanap-map-table col.name': { width: '42%' },
  '& .kanap-map-table col.count': { width: '22%' },
  '& .kanap-map-table col.target': { width: '36%' },
});

/** Single full-width strip: when the last run happened, how it was started, how long it took, its result, and the record counts. */
function SyncStrip({ status }: { status: NetboxStatus }) {
  const { t } = useTranslation('it');
  const noticeText = useNoticeText();
  const theme = useTheme();
  const locale = useLocale();
  const relative = useRelativeLabel();
  const lastAt = status.sync.finished_at || status.sync.started_at;
  const counts = status.sync.counts;

  return (
    <Box className="kanap-strip">
      <Box className="kanap-strip-group">
        <Box component="span" className="kanap-strip-label">{t('pages.netbox.strip.lastSync')}</Box>
        <Box component="span" className="kanap-strip-val">
          {lastAt ? (relative(lastAt) || formatShortDateTime(lastAt, locale)) : t('pages.netbox.strip.never')}
        </Box>
        {lastAt ? <Box component="span" className="kanap-strip-sub">{formatShortDateTime(lastAt, locale)}</Box> : null}
      </Box>
      <Box className="kanap-strip-group">
        <Box component="span" className="kanap-strip-label">{t('pages.netbox.strip.trigger')}</Box>
        <Box component="span" className="kanap-strip-val">
          {status.sync.trigger ? t(`pages.netbox.trigger.${status.sync.trigger}`) : '—'}
        </Box>
      </Box>
      <Box className="kanap-strip-group">
        <Box component="span" className="kanap-strip-label">{t('pages.netbox.strip.duration')}</Box>
        <Box component="span" className="kanap-strip-val">
          {status.sync.duration_ms != null
            ? t('pages.netbox.strip.seconds', { count: Math.max(1, Math.round(status.sync.duration_ms / 1000)) })
            : '—'}
        </Box>
      </Box>
      <Box className="kanap-strip-group">
        <Box component="span" className="kanap-strip-label">{t('pages.netbox.strip.result')}</Box>
        <Box component="span" className="kanap-strip-val">
          <StatusDot color={syncResultColor(status.sync.status, theme.palette.mode)} />
          {t(`pages.netbox.syncStatus.${status.sync.status}`)}
        </Box>
        {status.sync.error ? <Box component="span" className="kanap-strip-sub">{status.sync.error}</Box> : null}
        {(status.sync.warnings ?? []).map((warning) => (
          <Box key={warning.code} component="span" className="kanap-strip-sub">{noticeText(warning)}</Box>
        ))}
      </Box>
      <Box className="kanap-strip-group">
        <Box component="span" className="kanap-strip-label">{t('pages.netbox.strip.records')}</Box>
        <Box component="span" className="kanap-strip-val">
          {t('pages.netbox.strip.recordCounts', {
            linked: status.records.linked ?? 0,
            attention: (status.records.ambiguous ?? 0) + (status.records.missing ?? 0) + (status.records.error ?? 0),
          })}
        </Box>
        {counts ? (
          <Box component="span" className="kanap-strip-sub">
            {t('pages.netbox.strip.lastRun', {
              summary: [
                t('pages.netbox.strip.createdCount', { count: counts.create }),
                t('pages.netbox.strip.updatedCount', { count: counts.update }),
              ].join(', '),
            })}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function RecordRow({ row, onLink, onCreate, onIgnore, onUnignore, onRetire }: {
  row: NetboxRecordRow;
  onLink: (anchor: HTMLElement) => void;
  onCreate: () => void;
  onIgnore: () => void;
  onUnignore: () => void;
  onRetire: () => void;
}) {
  const { t } = useTranslation('it');
  const theme = useTheme();
  const locale = useLocale();
  const noticeText = useNoticeText();

  return (
    <tr>
      <td>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <StatusDot color={stateDotColor(row.state, theme.palette.mode)} />
          <Link href={row.external_url} target="_blank" rel="noopener noreferrer" underline="hover">
            {row.external_name || t('pages.netbox.records.unnamed')}
          </Link>
        </Stack>
      </td>
      <td className="shrink">{t(`pages.netbox.objectType.${row.external_type}`)}</td>
      <td>
        {row.asset ? (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box component="span" className="kanap-mono">{row.asset.asset_reference || ''}</Box>
            <Link
              component={RouterLink}
              to={`/it/assets/${row.asset.asset_reference || row.asset.id}/overview`}
              underline="hover"
            >
              {row.asset.name}
            </Link>
          </Stack>
        ) : (
          <Box component="span" className="kanap-muted">—</Box>
        )}
      </td>
      <td>{noticeText(row.message)}</td>
      <td className="shrink">{row.last_seen_at ? formatShortDateTime(row.last_seen_at, locale) : ''}</td>
      <td className="shrink">
        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
          {row.state === 'ambiguous' ? (
            <>
              <Button
                size="small"
                variant="action"
                onClick={(event) => onLink(event.currentTarget)}
                disabled={row.candidates.length === 0}
              >
                {t('pages.netbox.actions.linkTo')}
              </Button>
              <Button size="small" variant="action" onClick={onCreate}>{t('pages.netbox.actions.createAsset')}</Button>
              <Button size="small" variant="action" onClick={onIgnore}>{t('pages.netbox.actions.ignore')}</Button>
            </>
          ) : null}
          {row.state === 'missing' ? (
            <>
              <Button size="small" variant="action" onClick={onRetire} disabled={!row.asset}>
                {t('pages.netbox.actions.retire')}
              </Button>
              <Button size="small" variant="action" onClick={onIgnore}>{t('pages.netbox.actions.ignore')}</Button>
            </>
          ) : null}
          {row.state === 'error' ? (
            <Button size="small" variant="action" onClick={onIgnore}>{t('pages.netbox.actions.ignore')}</Button>
          ) : null}
          {row.state === 'ignored' ? (
            <Button size="small" variant="action" onClick={onUnignore}>{t('pages.netbox.actions.stopIgnoring')}</Button>
          ) : null}
        </Stack>
      </td>
    </tr>
  );
}

/**
 * The dialog and its menus are portalled out of the page, so the page's own
 * `kanap-mono` / `kanap-subhead` rules do not reach them: they are restated here.
 */
const previewClassSx = (theme: Theme) => ({
  '& .kanap-mono': {
    fontFamily: MONO_FONT, fontSize: 12,
    color: theme.palette.kanap.text.secondary, fontVariantNumeric: 'tabular-nums',
  },
  '& .kanap-subhead': { fontSize: 12, fontWeight: 500, color: theme.palette.kanap.text.tertiary, mb: 0.5 },
});

/** Notices that ask the person for a decision; shown on the row itself, not in the warnings list. */
const DECISION_NOTICE_CODES: string[] = ['ambiguous_candidates', 'contested_asset', 'ip_match_candidates'];

/** One object is settled by its Netbox type and id; the preview never repeats a pair. */
function rowKey(row: { external_type: string; external_id: string }): string {
  return `${row.external_type}:${row.external_id}`;
}

/** How long to wait after the last click before asking the backend for a fresh plan. */
const REPREVIEW_DEBOUNCE_MS = 600;

type DecisionMenuState = { anchor: HTMLElement; row: NetboxPlanRow };

/**
 * One row of the preview: what happens to the object, what was decided about it,
 * and the single compact action that opens the decision menu. Kept to plain
 * elements: a first import can list several hundred rows.
 */
function PreviewRow({ row, decision, linkLabel, onOpenMenu, onUndo, showDiffs, showNotices }: {
  row: NetboxPlanRow;
  decision: NetboxDecision | null;
  linkLabel: NetboxAssetRef | null;
  onOpenMenu: (anchor: HTMLElement) => void;
  onUndo: () => void;
  showDiffs: boolean;
  showNotices: boolean;
}) {
  const { t } = useTranslation('it');
  const noticeText = useNoticeText();

  const fieldLabel = (field: string) => (
    DIFF_FIELD_KEYS.includes(field) ? t(`pages.netbox.diffFields.${field}`) : field
  );

  const name = row.external_name || t('pages.netbox.records.unnamed');
  const linkedAsset = linkLabel || row.asset;
  const decisionText = (() => {
    if (!decision) return null;
    if (decision.action === 'create') return t('pages.netbox.preview.decided.created');
    if (decision.action === 'ignore') return t('pages.netbox.preview.decided.ignored');
    return t('pages.netbox.preview.decided.linked', { name: linkedAsset?.name || '' });
  })();

  // An object an earlier run linked is settled: it only shows what changes.
  // A first match is KANAP's guess, so the person sees what it rests on and can correct it.
  const firstMatch = row.matched_by === 'serial' || row.matched_by === 'fqdn' || row.matched_by === 'name';
  const canDecide = row.matched_by !== 'link';

  const notices = showNotices
    ? row.warnings.filter((warning) => DECISION_NOTICE_CODES.includes(warning.code))
    : [];

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: '2px' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2">
          {name}
          {row.asset?.asset_reference ? (
            <Box component="span" className="kanap-mono" sx={{ ml: 0.75 }}>
              {row.asset.asset_reference}
            </Box>
          ) : null}
        </Typography>
        {firstMatch && !decision ? (
          <Typography variant="caption" color="text.secondary" component="div">
            {t(`pages.netbox.preview.matchedBy.${row.matched_by}`)}
          </Typography>
        ) : null}
        {notices.map((warning) => (
          <Typography key={warning.code} variant="caption" color="text.secondary" component="div">
            {noticeText(warning)}
          </Typography>
        ))}
        {row.candidates.length > 0 ? (
          <Typography variant="caption" color="text.secondary" component="div">
            {t('pages.netbox.preview.candidates')}{' '}
            {row.candidates.map((candidate) => (
              [candidate.name, candidate.asset_reference].filter(Boolean).join(' ')
            )).join(', ')}
          </Typography>
        ) : null}
        {showDiffs && row.diffs.length > 0 ? (
          <Stack sx={{ pl: 1.5 }}>
            {row.diffs.map((diff) => (
              <Typography key={diff.field} variant="caption" color="text.secondary">
                {fieldLabel(diff.field)}: {diff.before || t('pages.netbox.preview.empty')} → {diff.after || t('pages.netbox.preview.empty')}
              </Typography>
            ))}
          </Stack>
        ) : null}
        {showDiffs && row.action === 'unchanged' ? (
          <Typography variant="caption" color="text.secondary" component="div">
            {t('pages.netbox.preview.alreadyIdentical')}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {decisionText ? (
          <>
            <Typography variant="caption" color="text.secondary">
              {decisionText}
              {decision?.action === 'link' && linkedAsset?.asset_reference ? (
                <Box component="span" className="kanap-mono" sx={{ ml: 0.5 }}>
                  {linkedAsset.asset_reference}
                </Box>
              ) : null}
            </Typography>
            <Button
              size="small"
              variant="action"
              onClick={onUndo}
              aria-label={t('pages.netbox.preview.actions.undoFor', { name })}
            >
              {t('pages.netbox.preview.actions.undo')}
            </Button>
          </>
        ) : !canDecide ? null : (
          <Button
            size="small"
            variant="action"
            onClick={(event) => onOpenMenu(event.currentTarget)}
            aria-label={row.action === 'ambiguous'
              ? t('pages.netbox.preview.actions.decideFor', { name })
              : t('pages.netbox.preview.actions.changeFor', { name })}
          >
            {row.action === 'ambiguous'
              ? t('pages.netbox.preview.actions.decide')
              : t('pages.netbox.preview.actions.change')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

function PreviewSection({ title, hint, rows, showDiffs, showNotices, action, renderRow }: {
  title: string;
  /** One line saying what will happen to these rows, and what the person can do about it. */
  hint?: string;
  rows: NetboxPlanRow[];
  showDiffs: boolean;
  showNotices: boolean;
  action?: React.ReactNode;
  renderRow: (row: NetboxPlanRow, showDiffs: boolean, showNotices: boolean) => React.ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box className="kanap-subhead" sx={{ mb: 0 }}>{title}</Box>
        {action}
      </Box>
      {hint ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>{hint}</Typography>
      ) : null}
      <Stack spacing={0.5}>
        {rows.map((row) => (
          <Box key={rowKey(row)}>{renderRow(row, showDiffs, showNotices)}</Box>
        ))}
      </Stack>
    </Box>
  );
}

/**
 * Review before applying. The person settles objects here: every decision is kept
 * in the dialog, travels with each re-preview so the plan reflects it, and is only
 * written when the run is applied.
 */
function PreviewDialog({ open, preview, applying, onClose, onApply, onPreviewResult }: {
  open: boolean;
  preview: NetboxPreviewResult | null;
  applying: boolean;
  onClose: () => void;
  onApply: (decisions: NetboxDecision[]) => void;
  onPreviewResult: (result: NetboxPreviewResult) => void;
}) {
  const { t } = useTranslation(['it', 'common']);
  const noticeText = useNoticeText();

  const [decisions, setDecisions] = React.useState<NetboxDecision[]>([]);
  const [linkLabels, setLinkLabels] = React.useState<Record<string, NetboxAssetRef>>({});
  const [filter, setFilter] = React.useState('');
  const [decisionError, setDecisionError] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<DecisionMenuState | null>(null);
  const [pickerFor, setPickerFor] = React.useState<DecisionMenuState | null>(null);
  const [revision, setRevision] = React.useState(0);
  const [syncedRevision, setSyncedRevision] = React.useState(0);
  /** Keys added by the last change: dropped again if the backend refuses them. */
  const lastBatchRef = React.useRef<string[]>([]);
  /** Set when a change comes from dropping a refused decision: no round trip needed. */
  const skipNextRef = React.useRef(false);
  const revisionRef = React.useRef(0);
  revisionRef.current = revision;

  React.useEffect(() => {
    if (open) return;
    setDecisions([]);
    setLinkLabels({});
    setFilter('');
    setDecisionError(null);
    setMenu(null);
    setPickerFor(null);
    setRevision(0);
    setSyncedRevision(0);
    lastBatchRef.current = [];
    skipNextRef.current = false;
  }, [open]);

  const repreview = useMutation({
    mutationFn: (input: { payload: NetboxDecision[]; revision: number }) =>
      netboxApi.previewSync({ decisions: input.payload, reuse_inventory: true }),
    onSuccess: (result, input) => {
      // An answer to an older set of choices must not replace a newer plan.
      if (input.revision !== revisionRef.current) return;
      setDecisionError(null);
      setSyncedRevision(revisionRef.current);
      onPreviewResult(result);
    },
    onError: (error: unknown, input) => {
      if (input.revision !== revisionRef.current) return;
      setDecisionError(getApiErrorMessage(error, t, t('pages.netbox.messages.previewFailed')));
      setSyncedRevision(revisionRef.current);
      const refused = lastBatchRef.current;
      lastBatchRef.current = [];
      if (refused.length === 0) return;
      // The refused decision is dropped: the plan on screen already matches what is left.
      skipNextRef.current = true;
      setDecisions((prev) => prev.filter((decision) => !refused.includes(rowKey(decision))));
      setRevision((prev) => prev + 1);
    },
  });

  React.useEffect(() => {
    if (revision === 0) return undefined;
    if (skipNextRef.current) {
      skipNextRef.current = false;
      setSyncedRevision(revision);
      return undefined;
    }
    const handle = window.setTimeout(() => repreview.mutate({ payload: decisions, revision }), REPREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, decisions]);

  const applyDecisions = React.useCallback((next: NetboxDecision[], labels: Record<string, NetboxAssetRef>) => {
    const keys = next.map(rowKey);
    lastBatchRef.current = keys;
    setDecisions((prev) => [...prev.filter((decision) => !keys.includes(rowKey(decision))), ...next]);
    if (Object.keys(labels).length > 0) setLinkLabels((prev) => ({ ...prev, ...labels }));
    setRevision((prev) => prev + 1);
  }, []);

  const undoDecision = React.useCallback((row: NetboxPlanRow) => {
    const key = rowKey(row);
    lastBatchRef.current = [];
    setDecisions((prev) => prev.filter((decision) => rowKey(decision) !== key));
    setRevision((prev) => prev + 1);
  }, []);

  const decisionByKey = React.useMemo(() => {
    const map: Record<string, NetboxDecision> = {};
    decisions.forEach((decision) => { map[rowKey(decision)] = decision; });
    return map;
  }, [decisions]);

  /**
   * What is shown for a row: the local decision wins so the click is reflected at
   * once, and the server's own decision takes over once the new plan arrives.
   */
  const decisionFor = React.useCallback((row: NetboxPlanRow): NetboxDecision | null => {
    const local = decisionByKey[rowKey(row)];
    if (local) return local;
    if (row.decision) {
      return { external_type: row.external_type, external_id: row.external_id, action: row.decision };
    }
    return null;
  }, [decisionByKey]);

  const allRows = preview?.rows || [];
  const needle = filter.trim().toLowerCase();
  const rows = React.useMemo(() => {
    if (!needle) return allRows;
    return allRows.filter((row) => [
      row.external_name,
      row.asset?.name,
      row.asset?.asset_reference,
      ...row.candidates.flatMap((candidate) => [candidate.name, candidate.asset_reference]),
    ].some((value) => (value || '').toLowerCase().includes(needle)));
  }, [allRows, needle]);

  const created = rows.filter((row) => row.action === 'create');
  // A decided object can come back unchanged: it stays visible so it can be undone.
  const updated = rows.filter((row) => row.action === 'update' || (row.action === 'unchanged' && row.decision));
  const ambiguous = rows.filter((row) => row.action === 'ambiguous');
  const skipped = rows.filter((row) => row.action === 'skipped');
  const decidedSkipped = skipped.filter((row) => !!decisionFor(row));
  const plainSkipped = skipped.filter((row) => !decisionFor(row));

  const warnings = Array.from(new Set(
    rows
      .flatMap((row) => row.warnings)
      .filter((warning) => !DECISION_NOTICE_CODES.includes(warning.code))
      .map(noticeText)
      .filter(Boolean),
  ));
  const skippedByReason = plainSkipped.reduce<Record<string, number>>((acc, row) => {
    const key = row.skip_reason || 'ignored';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  /** Objects with a single suggestion and no decision yet: one click settles them all. */
  const singleSuggestion = ambiguous.filter((row) => row.candidates.length === 1 && !decisionFor(row));

  const acceptSingleSuggestions = () => {
    const labels: Record<string, NetboxAssetRef> = {};
    const next = singleSuggestion.map((row) => {
      labels[rowKey(row)] = row.candidates[0];
      return {
        external_type: row.external_type,
        external_id: row.external_id,
        action: 'link' as const,
        asset_id: row.candidates[0].id,
      };
    });
    applyDecisions(next, labels);
  };

  const decide = (row: NetboxPlanRow, action: NetboxDecisionAction, asset?: NetboxAssetRef) => {
    const decision: NetboxDecision = { external_type: row.external_type, external_id: row.external_id, action };
    if (asset) decision.asset_id = asset.id;
    applyDecisions([decision], asset ? { [rowKey(row)]: asset } : {});
    setMenu(null);
  };

  const renderRow = (row: NetboxPlanRow, showDiffs: boolean, showNotices: boolean) => (
    <PreviewRow
      row={row}
      decision={decisionFor(row)}
      linkLabel={linkLabels[rowKey(row)] || null}
      onOpenMenu={(anchor) => setMenu({ anchor, row })}
      onUndo={() => undoDecision(row)}
      showDiffs={showDiffs}
      showNotices={showNotices}
    />
  );

  const menuRow = menu?.row;
  const busy = repreview.isPending || syncedRevision !== revision;

  return (
    <>
      <KanapDialog
        open={open}
        title={t('pages.netbox.preview.title')}
        onClose={onClose}
        onSave={() => onApply(decisions)}
        saveLabel={t('pages.netbox.preview.apply')}
        saveLoading={applying}
        saveDisabled={!preview?.ok || busy}
        sx={[{ maxWidth: 880 }, previewClassSx]}
      >
        {!preview ? null : (
          <Stack spacing={1.5}>
            {preview.message ? <Alert severity={preview.ok ? 'info' : 'error'}>{preview.message}</Alert> : null}
            {decisionError ? (
              <Alert severity="error" onClose={() => setDecisionError(null)}>{decisionError}</Alert>
            ) : null}

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 220 }}>
                {t('pages.netbox.preview.summary', {
                  created: preview.counts.create,
                  updated: preview.counts.update,
                  unchanged: preview.counts.unchanged,
                })}
              </Typography>
              {busy ? (
                <Typography variant="caption" color="text.secondary">{t('pages.netbox.preview.updating')}</Typography>
              ) : null}
              <TextField
                size="small"
                variant="standard"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                // The shared dialog treats Enter as "apply": filtering must not start a run.
                onKeyDown={(event) => { if (event.key === 'Enter') event.stopPropagation(); }}
                placeholder={t('pages.netbox.preview.filterPlaceholder')}
                inputProps={{ 'aria-label': t('pages.netbox.preview.filterLabel') }}
                sx={{ width: 220 }}
              />
            </Stack>

            {/* A first import lists hundreds of rows: scroll the body so the Apply
                button in the shared dialog footer stays within reach. */}
            <Stack spacing={2} sx={{ maxHeight: '56vh', overflowY: 'auto', pr: 1 }}>
              <PreviewSection
                title={t('pages.netbox.preview.sections.created', { n: created.length })}
                hint={t('pages.netbox.preview.hints.created')}
                rows={created}
                showDiffs={false}
                showNotices={false}
                renderRow={renderRow}
              />
              <PreviewSection
                title={t('pages.netbox.preview.sections.updated', { n: updated.length })}
                hint={t('pages.netbox.preview.hints.updated')}
                rows={updated}
                showDiffs
                showNotices={false}
                renderRow={renderRow}
              />
              <PreviewSection
                title={t('pages.netbox.preview.sections.ambiguous', { n: ambiguous.length })}
                rows={ambiguous}
                showDiffs={false}
                showNotices
                action={singleSuggestion.length >= 2 ? (
                  <Button size="small" variant="action" onClick={acceptSingleSuggestions}>
                    {t('pages.netbox.preview.acceptSingle', { count: singleSuggestion.length })}
                  </Button>
                ) : null}
                renderRow={renderRow}
              />
              <PreviewSection
                title={t('pages.netbox.preview.sections.decided', { n: decidedSkipped.length })}
                rows={decidedSkipped}
                showDiffs={false}
                showNotices={false}
                renderRow={renderRow}
              />

              {plainSkipped.length > 0 ? (
                <Box>
                  <Box className="kanap-subhead">{t('pages.netbox.preview.sections.skipped', { n: plainSkipped.length })}</Box>
                  <Stack>
                    {Object.entries(skippedByReason).map(([reason, count]) => (
                      <Typography key={reason} variant="body2" color="text.secondary">
                        {t(`pages.netbox.skipReason.${reason}`)} · {count}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {preview.missing.length > 0 ? (
                <Box>
                  <Box className="kanap-subhead">{t('pages.netbox.preview.sections.missing', { n: preview.missing.length })}</Box>
                  <Stack>
                    {preview.missing.slice(0, 20).map((row) => (
                      <Typography key={row.id} variant="body2">{row.external_name || t('pages.netbox.records.unnamed')}</Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {warnings.length > 0 ? (
                <Box>
                  <Box className="kanap-subhead">{t('pages.netbox.preview.sections.warnings')}</Box>
                  <Stack>
                    {warnings.slice(0, 20).map((warning) => (
                      <Typography key={warning} variant="body2" color="text.secondary">{warning}</Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {preview.rows_truncated ? (
                <Typography variant="caption" color="text.secondary">{t('pages.netbox.preview.truncated')}</Typography>
              ) : null}
            </Stack>
          </Stack>
        )}
      </KanapDialog>

      <Menu
        anchorEl={menu?.anchor}
        open={!!menu}
        onClose={() => setMenu(null)}
        PaperProps={{ sx: previewClassSx }}
      >
        {(menuRow?.action === 'ambiguous' ? menuRow.candidates : []).map((candidate) => (
          <MenuItem
            key={candidate.id}
            sx={drawerMenuItemSx}
            onClick={() => { if (menuRow) decide(menuRow, 'link', candidate); }}
          >
            {t('pages.netbox.preview.menu.linkToCandidate', { name: candidate.name })}
            {candidate.asset_reference ? (
              <Box component="span" className="kanap-mono" sx={{ ml: 0.75 }}>{candidate.asset_reference}</Box>
            ) : null}
          </MenuItem>
        ))}
        <MenuItem
          sx={drawerMenuItemSx}
          onClick={() => { if (menu) { setPickerFor(menu); setMenu(null); } }}
        >
          {menuRow && (menuRow.action === 'create')
            ? t('pages.netbox.preview.menu.linkToExisting')
            : t('pages.netbox.preview.menu.linkToAnother')}
        </MenuItem>
        {menuRow && menuRow.action !== 'create' ? (
          <MenuItem sx={drawerMenuItemSx} onClick={() => decide(menuRow, 'create')}>
            {menuRow.action === 'update'
              ? t('pages.netbox.preview.menu.createInstead')
              : t('pages.netbox.preview.menu.createNew')}
          </MenuItem>
        ) : null}
        <MenuItem
          sx={[drawerMenuItemSx, { display: 'block', whiteSpace: 'normal', maxWidth: 320 }]}
          onClick={() => { if (menuRow) decide(menuRow, 'ignore'); }}
        >
          {t('pages.netbox.preview.menu.ignore')}
          <Typography variant="caption" color="text.secondary" component="div">
            {t('pages.netbox.preview.menu.ignoreHint')}
          </Typography>
        </MenuItem>
      </Menu>

      <AssetPickerPopover
        anchorEl={pickerFor?.anchor || null}
        onClose={() => setPickerFor(null)}
        onPick={(asset) => {
          if (pickerFor) decide(pickerFor.row, 'link', asset);
          setPickerFor(null);
        }}
      />
    </>
  );
}

/** Reserved mapping rows the backend synthesises; their label is ours to translate. */
const RESERVED_ROLE_LABEL_KEYS: Record<string, string> = {
  'kanap:virtual-machines': 'pages.netbox.mappings.reservedRoles.virtualMachines',
};

/** Netbox roles and sites decide what is imported at all, so the mapping form lives next to the records. */
function MappingsSection({ onError }: { onError: (message: string) => void }) {
  const { t } = useTranslation(['it', 'common']);
  const queryClient = useQueryClient();
  const optionsQuery = useQuery({
    queryKey: ['netbox-mapping-options'],
    queryFn: () => netboxApi.getMappingOptions(),
  });
  const [roleMap, setRoleMap] = React.useState<Record<string, string>>({});
  const [siteMap, setSiteMap] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState(false);
  const data = optionsQuery.data;

  React.useEffect(() => {
    if (!data) return;
    // Suggestions pre-fill the unmapped rows; the saved map always wins.
    setRoleMap({ ...data.suggested_role_map, ...data.role_map });
    setSiteMap({ ...data.suggested_site_map, ...data.site_map });
  }, [data]);

  const saveMapping = useMutation({
    mutationFn: () => netboxApi.saveMapping({ role_map: roleMap, site_map: siteMap }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['netbox-mapping-options'] });
    },
    onError: (error: unknown) => onError(getApiErrorMessage(error, t, t('pages.netbox.messages.mappingSaveFailed'))),
  });

  if (optionsQuery.isError) {
    return <Alert severity="error">{getApiErrorMessage(optionsQuery.error, t, t('pages.netbox.messages.mappingFailed'))}</Alert>;
  }
  if (!data) return null;

  const suggestion = (slug: string, current: Record<string, string>, savedMap: Record<string, string>) => (
    !!current[slug] && !savedMap[slug]
  );

  /** Roles count devices, the reserved row counts virtual machines, a site can have both. */
  const countLabel = (entry: NetboxMappingEntry): string => {
    const parts: string[] = [];
    if (entry.device_count > 0) {
      parts.push(t('pages.netbox.mappings.counts.devices', { count: entry.device_count }));
    }
    if (entry.vm_count > 0) {
      parts.push(t('pages.netbox.mappings.counts.virtualMachines', { count: entry.vm_count }));
    }
    return parts.length > 0 ? parts.join(' · ') : t('pages.netbox.mappings.counts.none');
  };

  const entryLabel = (entry: NetboxMappingEntry): string => {
    const key = RESERVED_ROLE_LABEL_KEYS[entry.slug];
    return key ? t(key) : entry.name;
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary">{t('pages.netbox.mappings.intro')}</Typography>

      <Box>
        <Box className="kanap-subhead">{t('pages.netbox.mappings.roles')}</Box>
        <Box component="table" className="kanap-table kanap-map-table">
          <colgroup>
            <col className="name" />
            <col className="count" />
            <col className="target" />
          </colgroup>
          <thead>
            <tr>
              <th>{t('pages.netbox.mappings.columns.netboxRole')}</th>
              <th>{t('pages.netbox.mappings.columns.objects')}</th>
              <th>{t('pages.netbox.mappings.columns.assetType')}</th>
            </tr>
          </thead>
          <tbody>
            {data.roles.map((role) => (
              <tr key={role.slug}>
                <td>{entryLabel(role)}</td>
                <td>{countLabel(role)}</td>
                <td>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      variant="standard"
                      SelectProps={{ displayEmpty: true }}
                      inputProps={{ 'aria-label': entryLabel(role) }}
                      value={roleMap[role.slug] || ''}
                      onChange={(event) => setRoleMap((prev) => ({ ...prev, [role.slug]: event.target.value }))}
                      sx={pageSelectSx}
                    >
                      <MenuItem value="" sx={drawerMenuItemSx}>{t('pages.netbox.mappings.doNotImport')}</MenuItem>
                      {data.asset_kinds.map((kind) => (
                        <MenuItem key={kind.code} value={kind.code} sx={drawerMenuItemSx}>{kind.label}</MenuItem>
                      ))}
                    </TextField>
                    {suggestion(role.slug, roleMap, data.role_map) ? (
                      <Box component="span" className="kanap-muted" sx={{ fontSize: 11 }}>
                        {t('pages.netbox.mappings.suggested')}
                      </Box>
                    ) : null}
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>

      <Box>
        <Box className="kanap-subhead">{t('pages.netbox.mappings.sites')}</Box>
        <Box component="table" className="kanap-table kanap-map-table">
          <colgroup>
            <col className="name" />
            <col className="count" />
            <col className="target" />
          </colgroup>
          <thead>
            <tr>
              <th>{t('pages.netbox.mappings.columns.netboxSite')}</th>
              <th>{t('pages.netbox.mappings.columns.objects')}</th>
              <th>{t('pages.netbox.mappings.columns.location')}</th>
            </tr>
          </thead>
          <tbody>
            {data.sites.map((site) => (
              <tr key={site.slug}>
                <td>{site.name}</td>
                <td>{countLabel(site)}</td>
                <td>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      variant="standard"
                      SelectProps={{ displayEmpty: true }}
                      inputProps={{ 'aria-label': site.name }}
                      value={siteMap[site.slug] || ''}
                      onChange={(event) => setSiteMap((prev) => ({ ...prev, [site.slug]: event.target.value }))}
                      sx={pageSelectSx}
                    >
                      <MenuItem value="" sx={drawerMenuItemSx}>{t('pages.netbox.mappings.doNotImport')}</MenuItem>
                      {data.locations.map((location) => (
                        <MenuItem key={location.id} value={location.id} sx={drawerMenuItemSx}>{location.name}</MenuItem>
                      ))}
                    </TextField>
                    {suggestion(site.slug, siteMap, data.site_map) ? (
                      <Box component="span" className="kanap-muted" sx={{ fontSize: 11 }}>
                        {t('pages.netbox.mappings.suggested')}
                      </Box>
                    ) : null}
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>

      {saved ? <Alert severity="success" onClose={() => setSaved(false)}>{t('pages.netbox.mappings.saved')}</Alert> : null}

      <Box>
        <Button variant="contained" onClick={() => saveMapping.mutate()} disabled={saveMapping.isPending}>
          {saveMapping.isPending ? t('common:status.saving') : t('pages.netbox.mappings.save')}
        </Button>
      </Box>
    </Stack>
  );
}

/**
 * Netbox synchronisation: what the last run did, a preview before anything is written,
 * the objects that need a decision, and the role/site mapping that decides what is imported.
 */
export default function NetboxSyncPage() {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const queryClient = useQueryClient();
  const noticeText = useNoticeText();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = React.useState<'records' | 'mappings'>('records');
  const [page, setPage] = React.useState(1);
  const [preview, setPreview] = React.useState<NetboxPreviewResult | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [linkMenu, setLinkMenu] = React.useState<{ anchor: HTMLElement; row: NetboxRecordRow } | null>(null);
  const [retireTarget, setRetireTarget] = React.useState<NetboxRecordRow | null>(null);

  const canManage = hasLevel('infrastructure', 'admin');

  const statusQuery = useQuery({
    queryKey: ['netbox-status'],
    queryFn: () => netboxApi.getStatus(),
    enabled: canManage,
    refetchInterval: (query) => (query.state.data?.sync.status === 'running' ? 3000 : false),
  });
  const status = statusQuery.data;
  const isRunning = status?.sync.status === 'running';

  const stateParam = searchParams.get('state') as NetboxRecordState | null;
  const fallbackState = React.useMemo<NetboxRecordState>(() => {
    const counts = status?.records;
    if (!counts) return 'ambiguous';
    return ATTENTION_STATES.find((state) => (counts[state] || 0) > 0) || 'linked';
  }, [status?.records]);
  const activeState: NetboxRecordState = stateParam && RECORD_STATES.includes(stateParam)
    ? stateParam
    : fallbackState;

  const selectState = React.useCallback((state: NetboxRecordState) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.set('state', state);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const recordsQuery = useQuery({
    queryKey: ['netbox-records', activeState, page],
    queryFn: () => netboxApi.listRecords({ state: activeState, page, limit: PAGE_SIZE }),
    enabled: canManage && !!status?.configured,
  });

  const refreshAll = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['netbox-status'] }),
      queryClient.invalidateQueries({ queryKey: ['netbox-records'] }),
    ]);
  }, [queryClient]);

  const previewMutation = useMutation({
    mutationFn: () => netboxApi.previewSync(),
    onMutate: () => { setPageError(null); setNotice(null); },
    onSuccess: (result) => { setPreview(result); setPreviewOpen(true); },
    onError: (error: unknown) => setPageError(getApiErrorMessage(error, t, t('pages.netbox.messages.previewFailed'))),
  });

  const applyMutation = useMutation({
    mutationFn: (decisions: NetboxDecision[]) => netboxApi.startSync({ decisions }),
    onSuccess: async (next) => {
      setPreviewOpen(false);
      queryClient.setQueryData(['netbox-status'], next);
      await refreshAll();
    },
    onError: async (error: any) => {
      setPreviewOpen(false);
      if (error?.response?.data?.code === 'NETBOX_SYNC_RUNNING') {
        setNotice(t('pages.netbox.messages.alreadyRunning'));
        await refreshAll();
        return;
      }
      setPageError(getApiErrorMessage(error, t, t('pages.netbox.messages.syncFailed')));
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ row, action }: { row: NetboxRecordRow; action: NetboxRecordResolveInput }) =>
      netboxApi.resolveRecord(row.id, action),
    onSuccess: refreshAll,
    onError: async (error: any) => {
      setPageError(getApiErrorMessage(error, t, t('pages.netbox.messages.actionFailed')));
      // Someone linked that asset in the meantime: what we display is already stale.
      if (error?.response?.data?.code === 'NETBOX_ASSET_ALREADY_LINKED') {
        await refreshAll();
      }
    },
  });

  const unignoreMutation = useMutation({
    mutationFn: (row: NetboxRecordRow) => netboxApi.unignoreRecord(row.id),
    onSuccess: async (updated) => {
      // The record may be gone server-side; the list is refetched either way and
      // the returned notice explains what happens next.
      setNotice(noticeText(updated?.message) || null);
      await refreshAll();
    },
    onError: (error: unknown) => setPageError(getApiErrorMessage(error, t, t('pages.netbox.messages.actionFailed'))),
  });

  const retireMutation = useMutation({
    mutationFn: (row: NetboxRecordRow) => netboxApi.retireAsset(row.id),
    onSuccess: async () => { setRetireTarget(null); await refreshAll(); },
    onError: (error: unknown) => {
      setRetireTarget(null);
      setPageError(getApiErrorMessage(error, t, t('pages.netbox.messages.actionFailed')));
    },
  });

  if (!canManage) {
    return <ForbiddenPage />;
  }

  const items = recordsQuery.data?.items || [];
  const total = recordsQuery.data?.total || 0;
  const firstIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <Box sx={pageSx}>
      <PageHeader title={t('pages.netbox.title')} />

      {status && !status.configured ? (
        <Typography variant="body2" color="text.secondary">
          {t('pages.netbox.notConfigured')}{' '}
          <Link component={RouterLink} to="/admin/integrations">{t('pages.netbox.actions.openSettings')}</Link>
        </Typography>
      ) : null}

      {status?.configured ? (
        <Stack spacing={2.5}>
          <SyncStrip status={status} />

          {pageError ? <Alert severity="error" onClose={() => setPageError(null)}>{pageError}</Alert> : null}
          {notice ? <Alert severity="info" onClose={() => setNotice(null)}>{notice}</Alert> : null}

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending || isRunning || !status.enabled}
            >
              {previewMutation.isPending ? t('pages.netbox.actions.preparing') : t('pages.netbox.actions.syncNow')}
            </Button>
            {!status.enabled ? (
              <Typography variant="caption" color="text.secondary">{t('pages.netbox.disabledHint')}</Typography>
            ) : null}
            {isRunning ? (
              <Typography variant="caption" color="text.secondary">{t('pages.netbox.runningHint')}</Typography>
            ) : null}
          </Stack>

          <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
            <Tab value="records" label={t('pages.netbox.tabs.records')} />
            <Tab value="mappings" label={t('pages.netbox.tabs.mappings')} />
          </Tabs>

          {tab === 'records' ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {RECORD_STATES.map((state) => (
                  <Chip
                    key={state}
                    clickable
                    size="small"
                    color={state === activeState ? 'primary' : 'default'}
                    variant={state === activeState ? 'filled' : 'outlined'}
                    aria-pressed={state === activeState}
                    label={`${t(`pages.netbox.states.${state}`)} ${status.records[state] ?? 0}`}
                    onClick={() => selectState(state)}
                  />
                ))}
              </Stack>

              {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('pages.netbox.records.empty')}</Typography>
              ) : (
                <>
                  <Box component="table" className="kanap-table">
                    <thead>
                      <tr>
                        <th>{t('pages.netbox.records.columns.netboxName')}</th>
                        <th className="shrink">{t('pages.netbox.records.columns.type')}</th>
                        <th>{t('pages.netbox.records.columns.asset')}</th>
                        <th>{t('pages.netbox.records.columns.message')}</th>
                        <th className="shrink">{t('pages.netbox.records.columns.lastSeen')}</th>
                        <th className="shrink" aria-label={t('pages.netbox.records.columns.actions')} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <RecordRow
                          key={row.id}
                          row={row}
                          onLink={(anchor) => setLinkMenu({ anchor, row })}
                          onCreate={() => resolveMutation.mutate({ row, action: { action: 'create' } })}
                          onIgnore={() => resolveMutation.mutate({ row, action: { action: 'ignore' } })}
                          onUnignore={() => unignoreMutation.mutate(row)}
                          onRetire={() => setRetireTarget(row)}
                        />
                      ))}
                    </tbody>
                  </Box>
                  {total > PAGE_SIZE ? (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.netbox.records.range', { from: firstIndex, to: lastIndex, total })}
                      </Typography>
                      <Button size="small" variant="action" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                        {t('pages.netbox.records.previous')}
                      </Button>
                      <Button size="small" variant="action" disabled={lastIndex >= total} onClick={() => setPage((prev) => prev + 1)}>
                        {t('pages.netbox.records.next')}
                      </Button>
                    </Stack>
                  ) : null}
                </>
              )}
            </Stack>
          ) : (
            <MappingsSection onError={setPageError} />
          )}
        </Stack>
      ) : null}

      <Menu anchorEl={linkMenu?.anchor} open={!!linkMenu} onClose={() => setLinkMenu(null)}>
        {(linkMenu?.row.candidates || []).map((candidate) => (
          <MenuItem
            key={candidate.id}
            sx={drawerMenuItemSx}
            onClick={() => {
              if (linkMenu) {
                resolveMutation.mutate({ row: linkMenu.row, action: { action: 'link', asset_id: candidate.id } });
              }
              setLinkMenu(null);
            }}
          >
            <Box component="span" className="kanap-mono" sx={{ mr: 0.75 }}>{candidate.asset_reference || ''}</Box>
            {candidate.name}
          </MenuItem>
        ))}
      </Menu>

      <KanapDialog
        open={!!retireTarget}
        title={t('pages.netbox.retire.title')}
        onClose={() => setRetireTarget(null)}
        onSave={() => { if (retireTarget) retireMutation.mutate(retireTarget); }}
        saveLabel={t('pages.netbox.retire.confirm')}
          saveLoading={retireMutation.isPending}
      >
        <Typography variant="body2">
          {t('pages.netbox.retire.body', { name: retireTarget?.asset?.name || retireTarget?.external_name || '' })}
        </Typography>
      </KanapDialog>

      <PreviewDialog
        open={previewOpen}
        preview={preview}
        applying={applyMutation.isPending}
        onClose={() => setPreviewOpen(false)}
        onApply={(decisions) => applyMutation.mutate(decisions)}
        onPreviewResult={setPreview}
      />
    </Box>
  );
}
