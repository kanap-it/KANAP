import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { aiConversationsApi } from '../aiApi';
import { ChatConversation } from '../aiTypes';

type ChatConversationListProps = {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onArchive: (id: string) => void;
};

export default function ChatConversationList({
  activeId,
  onSelect,
  onNew,
  onArchive,
}: ChatConversationListProps) {
  const { data: conversations } = useQuery<ChatConversation[]>({
    queryKey: ['ai-conversations'],
    queryFn: () => aiConversationsApi.list(),
    staleTime: 10_000,
  });

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNew}
        >
          New chat
        </Button>
      </Box>

      <List dense sx={{
        flex: 1,
        overflow: 'auto',
        px: 0.5,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 2 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        scrollbarWidth: 'thin',
        scrollbarColor: 'auto transparent',
      }}>
        {(conversations || []).map((conv) => (
          <ListItemButton
            key={conv.id}
            selected={conv.id === activeId}
            onClick={() => onSelect(conv.id)}
            sx={{ borderRadius: 1, mb: 0.25, py: 0.5 }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {conv.title || 'Untitled'}
                </Typography>
              }
            />
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onArchive(conv.id); }}
              sx={{ ml: 0.5, opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
      </List>
    </Stack>
  );
}
