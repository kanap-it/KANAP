import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography } from '@mui/material';
import api from '../../api';

export default function CsvExportDialog({
  open,
  onClose,
  endpoint,
  title = 'Export CSV',
  params,
}: {
  open: boolean;
  onClose: () => void;
  endpoint: string; // e.g. '/suppliers'
  title?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}) {
  const download = async (scope: 'template' | 'data') => {
    try {
      const queryParams = { ...(params ?? {}), scope };
      const res = await api.get(`${endpoint}/export`, { params: queryParams, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = (res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition']) as string | undefined;
      let filename = scope === 'template' ? 'template.csv' : 'data.csv';
      if (disposition) {
        const match = /filename="?([^"]+)"?/i.exec(disposition);
        if (match?.[1]) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      // Minimal error handling; can be enhanced later
      console.error('Export failed', e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Export data as CSV. Files use semicolon separators.
        </Typography>
        <Button variant="contained" onClick={() => download('data')}>Export data</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
