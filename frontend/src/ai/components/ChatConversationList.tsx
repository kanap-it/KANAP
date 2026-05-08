import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { aiConversationsApi } from '../aiApi';
import { ChatConversation } from '../aiTypes';

type ChatConversationListProps = {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onArchive: (id: string) => void;
};

type DateBucket = 'today' | 'yesterday' | 'lastWeek' | 'older';

function bucketFor(updatedAt: string): DateBucket {
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return 'older';
  const now = Date.now();
  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeekAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  if (ts >= startOfToday) return 'today';
  if (ts >= startOfYesterday) return 'yesterday';
  if (ts >= startOfWeekAgo) return 'lastWeek';
  return 'older';
}

const BUCKET_ORDER: DateBucket[] = ['today', 'yesterday', 'lastWeek', 'older'];

function ConversationItem({
  conversation,
  active,
  onSelect,
  onArchive,
  archiveLabel,
  untitledLabel,
}: {
  conversation: ChatConversation;
  active: boolean;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  archiveLabel: string;
  untitledLabel: string;
}) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(conversation.id);
        }
      }}
      className="kanap-chat-conv-item"
      sx={(theme) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: 32,
        px: 1.25,
        mx: 0.25,
        borderRadius: '6px',
        cursor: 'pointer',
        outline: 'none',
        bgcolor: active ? theme.palette.kanap.bg.hover : 'transparent',
        color: active ? theme.palette.kanap.text.primary : theme.palette.kanap.text.secondary,
        fontWeight: active ? 500 : 400,
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:hover': {
          bgcolor: theme.palette.kanap.bg.hover,
          color: theme.palette.kanap.text.primary,
        },
        '&:focus-visible': {
          boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
        },
      })}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 13,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'inherit',
          fontWeight: 'inherit',
        }}
      >
        {conversation.title || untitledLabel}
      </Typography>
      <IconButton
        size="small"
        aria-label={archiveLabel}
        title={archiveLabel}
        onClick={(e) => { e.stopPropagation(); onArchive(conversation.id); }}
        sx={{
          ml: 0.5,
          width: 22,
          height: 22,
          opacity: 0,
          transition: 'opacity 120ms ease',
          color: 'kanap.text.tertiary',
          '&:hover': { color: 'kanap.danger', bgcolor: 'transparent' },
          '.kanap-chat-conv-item:hover &, .kanap-chat-conv-item:focus-visible &': {
            opacity: 1,
          },
        }}
      >
        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  );
}

export default function ChatConversationList({
  activeId,
  onSelect,
  onNew,
  onArchive,
}: ChatConversationListProps) {
  const { t } = useTranslation(['ai']);
  const [query, setQuery] = useState('');
  const { data: conversations } = useQuery<ChatConversation[]>({
    queryKey: ['ai-conversations'],
    queryFn: () => aiConversationsApi.list({ limit: 100 }),
    staleTime: 10_000,
  });

  const list = conversations || [];

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const needle = query.trim().toLowerCase();
    return list.filter((c) => (c.title || '').toLowerCase().includes(needle));
  }, [list, query]);

  const grouped = useMemo(() => {
    const buckets: Record<DateBucket, ChatConversation[]> = {
      today: [], yesterday: [], lastWeek: [], older: [],
    };
    for (const c of filtered) {
      buckets[bucketFor(c.updated_at)].push(c);
    }
    return buckets;
  }, [filtered]);

  const archiveLabel = t('conversationList.archive');
  const untitledLabel = t('conversationList.untitled');

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={onNew}
          sx={(theme) => ({
            justifyContent: 'flex-start',
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: theme.palette.kanap.text.primary,
            bgcolor: theme.palette.kanap.pill.bg,
            border: `1px solid ${theme.palette.kanap.pill.border}`,
            borderRadius: '6px',
            py: 0.5,
            px: 1.25,
            '&:hover': {
              bgcolor: theme.palette.kanap.pill.hoverBg,
              borderColor: theme.palette.kanap.pill.border,
            },
          })}
        >
          {t('conversationList.newChat')}
        </Button>
      </Box>

      {list.length > 0 && (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            variant="standard"
            placeholder={t('conversationList.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0.75 }}>
                  <SearchIcon sx={{ fontSize: 16, color: 'kanap.text.tertiary' }} />
                </InputAdornment>
              ),
            }}
            sx={(theme) => ({
              '& .MuiInputBase-root': {
                fontSize: 13,
                height: 30,
                borderRadius: '6px',
                bgcolor: theme.palette.kanap.bg.hover,
                px: 1,
                '&:before, &:after': { display: 'none' },
              },
              '& input': {
                py: 0,
                color: theme.palette.kanap.text.primary,
                '&::placeholder': { color: theme.palette.kanap.text.tertiary, opacity: 1 },
              },
            })}
          />
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 2 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          scrollbarWidth: 'thin',
          scrollbarColor: 'auto transparent',
        }}
      >
        {filtered.length === 0 && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              px: 2,
              py: 1.5,
              color: 'kanap.text.tertiary',
              fontSize: 12,
            }}
          >
            {list.length === 0
              ? t('conversationList.empty')
              : t('conversationList.noMatch')}
          </Typography>
        )}

        {BUCKET_ORDER.map((bucket) => {
          const items = grouped[bucket];
          if (!items.length) return null;
          return (
            <Box key={bucket} sx={{ pt: 1.5, pb: 0.5 }}>
              <Typography
                component="div"
                sx={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'kanap.text.secondary',
                  letterSpacing: 0.2,
                  px: 2,
                  pb: 0.5,
                }}
              >
                {t(`conversationList.dateGroups.${bucket}`)}
              </Typography>
              {items.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={conv.id === activeId}
                  onSelect={onSelect}
                  onArchive={onArchive}
                  archiveLabel={archiveLabel}
                  untitledLabel={untitledLabel}
                />
              ))}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
