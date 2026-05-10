import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import api from '../../api';

type AttachmentImageProps = {
  /**
   * The bare URL produced by aiConversationsApi.buildAttachmentUrl. We don't fetch
   * directly via the browser <img> tag because the Plaid attachment endpoint requires
   * a JWT bearer header — instead we proxy through the authenticated axios client and
   * surface the bytes via a blob URL.
   */
  fetchUrl: string;
  /** Local object URL for messages that haven't been persisted yet (still in upload). */
  localObjectUrl?: string | null;
  alt?: string;
  width?: number;
  height?: number;
};

export default function AttachmentImage({ fetchUrl, localObjectUrl, alt, width = 96, height = 96 }: AttachmentImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we already have a local object URL (in-flight upload), use it directly.
    if (localObjectUrl) {
      setBlobUrl(localObjectUrl);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    api
      .get(fetchUrl, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        const blob = res.data as Blob;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        try { URL.revokeObjectURL(createdUrl); } catch { /* ignore */ }
      }
    };
  }, [fetchUrl, localObjectUrl]);

  if (error) {
    return (
      <Box
        sx={(theme) => ({
          width,
          height,
          borderRadius: '8px',
          border: `1px solid ${theme.palette.kanap.border.default}`,
          bgcolor: theme.palette.kanap.bg.composer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.kanap.text.tertiary,
          fontSize: 11,
        })}
      >
        ⚠
      </Box>
    );
  }

  return (
    <Box
      sx={(theme) => ({
        width,
        height,
        borderRadius: '8px',
        border: `1px solid ${theme.palette.kanap.border.default}`,
        bgcolor: theme.palette.kanap.bg.composer,
        overflow: 'hidden',
      })}
    >
      {blobUrl && (
        <Box
          component="img"
          src={blobUrl}
          alt={alt || ''}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </Box>
  );
}
