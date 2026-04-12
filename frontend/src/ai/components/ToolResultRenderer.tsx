import React, { useState } from 'react';
import {
  Alert,
  Box,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getDotColor } from '../../utils/statusColors';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BuildIcon from '@mui/icons-material/Build';
import { useTranslation } from 'react-i18next';

type ToolResultRendererProps = {
  name: string;
  result: unknown;
  arguments?: Record<string, unknown>;
};

function getIgnoredFields(result: unknown): string[] {
  if (!result || typeof result !== 'object') {
    return [];
  }
  const candidate = result as Record<string, unknown>;
  const values = Array.isArray(candidate.filters_ignored)
    ? candidate.filters_ignored
    : Array.isArray(candidate.fields_ignored)
      ? candidate.fields_ignored
      : [];
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

function EntityList({ items }: { items: any[] }) {
  const { t } = useTranslation(['ai']);
  const mode = useTheme().palette.mode;
  if (!items?.length) return <Typography variant="body2" color="text.secondary">{t('toolResults.noResults')}</Typography>;
  return (
    <Stack spacing={0.5}>
      {items.map((item: any, i: number) => (
        <Stack key={item.id || i} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{item.type}</Box>
          {item.ref && <Typography variant="body2" fontWeight={600}>{item.ref}</Typography>}
          <Typography variant="body2">{item.label}</Typography>
          {item.status && (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: getDotColor('info', mode) }} />
              <Typography variant="body2" sx={{ color: getDotColor('info', mode), fontWeight: 500, fontSize: '0.8125rem' }}>{item.status}</Typography>
            </Box>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

function DocumentList({ items }: { items: any[] }) {
  const { t } = useTranslation(['ai']);
  if (!items?.length) return <Typography variant="body2" color="text.secondary">{t('toolResults.noDocuments')}</Typography>;
  return (
    <Stack spacing={0.5}>
      {items.map((item: any, i: number) => (
        <Stack key={item.id || i} spacing={0.25}>
          <Stack direction="row" spacing={1} alignItems="center">
            {item.ref && <Typography variant="body2" fontWeight={600}>{item.ref}</Typography>}
            <Typography variant="body2">{item.title}</Typography>
          </Stack>
          {item.snippet && (
            <Typography variant="caption" color="text.secondary">{item.snippet}</Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

function CommentsList({ result }: { result: any }) {
  const { t } = useTranslation(['ai']);
  const items = Array.isArray(result?.items) ? result.items : [];
  if (!items.length) {
    return <Typography variant="body2" color="text.secondary">{t('toolResults.noComments', { defaultValue: 'No comments found.' })}</Typography>;
  }
  return (
    <Stack spacing={1}>
      {result?.entity && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{result.entity.type}</Box>
          {result.entity.ref && <Typography variant="body2" fontWeight={600}>{result.entity.ref}</Typography>}
          <Typography variant="body2">{result.entity.label}</Typography>
        </Stack>
      )}
      {items.map((item: any, i: number) => (
        <Stack key={`${item.created_at || 'comment'}-${i}`} spacing={0.25}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" fontWeight={600}>
              {item.author || t('toolResults.unknownAuthor', { defaultValue: 'Unknown author' })}
            </Typography>
            {item.created_at && (
              <Typography variant="caption" color="text.secondary">
                {item.created_at}
              </Typography>
            )}
            {item.edited && (
              <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                {t('toolResults.edited', { defaultValue: 'Edited' })}
              </Box>
            )}
          </Stack>
          <Typography variant="body2">{item.content || t('toolResults.emptyComment', { defaultValue: '(empty comment)' })}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function GenericResult({ result }: { result: unknown }) {
  return (
    <Box
      component="pre"
      sx={{
        fontSize: '0.75rem',
        maxHeight: 200,
        overflow: 'auto',
        bgcolor: 'action.hover',
        p: 1,
        borderRadius: 1,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {JSON.stringify(result, null, 2)}
    </Box>
  );
}

export default function ToolResultRenderer({ name, result, arguments: args }: ToolResultRendererProps) {
  const { t } = useTranslation(['ai']);
  const [expanded, setExpanded] = useState(false);
  const data = result as any;
  const ignoredFields = getIgnoredFields(result);

  const renderContent = () => {
    switch (name) {
      case 'search_all':
        return <EntityList items={data?.items || []} />;
      case 'get_entity_context':
        return (
          <Stack spacing={1}>
            {data?.entity && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{data.entity.type}</Box>
                {data.entity.ref && <Typography variant="body2" fontWeight={600}>{data.entity.ref}</Typography>}
                <Typography variant="body2">{data.entity.label}</Typography>
              </Stack>
            )}
            {data?.related?.map((group: any, i: number) => (
              <Box key={i}>
                <Typography variant="caption" color="text.secondary">{group.label}</Typography>
                <EntityList items={group.items} />
              </Box>
            ))}
          </Stack>
        );
      case 'get_entity_comments':
        return <CommentsList result={data} />;
      case 'search_knowledge':
        return <DocumentList items={data?.items || []} />;
      case 'get_document':
        return (
          <Stack spacing={0.5}>
            {data?.ref && <Typography variant="body2" fontWeight={600}>{data.ref}: {data.title}</Typography>}
            {data?.summary && <Typography variant="body2" color="text.secondary">{data.summary}</Typography>}
          </Stack>
        );
      default:
        return <GenericResult result={result} />;
    }
  };

  const label = t(`toolResults.toolNames.${name}`, { defaultValue: name.replace(/_/g, ' ') });

  return (
    <Box
      sx={{
        bgcolor: 'action.hover',
        borderRadius: 1,
        my: 0.5,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 1.5, py: 0.75, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <BuildIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={600} sx={{ flex: 1 }}>
          {label}
        </Typography>
        {args && Object.keys(args).length > 0 && (
          <Typography component="span" variant="body2" sx={{ fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace", fontSize: '12px', color: 'text.secondary' }}>
            {Object.values(args).join(', ').slice(0, 40)}
          </Typography>
        )}
        <IconButton size="small">
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1 }}>
          {ignoredFields.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
              <Typography variant="body2">
                {t('toolResults.ignoredFields', {
                  fields: ignoredFields.join(', '),
                  defaultValue: `Ignored fields: ${ignoredFields.join(', ')}`,
                })}
              </Typography>
            </Alert>
          )}
          {renderContent()}
        </Box>
      </Collapse>
    </Box>
  );
}
