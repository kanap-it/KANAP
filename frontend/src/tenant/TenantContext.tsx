import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import api from '../api';

const DEFAULT_MARKETING_URL = 'https://www.kanap.net';

export type TenantContextValue = {
  isPlatformHost: boolean;
  tenantSlug: string | null;
  tenantName: string | null;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

type State =
  | { status: 'loading' }
  | { status: 'platform' }
  | { status: 'ready'; slug: string | null; name: string | null }
  | { status: 'missing'; marketingUrl: string };

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const marketingUrl = (import.meta.env.VITE_MARKETING_URL as string | undefined)?.replace(/\/$/, '')
    || DEFAULT_MARKETING_URL;

  const value = useMemo<TenantContextValue>(() => {
    if (state.status === 'platform') {
      return { isPlatformHost: true, tenantSlug: null, tenantName: null };
    }
    if (state.status === 'ready') {
      return { isPlatformHost: false, tenantSlug: state.slug, tenantName: state.name };
    }
    return { isPlatformHost: false, tenantSlug: null, tenantName: null };
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/public/tenant-info');
        if (cancelled) return;
        const data = res.data ?? {};
        if (data.platform) {
          setState({ status: 'platform' });
        } else if (data.marketing) {
          setState({ status: 'missing', marketingUrl });
        } else {
          setState({ status: 'ready', slug: data.slug ?? null, name: data.name ?? null });
        }
      } catch (error: any) {
        if (cancelled) return;
        const marketing = error?.response?.data?.marketingUrl || marketingUrl;
        if (error?.response?.status === 404 && error?.response?.data?.error === 'TENANT_NOT_FOUND') {
          setState({ status: 'missing', marketingUrl: marketing });
        } else {
          // Unknown failure: allow app to continue without tenant metadata
          setState({ status: 'ready', slug: null, name: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketingUrl]);

  useEffect(() => {
    if (state.status === 'missing') {
      const timeout = setTimeout(() => {
        window.location.href = state.marketingUrl;
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return () => {};
  }, [state]);

  if (state.status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (state.status === 'missing') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" px={2}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 420, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Tenant Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This tenant doesn&apos;t exist or is no longer available. You&apos;ll be redirected to our marketing site shortly.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            Redirecting to {state.marketingUrl}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
