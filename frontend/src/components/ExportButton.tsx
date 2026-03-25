import React from 'react';
import { Button, CircularProgress, Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { exportDocument, DocumentExportFormat } from '../api/endpoints/export';

interface ExportButtonProps {
  content: string;
  title?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  getContent?: () => string;
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
  getContent,
}: ExportButtonProps) {
  const { t } = useTranslation('common');
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [exporting, setExporting] = React.useState<DocumentExportFormat | null>(null);

  const canExport = !disabled && (getContent ? true : String(content || '').trim().length > 0);

  const handleExport = async (format: DocumentExportFormat) => {
    setAnchorEl(null);
    setExporting(format);
    try {
      const resolvedContent = getContent ? getContent() : content;
      if (!String(resolvedContent || '').trim()) {
        return;
      }
      const result = await exportDocument({
        content: resolvedContent,
        format,
        title,
      });
      const fallbackName = `${sanitizeFilename(title || 'document')}.${format}`;
      triggerDownload(result.blob, result.filename || fallbackName);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Document export failed', error);
      // Extract error message from blob response (axios returns blob even for errors when responseType is 'blob')
      const blobData = (error as any)?.response?.data;
      if (blobData instanceof Blob) {
        blobData.text().then((text: string) => {
          // eslint-disable-next-line no-console
          console.error('[ExportButton] server error body:', text);
          try {
            const parsed = JSON.parse(text);
            window.alert(t('export.exportFailed', { message: parsed?.message || text }));
          } catch {
            window.alert(t('export.exportFailed', { message: text }));
          }
        }).catch(() => {
          window.alert(t('export.exportFailedGeneric'));
        });
      } else {
        window.alert('Export failed. Please try again.');
      }
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
        onClick={(event) => {
          if (getContent && !String(getContent() || '').trim()) return;
          setAnchorEl(event.currentTarget);
        }}
        startIcon={exporting ? <CircularProgress size={14} /> : undefined}
      >
        {exporting ? t('status.exporting', { format: exporting.toUpperCase() }) : t('export.button')}
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
