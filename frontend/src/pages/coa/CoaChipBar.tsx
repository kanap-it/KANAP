import React from 'react';
import {
  Box,
  Button,
  Chip,
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
  if (coas.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="subtitle1">Create your first Chart of Accounts</Typography>
          <Typography variant="body2" color="text.secondary">
            Accounts are always managed inside a chart.
          </Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
              New Chart of Accounts
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
            return (
              <Tooltip key={coa.id} title={`${coa.name}${coa.accounts_count != null ? ` • ${coa.accounts_count} accounts` : ''}`}>
                <Chip
                  label={label}
                  clickable
                  color={selectedCoaId === coa.id ? 'primary' : 'default'}
                  variant={selectedCoaId === coa.id ? 'filled' : 'outlined'}
                  onClick={() => onSelect(coa.id)}
                  sx={{ maxWidth: 260, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                />
              </Tooltip>
            );
          })}
        </Box>

        {canManage && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Chip
              icon={<AddIcon />}
              label="New"
              clickable
              color="primary"
              variant="outlined"
              onClick={onCreate}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={onManage}
            >
              Manage
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
