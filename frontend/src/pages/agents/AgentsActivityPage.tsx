import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import {
  aiAgentControlApi,
  type AiAgentControlActivityDetail,
  type AiAgentControlActivityType,
  type AiAgentControlRunDetail,
} from '../../ai/aiApi';
import { EmptyState, formatDateTime, humanize, Section, StatusText, TargetLabel } from '../../components/agents/agentControlPrimitives';
import { useLocale } from '../../i18n/useLocale';

function JsonPreview({ value, emptyLabel }: { value: unknown; emptyLabel: string }) {
  if (!value) return <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>;
  return (
    <Box component="pre" sx={{ m: 0, maxHeight: 260, overflow: 'auto', p: 1, borderRadius: 1, bgcolor: 'kanap.bg.composer', border: '1px solid', borderColor: 'divider', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}

function hasInlineDetail(detail: AiAgentControlActivityDetail | null | undefined): detail is AiAgentControlActivityDetail {
  return !!detail && !!(
    detail.body
    || detail.reason
    || detail.rationale
    || detail.evidenceCount
    || (detail.changes && detail.changes.length > 0)
  );
}

// One-line at-a-glance summary so the timeline shows what happened without expanding.
function DetailPreview({ detail }: { detail: AiAgentControlActivityDetail }) {
  const { t } = useTranslation(['agents']);
  let text: string | null = null;
  if (detail.changes && detail.changes.length > 0) {
    const change = detail.changes[0];
    const field = t(`activity.fields.${change.field}`, { defaultValue: humanize(change.field) });
    text = `${field}: ${change.from ? `${humanize(change.from)} → ` : ''}${humanize(change.to ?? '')}`;
    if (detail.changes.length > 1) text += ` (+${detail.changes.length - 1})`;
  } else if (detail.body) {
    text = detail.body.split('\n')[0];
  } else if (detail.rationale) {
    text = detail.rationale;
  } else if (detail.reason) {
    text = detail.reason;
  }
  if (!text) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {text}
    </Typography>
  );
}

// Full plain-language detail of a single timeline entry (proposed message, field
// changes, the reason and the reviewer's note, sources cited).
function ActivityDetail({ detail }: { detail: AiAgentControlActivityDetail }) {
  const { t } = useTranslation(['agents']);
  return (
    <Stack spacing={1} sx={{ mt: 1, p: 1.25, borderRadius: 1, bgcolor: 'kanap.bg.composer', border: '1px solid', borderColor: 'divider' }}>
      {detail.changes && detail.changes.length > 0 && (
        <Stack spacing={0.25}>
          {detail.changes.map((change, index) => {
            const field = t(`activity.fields.${change.field}`, { defaultValue: humanize(change.field) });
            return (
              <Typography key={`${change.field}-${index}`} variant="body2">
                <Box component="span" sx={{ color: 'text.secondary' }}>{field}: </Box>
                {change.from ? `${humanize(change.from)} → ` : ''}{humanize(change.to ?? '')}
              </Typography>
            );
          })}
        </Stack>
      )}
      {detail.body && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>{t('activity.proposedMessage')}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{detail.body}</Typography>
        </Box>
      )}
      {detail.reason && (
        <Typography variant="body2">
          <Box component="span" sx={{ color: 'text.secondary' }}>{t('activity.reason')}: </Box>
          {detail.reason}
        </Typography>
      )}
      {detail.rationale && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>{t('activity.reviewerNote')}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{detail.rationale}</Typography>
        </Box>
      )}
      {!!detail.evidenceCount && (
        <Typography variant="caption" color="text.secondary">{t('activity.evidenceCount', { n: detail.evidenceCount })}</Typography>
      )}
    </Stack>
  );
}

// Readable technical trace (steps → tool calls → evidence), with the raw JSON
// kept one layer down per the IA spec — never the default view.
function RunAuditDetail({ detail }: { detail: AiAgentControlRunDetail }) {
  const { t } = useTranslation(['agents']);
  const [rawOpen, setRawOpen] = React.useState(false);
  const steps = detail.run_steps ?? [];
  const tools = detail.tool_executions ?? [];
  const evidence = detail.evidence ?? [];
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2">{t('activity.runStatus', { status: detail.run.status })}</Typography>
      {steps.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>{t('activity.steps')}</Typography>
          <Stack spacing={0.5}>
            {steps.map((step) => (
              <Stack key={step.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="caption">{step.step_index}. {humanize(step.capability_name ?? step.kind)}</Typography>
                <StatusText status={step.status} />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      {tools.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>{t('activity.tools')}</Typography>
          <Stack spacing={0.5}>
            {tools.map((tool) => (
              <Stack key={tool.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="caption">{humanize(tool.capability_name)}{tool.duration_ms != null ? ` · ${tool.duration_ms} ms` : ''}</Typography>
                <StatusText status={tool.status} />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      {evidence.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>{t('activity.evidence')}</Typography>
          <Stack spacing={0.5}>
            {evidence.map((item) => (
              <Typography key={item.id} variant="caption" color="text.secondary">
                {item.summary} · {humanize(item.source_object_type)}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
      <Box>
        <Button size="small" variant="text" onClick={() => setRawOpen((open) => !open)}>
          {rawOpen ? t('activity.hideRaw') : t('activity.showRaw')}
        </Button>
        {rawOpen && <JsonPreview value={detail} emptyLabel={t('common.notSet')} />}
      </Box>
    </Stack>
  );
}

export default function AgentsActivityPage({ agentKey }: { agentKey?: string }) {
  const { t } = useTranslation(['agents']);
  const locale = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [targetRef, setTargetRef] = React.useState(searchParams.get('targetRef') ?? '');
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const runId = searchParams.get('runId');
  const typeParam = searchParams.get('type') as AiAgentControlActivityType | null;

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const queueQuery = useQuery({
    queryKey: ['ai-agent-control-queue'],
    queryFn: () => aiAgentControlApi.getQueueOverview({ limit: 100 }),
    staleTime: 30_000,
  });
  const agentDefinition = React.useMemo(() => (
    agentKey ? queueQuery.data?.definitions.find((definition) => definition.agent_key === agentKey) ?? null : null
  ), [agentKey, queueQuery.data]);
  const agentNameByKey = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const definition of queueQuery.data?.definitions ?? []) map.set(definition.agent_key, definition.name);
    return map;
  }, [queueQuery.data]);
  const activityQuery = useQuery({
    queryKey: ['ai-agent-control-activity', agentDefinition?.id ?? null, searchParams.toString()],
    queryFn: () => aiAgentControlApi.listActivity({
      agentDefinitionId: agentDefinition?.id ?? null,
      targetRef: searchParams.get('targetRef'),
      types: typeParam ? [typeParam] : null,
      limit: 75,
    }),
    enabled: !agentKey || !!agentDefinition,
    refetchInterval: 60_000,
  });
  const runQuery = useQuery({
    queryKey: ['ai-agent-control-run', runId],
    queryFn: () => aiAgentControlApi.getRun(runId as string),
    enabled: !!runId,
  });

  const applySearch = () => {
    const next = new URLSearchParams(searchParams);
    if (targetRef.trim()) next.set('targetRef', targetRef.trim());
    else next.delete('targetRef');
    setSearchParams(next);
  };

  return (
    <Box sx={{ p: agentKey ? 0 : 2 }}>
      {!agentKey && (
        <>
          <PageHeader title={t('activity.title')} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('activity.subtitle')}</Typography>
        </>
      )}
      <Stack spacing={2}>
        <Section title={t('activity.filters')}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ p: 1.5 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              size="small"
              value={targetRef}
              onChange={(event) => setTargetRef(event.target.value)}
              placeholder={t('activity.ticketSearch')}
              onKeyDown={(event) => { if (event.key === 'Enter') applySearch(); }}
            />
            <Button size="small" variant="outlined" startIcon={<SearchIcon />} onClick={applySearch}>{t('activity.search')}</Button>
            {(['proposal', 'decision', 'execution', 'configuration', 'pause', 'error'] as AiAgentControlActivityType[]).map((type) => (
              <Chip
                key={type}
                clickable
                size="small"
                color={typeParam === type ? 'primary' : 'default'}
                label={t(`activity.types.${type}`)}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (typeParam === type) next.delete('type');
                  else next.set('type', type);
                  setSearchParams(next);
                }}
              />
            ))}
          </Stack>
        </Section>

        <Section title={t('activity.timeline')}>
          {activityQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
          ) : activityQuery.isError ? (
            <Alert severity="error">{t('activity.loadFailed')}</Alert>
          ) : (activityQuery.data?.items ?? []).length === 0 ? (
            <EmptyState>{t('activity.empty')}</EmptyState>
          ) : (
            <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
              {(activityQuery.data?.items ?? []).map((entry) => {
                const detailAvailable = hasInlineDetail(entry.detail);
                const isExpanded = expanded.has(entry.id);
                return (
                  <Box key={entry.id} sx={{ p: 1.5 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                          <Chip size="small" label={t(`activity.types.${entry.type}`)} />
                          {entry.actionClass && <Chip size="small" variant="outlined" label={t(`settings.actionClasses.${entry.actionClass}`, { defaultValue: humanize(entry.actionClass) })} />}
                          {entry.status && <StatusText status={entry.status} />}
                          {entry.agentKey && <Chip size="small" variant="outlined" label={agentNameByKey.get(entry.agentKey) ?? entry.agentKey} />}
                          {entry.targetRef && <TargetLabel targetType={entry.targetType} targetRef={entry.targetRef} size="dense" />}
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.75 }}>
                          {t(`activity.titles.${entry.titleKey}`, { defaultValue: humanize(entry.titleKey) })}
                        </Typography>
                        {detailAvailable && !isExpanded && <DetailPreview detail={entry.detail!} />}
                        {entry.errorMessage && <Typography variant="caption" color="error" component="div">{entry.errorMessage}</Typography>}
                        {detailAvailable && isExpanded && <ActivityDetail detail={entry.detail!} />}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary">{formatDateTime(entry.at, locale)}</Typography>
                        {detailAvailable && (
                          <Button size="small" variant="text" onClick={() => toggleExpanded(entry.id)}>
                            {isExpanded ? t('activity.detailsHide') : t('activity.detailsShow')}
                          </Button>
                        )}
                        {entry.runId && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              next.set('runId', entry.runId as string);
                              setSearchParams(next);
                            }}
                          >
                            {t('activity.trace')}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Section>

        <KanapDialog
          open={!!runId}
          title={t('activity.technicalTrace')}
          onClose={() => { const next = new URLSearchParams(searchParams); next.delete('runId'); setSearchParams(next); }}
          onSave={() => { const next = new URLSearchParams(searchParams); next.delete('runId'); setSearchParams(next); }}
          saveLabel={t('activity.closeTrace')}
          showCancel={false}
        >
          {runQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
          ) : runQuery.isError || !runQuery.data ? (
            <Alert severity="error">{t('activity.traceFailed')}</Alert>
          ) : (
            <RunAuditDetail detail={runQuery.data} />
          )}
        </KanapDialog>
      </Stack>
    </Box>
  );
}
