import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import DateEUField from '../../../components/fields/DateEUField';
import api from '../../../api';
import { MarkdownContent } from '../../../components/MarkdownContent';

interface ConvertToProjectDialogProps {
  open: boolean;
  onClose: () => void;
  request: {
    id: string;
    name: string;
    purpose?: string | null;
    target_delivery_date?: string | null;
  };
  onSuccess: (projectId: string) => void;
}

export default function ConvertToProjectDialog({
  open,
  onClose,
  request,
  onSuccess,
}: ConvertToProjectDialogProps) {
  const [name, setName] = useState(request.name);
  const [plannedStart, setPlannedStart] = useState<string>('');
  const [plannedEnd, setPlannedEnd] = useState<string>('');
  const [effortIt, setEffortIt] = useState<number | null>(null);
  const [effortBusiness, setEffortBusiness] = useState<number | null>(null);
  const [loadingEffort, setLoadingEffort] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load estimated effort from criteria values when dialog opens
  useEffect(() => {
    if (open && request.id) {
      setName(request.name);
      setPlannedStart('');
      setPlannedEnd('');
      setError(null);

      // Fetch estimated effort derived from Time estimation criteria
      const loadEffort = async () => {
        setLoadingEffort(true);
        try {
          const res = await api.get(`/portfolio/requests/${request.id}/estimated-effort`);
          setEffortIt(res.data?.estimated_effort_it ?? null);
          setEffortBusiness(res.data?.estimated_effort_business ?? null);
        } catch (e) {
          console.error('Failed to load estimated effort', e);
          setEffortIt(null);
          setEffortBusiness(null);
        } finally {
          setLoadingEffort(false);
        }
      };
      loadEffort();
    }
  }, [open, request]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSaving(true);

    try {
      const body: any = {
        name: name.trim(),
        purpose: request.purpose || null,
      };
      if (plannedStart) body.planned_start = plannedStart;
      if (plannedEnd) body.planned_end = plannedEnd;
      if (effortIt != null) body.estimated_effort_it = effortIt;
      if (effortBusiness != null) body.estimated_effort_business = effortBusiness;

      const res = await api.post(`/portfolio/requests/${request.id}/convert`, body);

      onSuccess(res.data.id);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to convert request');
    } finally {
      setSaving(false);
    }
  }, [request.id, request.purpose, name, plannedStart, plannedEnd, effortIt, effortBusiness, onSuccess]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Convert to Project</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          {request.purpose && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Purpose
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  maxHeight: 150,
                  overflow: 'auto',
                  bgcolor: 'action.hover',
                }}
              >
                <MarkdownContent content={request.purpose} variant="compact" />
              </Box>
            </Box>
          )}

          {loadingEffort ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={16} />
              <span>Loading effort estimates...</span>
            </Stack>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <DateEUField
                label="Planned Start"
                valueYmd={plannedStart}
                onChangeYmd={setPlannedStart}
              />
              <DateEUField
                label="Planned End"
                valueYmd={plannedEnd}
                onChangeYmd={setPlannedEnd}
              />
              <TextField
                label="IT Effort (MD)"
                type="number"
                value={effortIt ?? ''}
                onChange={(e) => setEffortIt(e.target.value === '' ? null : Number(e.target.value))}
                helperText="Derived from Time estimation IT criteria"
              />
              <TextField
                label="Business Effort (MD)"
                type="number"
                value={effortBusiness ?? ''}
                onChange={(e) => setEffortBusiness(e.target.value === '' ? null : Number(e.target.value))}
                helperText="Derived from Time estimation Business criteria"
              />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || loadingEffort || !name.trim()}>
          {saving ? 'Converting...' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
