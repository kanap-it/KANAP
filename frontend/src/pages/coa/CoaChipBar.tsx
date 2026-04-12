import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { CoaListItem } from './useCoaList';

export default function CoaChipBar({
  coas,
  selectedCoaId,
  onSelect,
  onCreate,
  onManage,
  canManage,
}: {
  coas: CoaListItem[];
  selectedCoaId?: string;
  onSelect: (coaId: string) => void;
  onCreate: () => void;
  onManage: () => void;
  canManage: boolean;
}) {
  const { t } = useTranslation(['master-data', 'common']);
  if (coas.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="subtitle1">{t('coa.chipBar.createFirst')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('coa.chipBar.accountsInChart')}
          </Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
              {t('coa.chipBar.newCoA')}
            </Button>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderColor: 'divider',
        bgcolor: (theme) => (theme.palette.mode === 'light' ? theme.palette.grey[100] : 'rgba(255, 255, 255, 0.06)'),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            py: 0.5,
            flex: 1,
            minWidth: 0,
          }}
        >
          {coas.map((coa) => {
            const badges = `${coa.is_default ? '★' : ''}${coa.is_global_default ? '⊕' : ''}`;
            const label = `${coa.code}${badges ? ` ${badges}` : ''}`;
            const isSelected = selectedCoaId === coa.id;
            return (
              <Tooltip key={coa.id} title={`${coa.name}${coa.accounts_count != null ? ` • ${coa.accounts_count} accounts` : ''}`}>
                <Box
                  component="button"
                  onClick={() => onSelect(coa.id)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                    color: isSelected ? 'primary.contrastText' : 'text.primary',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    maxWidth: 260,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  {label}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {canManage && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onCreate}
            >
              {t('coa.chipBar.newChip')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={onManage}
            >
              {t('coa.chipBar.manage')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
