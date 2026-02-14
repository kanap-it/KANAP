import React from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';

export interface AllocationUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  allocation_pct: number;
  is_lead: boolean;
  is_orphaned?: boolean;
}

export interface EffortAllocationData {
  mode: 'auto' | 'manual';
  allocations: AllocationUser[];
  total_pct: number;
  estimated_effort: number;
}

interface EffortAllocationTableProps {
  data: EffortAllocationData | null;
  effortType: 'it' | 'business';
  estimatedEffort: number; // From local form state for immediate updates
  canManage: boolean;
  onEdit: () => void;
  onReset: () => void;
}

export default function EffortAllocationTable({
  data,
  effortType,
  estimatedEffort,
  canManage,
  onEdit,
  onReset,
}: EffortAllocationTableProps) {
  if (!data) {
    return (
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Loading allocations...
        </Typography>
      </Box>
    );
  }

  const { mode, allocations } = data;
  const hasOrphans = allocations.some(a => a.is_orphaned);
  const title = effortType === 'it' ? 'IT Effort Allocation' : 'Business Effort Allocation';

  if (allocations.length === 0) {
    return (
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No allocations - assign a {effortType === 'it' ? 'IT' : 'Business'} lead or team members
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
          <Chip
            label={mode === 'auto' ? 'Auto-calculated' : 'Manual'}
            size="small"
            color={mode === 'auto' ? 'default' : 'primary'}
            variant="outlined"
          />
        </Stack>
        {canManage && (
          <Stack direction="row" spacing={1}>
            {mode === 'manual' && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={onReset}
              >
                Reset
              </Button>
            )}
            <Button
              size="small"
              variant={mode === 'auto' ? 'outlined' : 'contained'}
              startIcon={<EditIcon />}
              onClick={onEdit}
            >
              {mode === 'auto' ? 'Manual' : 'Edit'}
            </Button>
          </Stack>
        )}
      </Stack>

      {hasOrphans && (
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <WarningIcon fontSize="small" color="warning" />
          <Typography variant="caption" color="warning.main">
            Some users are no longer team members
          </Typography>
        </Box>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, width: '60%' }}>Contributor</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>%</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>MD</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allocations.map((alloc) => {
            const mdValue = estimatedEffort > 0
              ? Math.round((alloc.allocation_pct / 100) * estimatedEffort * 10) / 10
              : 0;
            const displayName = `${alloc.first_name || ''} ${alloc.last_name || ''}`.trim() || alloc.email;

            return (
              <TableRow
                key={alloc.user_id}
                sx={alloc.is_orphaned ? { bgcolor: 'warning.light', opacity: 0.8 } : undefined}
              >
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{displayName}</Typography>
                    {alloc.is_lead && (
                      <Chip label="Lead" size="small" color="primary" variant="outlined" />
                    )}
                    {alloc.is_orphaned && (
                      <Chip label="Orphaned" size="small" color="warning" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{alloc.allocation_pct}%</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{mdValue}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
