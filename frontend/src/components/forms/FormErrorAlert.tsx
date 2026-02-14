import React from 'react';
import { Alert } from '@mui/material';

function extractMessage(err: unknown): string | null {
  if (!err) return null;
  const anyErr = err as any;
  // Axios error shape
  const message = anyErr?.response?.data?.message || anyErr?.message || anyErr?.toString?.();
  return message || null;
}

export default function FormErrorAlert({ error }: { error?: unknown }) {
  const msg = extractMessage(error);
  if (!msg) return null;
  return <Alert severity="error" sx={{ mb: 2 }}>{msg}</Alert>;
}

