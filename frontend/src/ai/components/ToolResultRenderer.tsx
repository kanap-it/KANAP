import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BuildIcon from '@mui/icons-material/Build';

type ToolResultRendererProps = {
  name: string;
  result: unknown;
  arguments?: Record<string, unknown>;
};

function EntityList({ items }: { items: any[] }) {
  if (!items?.length) return <Typography variant="body2" color="text.secondary">No results found.</Typography>;
  return (
    <Stack spacing={0.5}>
      {items.map((item: any, i: number) => (
        <Stack key={item.id || i} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label={item.type} size="small" variant="outlined" />
          {item.ref && <Typography variant="body2" fontWeight={600}>{item.ref}</Typography>}
          <Typography variant="body2">{item.label}</Typography>
          {item.status && <Chip label={item.status} size="small" />}
        </Stack>
      ))}
    </Stack>
  );
}

function DocumentList({ items }: { items: any[] }) {
  if (!items?.length) return <Typography variant="body2" color="text.secondary">No documents found.</Typography>;
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
  const [expanded, setExpanded] = useState(false);
  const data = result as any;

  const renderContent = () => {
    switch (name) {
      case 'search_all':
        return <EntityList items={data?.items || []} />;
      case 'get_entity_context':
        return (
          <Stack spacing={1}>
            {data?.entity && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={data.entity.type} size="small" variant="outlined" />
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

  const label = name.replace(/_/g, ' ');

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
          <Chip label={Object.values(args).join(', ').slice(0, 40)} size="small" variant="outlined" />
        )}
        <IconButton size="small">
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1 }}>
          {renderContent()}
        </Box>
      </Collapse>
    </Box>
  );
}
