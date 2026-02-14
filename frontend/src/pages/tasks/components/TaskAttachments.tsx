import React from 'react';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
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
  showUploadArea: boolean;
}

export default function TaskAttachments({
  attachments,
  onUpload,
  onDelete,
  canManage,
  showUploadArea,
}: TaskAttachmentsProps) {
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(true);
  };

  const handleDragLeave = () => {
    setHover(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    const files = Array.from(e.dataTransfer?.files || []);
    for (const file of files) {
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
      }
    }
    // Reset input so the same file can be selected again
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
    <Box>
      {/* Upload area - shown when button clicked */}
      {showUploadArea && canManage && (
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: hover ? 'primary.main' : 'divider',
            borderRadius: 1,
            p: 2,
            mb: 2,
            textAlign: 'center',
            bgcolor: hover ? 'action.hover' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <Typography color="text.secondary">
            Drag and drop files here, or
          </Typography>
          <Button
            component="label"
            size="small"
            sx={{ mt: 1 }}
            disabled={uploading}
          >
            Browse files
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {uploading && <LinearProgress sx={{ mt: 1 }} />}
        </Box>
      )}

      {/* Attachments display */}
      {attachments.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {attachments.map((a) => (
            <Chip
              key={a.id}
              label={`${a.original_filename} (${formatSize(a.size)})`}
              onClick={() => handleDownload(a)}
              onDelete={canManage ? () => onDelete(a.id) : undefined}
              deleteIcon={<DeleteIcon fontSize="small" />}
              size="small"
              sx={{ mb: 0.5 }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export type { TaskAttachment };
