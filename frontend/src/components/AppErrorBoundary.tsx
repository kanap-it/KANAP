import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import i18n from '../i18n';

/**
 * Last-resort error boundary for the application shell.
 *
 * Two jobs:
 *
 * 1. A render crash anywhere below used to unmount the whole tree and leave a blank page
 *    with nothing but a console message.
 * 2. Once the routes are code-split, a dynamic import can fail for a reason that has nothing
 *    to do with the code: a deploy replaced the hashed chunks while a stale `index.html` was
 *    still open, so the requested chunk is a 404. React surfaces that as a render error, and
 *    the cure is a single reload that picks up the new shell.
 */

/** Bumped at most once per window; a broken deploy must not cause a reload loop. */
const RELOAD_GUARD_KEY = 'kanap-chunk-reload-at';
const RELOAD_GUARD_MS = 10_000;

/**
 * Recognise a failed dynamic import. The wording differs per browser, so this matches the
 * known shapes rather than any single message.
 */
export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? '');
  return /ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(text);
}

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
    this.reloadOnceForStaleChunk(error);
  }

  private reloadOnceForStaleChunk(error: Error): void {
    if (!isChunkLoadError(error)) return;
    let lastAttempt = 0;
    try {
      lastAttempt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    } catch {
      // Storage unavailable (private mode): fall through and reload once.
    }
    if (Date.now() - lastAttempt < RELOAD_GUARD_MS) return;
    try {
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      // Ignore: the reload below is what matters.
    }
    window.location.reload();
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const t = (key: string, fallback: string): string =>
      i18n.t(key, { ns: 'errors', defaultValue: fallback }) as string;
    const staleChunk = isChunkLoadError(error);

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <Typography variant="h6">
            {staleChunk
              ? t('APP_UPDATE_AVAILABLE', 'A new version is available.')
              : t('APP_CRASH_TITLE', 'Something went wrong.')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('APP_CRASH_BODY', 'The page could not be displayed. Reloading usually fixes it.')}
          </Typography>
          <Box>
            <Button variant="contained" onClick={this.handleReload}>
              {t('APP_CRASH_RELOAD', 'Reload')}
            </Button>
          </Box>
          <Box component="details" sx={{ color: 'text.secondary' }}>
            <Typography component="summary" variant="caption" sx={{ cursor: 'pointer' }}>
              {t('APP_CRASH_DETAILS', 'Technical details')}
            </Typography>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
              {error.message}
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  }
}

export default AppErrorBoundary;
