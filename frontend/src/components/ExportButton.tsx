import React from 'react';
import { Button, CircularProgress, Menu, MenuItem } from '@mui/material';
import { exportDocument, DocumentExportFormat } from '../api/endpoints/export';

interface ExportButtonProps {
  content: string;
  title?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const FORMATS: Array<{ value: DocumentExportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'odt', label: 'ODT' },
];

function sanitizeFilename(value: string): string {
  const cleaned = String(value || 'document')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
  return cleaned || 'document';
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function ExportButton({
  content,
  title,
  disabled = false,
  size = 'small',
}: ExportButtonProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [exporting, setExporting] = React.useState<DocumentExportFormat | null>(null);

  const canExport = !disabled && String(content || '').trim().length > 0;

  const handleExport = async (format: DocumentExportFormat) => {
    setAnchorEl(null);
    setExporting(format);
    try {
      const result = await exportDocument({
        content,
        format,
        title,
      });
      const fallbackName = `${sanitizeFilename(title || 'document')}.${format}`;
      triggerDownload(result.blob, result.filename || fallbackName);
    } catch (error) {
      // Keep failure visible to the user without introducing page-level state.
      window.alert('Export failed. Please try again.');
      // eslint-disable-next-line no-console
      console.error('Document export failed', error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <Button
        size={size}
        variant="outlined"
        disabled={!canExport || exporting !== null}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        startIcon={exporting ? <CircularProgress size={14} /> : undefined}
      >
        {exporting ? `Exporting ${exporting.toUpperCase()}...` : 'Export'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {FORMATS.map((format) => (
          <MenuItem
            key={format.value}
            onClick={() => void handleExport(format.value)}
          >
            {format.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
