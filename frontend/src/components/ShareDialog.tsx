import React from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { formatItemRef } from '../utils/item-ref';

type ItemType = 'task' | 'project' | 'request';

type User = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status: string;
};

/** A selected recipient: either a database user or a raw email address. */
type RecipientValue = User | string;

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  itemType: ItemType;
  itemId: string;
  itemName: string;
  itemNumber?: number | null;
}

function buildItemPath(itemType: ItemType, itemId: string): string {
  switch (itemType) {
    case 'task':
      return `/portfolio/tasks/${itemId}`;
    case 'project':
      return `/portfolio/projects/${itemId}`;
    case 'request':
      return `/portfolio/requests/${itemId}`;
  }
}

function buildApiEndpoint(itemType: ItemType, itemId: string): string {
  switch (itemType) {
    case 'task':
      return `/tasks/${itemId}/share`;
    case 'project':
      return `/portfolio/projects/${itemId}/share`;
    case 'request':
      return `/portfolio/requests/${itemId}/share`;
  }
}

function formatName(u: User) {
  const fn = (u.first_name || '').trim();
  const ln = (u.last_name || '').trim();
  const name = [fn, ln].filter(Boolean).join(' ');
  return name || u.email;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareDialog({
  open,
  onClose,
  itemType,
  itemId,
  itemName,
  itemNumber,
}: ShareDialogProps) {
  const { t } = useTranslation('common');
  const [recipients, setRecipients] = React.useState<RecipientValue[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const refOrId = itemNumber ? formatItemRef(itemType, itemNumber) : itemId;
  const itemUrl = `${window.location.origin}${buildItemPath(itemType, refOrId)}`;

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'enabled', 'select'],
    queryFn: async () => {
      const res = await api.get<{ items: User[] }>('/users', {
        params: { status: 'enabled', limit: 1000 },
      });
      return res.data.items;
    },
  });

  const sortedUsers = React.useMemo(() => {
    const list = users ? [...users] : [];
    const getName = (u: User) => {
      const fn = (u.first_name || '').trim();
      const ln = (u.last_name || '').trim();
      const name = [fn, ln].filter(Boolean).join(' ');
      return (name || u.email).toLowerCase();
    };
    return list.sort((a, b) => getName(a).localeCompare(getName(b), undefined, { sensitivity: 'base' }));
  }, [users]);

  React.useEffect(() => {
    if (open) {
      setRecipients([]);
      setInputValue('');
      setMessage('');
      setError(null);
      setSending(false);
      setCopied(false);
    }
  }, [open]);

  const handleSend = async () => {
    if (recipients.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const userIds = recipients.filter((r): r is User => typeof r !== 'string').map((u) => u.id);
      const emails = recipients.filter((r): r is string => typeof r === 'string');
      await api.post(buildApiEndpoint(itemType, itemId), {
        recipient_user_ids: userIds.length > 0 ? userIds : undefined,
        recipient_emails: emails.length > 0 ? emails : undefined,
        message: message.trim() || undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('messages.failedToSend'));
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(itemUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('share.sendLink')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Autocomplete<RecipientValue, true, false, true>
            multiple
            freeSolo
            options={sortedUsers}
            value={recipients}
            inputValue={inputValue}
            onInputChange={(_, value, reason) => {
              if (reason !== 'reset') setInputValue(value);
            }}
            onChange={(_, newValue) => {
              setRecipients(newValue);
              setInputValue('');
            }}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : formatName(option)
            }
            filterOptions={(options, { inputValue }) => {
              const s = inputValue.toLowerCase();
              return options.filter((o) => {
                if (typeof o === 'string') return o.toLowerCase().includes(s);
                return (
                  (o.first_name || '').toLowerCase().includes(s) ||
                  (o.last_name || '').toLowerCase().includes(s) ||
                  o.email.toLowerCase().includes(s)
                );
              });
            }}
            isOptionEqualToValue={(option, value) => {
              if (typeof option === 'string' || typeof value === 'string') {
                return option === value;
              }
              return option.id === value.id;
            }}
            renderOption={(props, option) => {
              if (typeof option === 'string') return <li {...props}>{option}</li>;
              return (
                <li {...props} key={option.id}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{formatName(option)}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>{option.email}</div>
                  </div>
                </li>
              );
            }}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((item, index) => {
                const label = typeof item === 'string' ? item : formatName(item);
                const key = typeof item === 'string' ? item : item.id;
                return (
                  <Chip {...getTagProps({ index })} key={key} label={label} size="small" />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('labels.recipients')}
                required
                placeholder={t('share.searchUsersOrEmail')}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            disabled={isLoading}
            loading={isLoading}
            noOptionsText={isLoading ? t('selects.loading') : t('share.typeEmailAddress')}
            autoHighlight
            handleHomeEndKeys
            // Only accept free-text entries that look like valid emails
            autoSelect={false}
            onBlur={() => {
              const trimmed = inputValue.trim();
              if (trimmed && EMAIL_RE.test(trimmed)) {
                const alreadyAdded = recipients.some(
                  (r) =>
                    (typeof r === 'string' && r === trimmed) ||
                    (typeof r !== 'string' && r.email === trimmed),
                );
                if (!alreadyAdded) {
                  setRecipients((prev) => [...prev, trimmed]);
                }
              }
              setInputValue('');
            }}
            fullWidth
          />

          <TextField
            label={t('share.messageOptional')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            rows={3}
            placeholder={t('share.addPersonalMessage')}
            fullWidth
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={t('labels.link')}
              value={itemUrl}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
            />
            <IconButton onClick={handleCopy} title={copied ? t('share.copied') : t('share.copyLink')}>
              <ContentCopyIcon color={copied ? 'success' : 'action'} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          {t('buttons.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending || recipients.length === 0}
        >
          {sending ? t('status.sending') : t('buttons.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
