import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Stack, Alert, LinearProgress, Divider } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../api';

type ImportReport = {
  ok: boolean;
  dryRun: boolean;
  total: number;
  inserted: number;
  updated: number;
  processed?: number;
  errors: { row: number; message: string }[];
};

export default function CsvImportDialog({
  open,
  onClose,
  endpoint,
  title = 'Import CSV',
  onImported,
  params,
  preflight = true,
}: {
  open: boolean;
  onClose: () => void;
  endpoint: string; // e.g. '/suppliers'
  title?: string;
  onImported?: () => void; // called after successful non-dryRun import
  params?: Record<string, string | number | boolean | null | undefined>;
  preflight?: boolean; // when false, skip preflight and perform single-step upload
}) {
  const [file, setFile] = useState<File | null>(null);
  const [hover, setHover] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setReport(null);
    setLoading(false);
    setHover(false);
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const onPick = () => inputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f) setFile(f);
  };

  const upload = async (dryRun: boolean) => {
    if (!file) return;
    setLoading(true);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const queryParams = { ...(params ?? {}), dryRun };
      const res = await api.post(`${endpoint}/import`, fd, { params: queryParams });
      const data = res.data as ImportReport;
      setReport(data);
      if (!dryRun && (data as any)?.ok) {
        onImported?.();
      }
    } catch (e) {
      console.error('Import failed', e);
      setReport({ ok: false, dryRun, total: 0, inserted: 0, updated: 0, errors: [{ row: 0, message: "The provided file isn't properly formatted" }] });
    } finally {
      setLoading(false);
    }
  };

  const canLoad = useMemo(() => !!report && (report as any).ok && (report as any).dryRun, [report]);

  const downloadTemplate = async () => {
    try {
      const queryParams = { ...(params ?? {}), scope: 'template' };
      const res = await api.get(`${endpoint}/export`, { params: queryParams, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = (res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition']) as string | undefined;
      let filename = 'template.csv';
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
      console.error('Template download failed', e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" onTransitionExited={reset}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Upload a CSV with semicolon separators and exact column titles from the template.
        </Typography>
        <Button
          variant="text"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
          sx={{ mb: 2 }}
        >
          Download template
        </Button>
        <Divider sx={{ mb: 2 }} />
        <Box
          onDragOver={(e) => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={onDrop}
          sx={{
            border: '2px dashed',
            borderColor: hover ? 'primary.main' : 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            mb: 2,
          }}
          onClick={onPick}
        >
          <Typography>{file ? file.name : 'Drag & drop CSV here, or click to select'}</Typography>
          <input type="file" ref={inputRef} onChange={onFileChange} hidden accept=".csv,text/csv" />
        </Box>
        <Stack direction="row" spacing={1}>
          {preflight ? (
            <>
              <Button variant="outlined" onClick={() => upload(true)} disabled={!file || loading}>Preflight check</Button>
              <Button variant="contained" onClick={() => upload(false)} disabled={!file || loading || !canLoad}>Load</Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => upload(false)} disabled={!file || loading}>Upload</Button>
          )}
        </Stack>
        {loading && <LinearProgress sx={{ mt: 2 }} />}
        {report && (
          <Box sx={{ mt: 2 }}>
            {(report as any).ok ? (
              <Alert severity="success">
                {preflight ? (
                  (report as any).dryRun ? (
                    <>Preflight OK — {(report as any).total} rows. Inserts: {(report as any).inserted}, updates: {(report as any).updated}. You can now Load.</>
                  ) : (
                    <>Loaded successfully — processed {(report as any).processed ?? (report as any).total ?? ''} rows.</>
                  )
                ) : (
                  <>Upload completed successfully.</>
                )}
              </Alert>
            ) : (
              <Alert severity="error">The provided file isn't properly formatted</Alert>
            )}
            {(report as any).errors && (report as any).errors.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {(report as any).errors.slice(0, 5).map((err: any, i: number) => (
                  <Typography key={i} variant="body2">Row {err.row}: {err.message}</Typography>
                ))}
                {(report as any).errors.length > 5 && (
                  <Typography variant="caption">…and {(report as any).errors.length - 5} more</Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
