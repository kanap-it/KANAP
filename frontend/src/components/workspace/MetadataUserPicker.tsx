import React from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { taskDetailAvatarSizes, taskDetailTypography, metaItemSx, metaLabelSx } from '../../pages/tasks/theme/taskDetailTokens';

export type MetadataUserOption = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  status?: string | null;
};

type MetadataUserPickerProps = {
  value: string | null | undefined;
  displayName?: string | null;
  placeholder: string;
  searchPlaceholder?: string;
  label?: React.ReactNode;
  disabled?: boolean;
  allowClear?: boolean;
  showAvatar?: boolean;
  onChange: (userId: string | null) => void;
  sx?: SxProps<Theme>;
};

export function formatMetadataUserName(user: MetadataUserOption | null | undefined): string | null {
  if (!user) return null;
  const fullName = String(user.full_name || '').trim();
  if (fullName) return fullName;
  const firstName = String(user.first_name || '').trim();
  const lastName = String(user.last_name || '').trim();
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || null;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function sortUserKey(user: MetadataUserOption): string {
  const lastName = String(user.last_name || '').trim().toLowerCase();
  const firstName = String(user.first_name || '').trim().toLowerCase();
  const fullName = String(user.full_name || '').trim().toLowerCase();
  return lastName ? `${lastName}\0${firstName}` : (fullName || firstName || user.id);
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  const name = String(value || '').trim();
  if (!name || name.includes('@')) return null;
  return name;
}

export default function MetadataUserPicker({
  value,
  displayName,
  placeholder,
  searchPlaceholder,
  label,
  disabled = false,
  allowClear = true,
  showAvatar = true,
  onChange,
  sx,
}: MetadataUserPickerProps) {
  const { t } = useTranslation('common');
  const { profile } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [search, setSearch] = React.useState('');
  const [localSelectedUser, setLocalSelectedUser] = React.useState<MetadataUserOption | null>(null);
  const selectedUserId = value || null;
  const localSelectedName = localSelectedUser?.id === selectedUserId
    ? formatMetadataUserName(localSelectedUser)
    : null;

  const normalizedDisplayName = normalizeDisplayName(displayName);
  const needSelectedFetch = !!selectedUserId && !normalizedDisplayName && !localSelectedName;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'enabled', 'metadata-picker'],
    queryFn: async () => {
      const res = await api.get<{ items: MetadataUserOption[] }>('/users', {
        params: { status: 'enabled', limit: 1000 },
      });
      return res.data.items;
    },
    enabled: !!anchorEl,
    staleTime: 5 * 60_000,
  });

  const { data: selectedUser, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['users', 'metadata-picker', selectedUserId],
    queryFn: async () => {
      const res = await api.get<MetadataUserOption>(`/users/${selectedUserId}`);
      return res.data;
    },
    enabled: needSelectedFetch,
    staleTime: 5 * 60_000,
  });

  const sortedUsers = React.useMemo(() => {
    const list = [...users].sort((a, b) => sortUserKey(a).localeCompare(sortUserKey(b), undefined, { sensitivity: 'base' }));
    const myId = profile?.id || null;
    if (myId) {
      const ownIndex = list.findIndex((user) => user.id === myId);
      if (ownIndex > 0) list.unshift(...list.splice(ownIndex, 1));
    }
    return list;
  }, [profile?.id, users]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = React.useMemo(() => {
    if (!normalizedSearch) return sortedUsers;
    return sortedUsers.filter((user) => (
      formatMetadataUserName(user) || ''
    ).toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch, sortedUsers]);

  const selectedName = localSelectedName || normalizedDisplayName || formatMetadataUserName(selectedUser) || null;
  const displayedName = selectedName || placeholder;
  const loading = isLoading || isLoadingSelected;

  const close = React.useCallback(() => {
    setAnchorEl(null);
    setSearch('');
  }, []);

  const handleSelect = React.useCallback((user: MetadataUserOption | null) => {
    setLocalSelectedUser(user);
    onChange(user?.id || null);
    close();
  }, [close, onChange]);

  React.useEffect(() => {
    if (!selectedUserId) setLocalSelectedUser(null);
  }, [selectedUserId]);

  return (
    <>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : (event) => {
          setSearch('');
          setAnchorEl(event.currentTarget);
        }}
        sx={[
          (theme) => ({
            ...metaItemSx,
            border: 0,
            p: 0,
            bgcolor: 'transparent',
            color: theme.palette.kanap.text.primary,
            fontFamily: 'inherit',
            cursor: disabled ? 'default' : 'pointer',
            minWidth: 0,
          }),
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        {label && (
          <Box component="span" sx={(theme) => ({ ...metaLabelSx, color: theme.palette.kanap.text.tertiary })}>
            {label}
          </Box>
        )}
        {showAvatar && (
          <Avatar
            sx={(theme) => ({
              width: taskDetailAvatarSizes.metadata,
              height: taskDetailAvatarSizes.metadata,
              fontSize: 9,
              fontWeight: 500,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            })}
          >
            {getInitials(selectedName)}
          </Avatar>
        )}
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayedName}
        </Box>
      </Box>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1,
              width: 280,
              overflow: 'visible',
            },
          },
        }}
      >
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder={searchPlaceholder || t('selects.user')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={(theme) => ({
            mb: 0.75,
            px: 0.75,
            py: 0.375,
            borderRadius: 0.75,
            bgcolor: theme.palette.kanap.bg.composer,
            '& input': { fontSize: 13, py: 0.25 },
          })}
        />
        <Box role="listbox" sx={{ maxHeight: 260, overflowY: 'auto', py: 0.25 }}>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={18} />
            </Box>
          )}
          {!loading && filteredUsers.map((user, index) => {
            const name = formatMetadataUserName(user) || t('labels.unknown');
            const isCurrentUser = user.id === profile?.id;
            return (
              <React.Fragment key={user.id}>
                <MenuItem
                  selected={user.id === selectedUserId}
                  onClick={() => handleSelect(user)}
                  sx={{ minHeight: 32, py: 0.75, fontSize: 13, color: 'kanap.text.primary' }}
                >
                  {name}
                  {isCurrentUser ? ` ${t('selects.meSuffix')}` : ''}
                </MenuItem>
                {index === 0 && isCurrentUser && filteredUsers.length > 1 && (
                  <Divider sx={(theme) => ({ my: 0.25, borderColor: theme.palette.kanap.border.soft })} />
                )}
              </React.Fragment>
            );
          })}
          {!loading && filteredUsers.length === 0 && (
            <Typography sx={{ px: 1, py: 1.25, fontSize: 13, color: 'kanap.text.secondary' }}>
              {t('selects.noUsersFound')}
            </Typography>
          )}
        </Box>
        {allowClear && selectedUserId && (
          <Box sx={(theme) => ({ mt: 0.5, pt: 0.5, borderTop: `1px solid ${theme.palette.kanap.border.soft}` })}>
            <Button variant="action" size="small" onClick={() => handleSelect(null)}>
              {t('buttons.clear')}
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
