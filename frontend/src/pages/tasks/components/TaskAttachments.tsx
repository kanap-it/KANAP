import React from 'react';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import api from '../../../api';

interface TaskAttachment {
  id: string;
  task_id: string;
  original_filename: string;
  mime_type: string | null;
  size: number;
  uploaded_at: string;
}

interface TaskAttachmentsProps {
  taskId: string;
  attachments: TaskAttachment[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  canManage: boolean;
}

export default function TaskAttachments({
  attachments,
  onUpload,
  onDelete,
  canManage,
}: TaskAttachmentsProps) {
  const { t } = useTranslation('portfolio');
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await onUpload(file);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canManage) return;
    e.preventDefault();
    setHover(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Ignore drag-leave caused by moving onto a child element.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setHover(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canManage) return;
    e.preventDefault();
    setHover(false);
    void uploadFiles(Array.from(e.dataTransfer?.files || []));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(Array.from(e.target.files || []));
    // Reset input so the same file can be selected again.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const res = await api.get(`/tasks/attachments/${attachment.id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = attachment.original_filename;
      el.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        borderRadius: 1,
        outline: '2px dashed transparent',
        outlineOffset: 4,
        transition: 'background-color 0.15s, outline-color 0.15s',
        ...(hover && canManage
          ? {
              outlineColor: 'primary.main',
              bgcolor: 'action.hover',
            }
          : {}),
      }}
    >
      {/* Compact header: title + inline upload button. Drop a file anywhere on
          this section to upload — the section highlights only while dragging. */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minHeight: 32 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          {t('workspace.task.attachments.title')}
        </Typography>
        {canManage && (
          <Button
            component="label"
            size="small"
            startIcon={<AttachFileIcon fontSize="small" />}
            disabled={uploading}
          >
            {t('workspace.task.actions.attachFiles')}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              onChange={handleFileChange}
            />
          </Button>
        )}
      </Stack>

      {hover && canManage && (
        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
          {t('workspace.task.attachments.dropHere')}
        </Typography>
      )}

      {uploading && <LinearProgress sx={{ mt: 1 }} />}

      {attachments.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {attachments.map((a) => (
            <Chip
              key={a.id}
              label={`${a.original_filename} (${formatSize(a.size)})`}
              onClick={() => handleDownload(a)}
              onDelete={canManage ? () => onDelete(a.id) : undefined}
              deleteIcon={<DeleteIcon fontSize="small" />}
              size="small"
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export type { TaskAttachment };
