import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import {
  ActionButtons,
  actionBody,
  actionCanExecute,
  actionIsTerminalStatus,
  actionLabel,
  actionUpdateSummary,
  buildTicketGroups,
  EmptyState,
  formatDateTime,
  INTERNAL_NOTE_CAPABILITY,
  PUBLIC_REPLY_CAPABILITY,
  Section,
  StatusText,
  type TicketWorkGroup,
} from '../../components/agents/agentControlPrimitives';
import { type AiAgentControlActionRequest } from '../../ai/aiApi';
import { useLocale } from '../../i18n/useLocale';
import { useAgentControlData } from './useAgentControlData';

function proposalIcon(capabilityName: string) {
  if (capabilityName === PUBLIC_REPLY_CAPABILITY) return <ForumOutlinedIcon fontSize="small" color="action" />;
  if (capabilityName === INTERNAL_NOTE_CAPABILITY) return <NotesOutlinedIcon fontSize="small" color="action" />;
  return <ManageSearchOutlinedIcon fontSize="small" color="action" />;
}

function proposalBody(action: AiAgentControlActionRequest): string | null {
  if (action.capability_name === INTERNAL_NOTE_CAPABILITY || action.capability_name === PUBLIC_REPLY_CAPABILITY) {
    return actionBody(action);
  }
  return actionUpdateSummary(action);
}

// One self-contained card per proposal: its label + status on top, its own preview, and its
// own Approve/Reject — so it is always clear which action a button applies to.
function ProposalRow({ action, busy, onApprove, onReject, emptyLabel }: {
  action: AiAgentControlActionRequest;
  busy: boolean;
  onApprove: (action: AiAgentControlActionRequest) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
  emptyLabel: string;
}) {
  const body = proposalBody(action);
  const { t } = useTranslation(['agents']);
  const terminal = actionIsTerminalStatus(action);
  return (
    <Box sx={{ border: '1px solid', borderColor: terminal ? 'kanap.danger' : 'divider', borderRadius: 1, p: 1.25 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          {proposalIcon(action.capability_name)}
          <Typography variant="subtitle2" fontWeight={500} sx={terminal ? { color: 'kanap.danger' } : undefined}>{actionLabel(action)}</Typography>
          {terminal && <Chip size="small" color="error" variant="outlined" label={t('approvals.destructive')} />}
          <StatusText status={action.status} />
        </Stack>
        <ActionButtons action={action} busy={busy} onApprove={onApprove} onReject={onReject} />
      </Stack>
      <Box sx={{ maxHeight: 170, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'kanap.bg.composer', px: 1, py: 0.85 }}>
        {body ? (
          <Typography component="pre" sx={{ m: 0, fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>
        )}
      </Box>
    </Box>
  );
}

export default function AgentsApprovalsPage({ agentKey }: { agentKey?: string }) {
  const { t } = useTranslation(['agents']);
  const locale = useLocale();
  const data = useAgentControlData();
  const agentDefinition = React.useMemo(() => (
    agentKey ? data.queueQuery.data?.definitions.find((definition) => definition.agent_key === agentKey) ?? null : null
  ), [agentKey, data.queueQuery.data]);
  // Scope the grouping to this agent so a ticket shared with another agent never
  // surfaces the other agent's proposals here.
  const grouped = React.useMemo(
    () => buildTicketGroups(data.queueQuery.data ?? null, data.actionPool, agentDefinition?.id ?? null),
    [agentDefinition?.id, data.actionPool, data.queueQuery.data],
  );
  const groups = React.useMemo(() => grouped.groups.filter((group) => group.active), [grouped.groups]);

  const approveAll = (group: TicketWorkGroup) => {
    data.approveAllMutation.mutate({ key: group.key, actions: group.pendingActions });
  };

  return (
    <Box sx={{ p: agentKey ? 0 : 2 }}>
      {!agentKey && (
        <>
          <PageHeader title={t('approvals.title')} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('approvals.subtitle')}</Typography>
        </>
      )}
      <Stack spacing={2}>
        {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
        {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}
        <Section title={agentKey ? t('approvals.agentTitle') : t('approvals.inbox')}>
          {data.queueQuery.isLoading || data.actionsQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
          ) : groups.length === 0 ? (
            <EmptyState>{t('approvals.empty')}</EmptyState>
          ) : (
            <Stack divider={<Divider flexItem />}>
              {groups.map((group) => {
                const executableCount = group.pendingActions.filter(actionCanExecute).length;
                return (
                  <Box key={group.key} sx={{ p: 1.5 }}>
                    <Stack spacing={1.25}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>GLPI #{group.targetRef}</Typography>
                            <StatusText status={group.queueStatus} />
                            <Chip size="small" variant="outlined" label={t('approvals.proposalCount', { count: group.pendingActions.length })} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t('approvals.updated', { value: formatDateTime(group.updatedAt, locale) })}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          {executableCount > 1 && (
                            <Button size="small" variant="outlined" disabled={data.busyTicketKey === group.key} onClick={() => approveAll(group)}>
                              {t('approvals.approveAll')}
                            </Button>
                          )}
                          {group.latestRunId && (
                            <Button size="small" variant="text" startIcon={<VisibilityOutlinedIcon />} href={`/agents/activity?runId=${group.latestRunId}`}>
                              {t('approvals.trace')}
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                      <Stack spacing={1}>
                        {group.pendingActions.map((action) => (
                          <ProposalRow
                            key={action.id}
                            action={action}
                            busy={data.busyActionId === action.id}
                            onApprove={(next) => data.approveMutation.mutate(next)}
                            onReject={(next) => data.rejectMutation.mutate(next)}
                            emptyLabel={t('approvals.noActiveProposal')}
                          />
                        ))}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Section>
        {grouped.orphanActions.length > 0 && !agentKey && (
          <Section title={t('approvals.unlinked')}>
            <Stack spacing={1} sx={{ p: 1.5 }}>
              {grouped.orphanActions.map((action) => (
                <Stack key={action.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                  <Typography variant="body2">{actionLabel(action)} / {action.target_ref ?? action.target_id}</Typography>
                  <ActionButtons
                    action={action}
                    busy={data.busyActionId === action.id}
                    onApprove={(next) => data.approveMutation.mutate(next)}
                    onReject={(next) => data.rejectMutation.mutate(next)}
                  />
                </Stack>
              ))}
            </Stack>
          </Section>
        )}
      </Stack>
    </Box>
  );
}
