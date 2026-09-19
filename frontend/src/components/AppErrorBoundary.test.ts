import { describe, expect, it } from 'vitest';
import { claimStaleChunkReload, isChunkLoadError } from './AppErrorBoundary';

/**
 * The boundary reloads the page once when a dynamic import fails, because that failure means
 * the shell is stale after a deploy. Getting this predicate wrong in either direction is bad:
 * too narrow and the user keeps the blank page the boundary exists to prevent, too broad and
 * an ordinary crash triggers a reload loop.
 */
describe('isChunkLoadError', () => {
  it('recognises the Chrome/Edge wording', () => {
    expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/y.js'))).toBe(true);
  });

  it('recognises the Firefox wording', () => {
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
  });

  it('recognises the Safari wording', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('recognises a ChunkLoadError by its name', () => {
    const error = new Error('anything');
    error.name = 'ChunkLoadError';
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('does not treat an ordinary render crash as a stale chunk', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(new Error('Minified React error #130'))).toBe(false);
    expect(isChunkLoadError(new Error(''))).toBe(false);
  });

  it('tolerates non-Error throwables', () => {
    expect(isChunkLoadError('Loading chunk 7 failed')).toBe(true);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

/**
 * The automatic reload must happen once. A guard that forgets the attempt reloads on every
 * load, which is a loop the user cannot leave.
 */
describe('claimStaleChunkReload', () => {
  const memoryStorage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
  };

  it('reloads once, then not again for the failing retry', () => {
    const storage = memoryStorage();
    expect(claimStaleChunkReload(storage, 1_000_000)).toBe(true);
    expect(claimStaleChunkReload(storage, 1_000_000 + 3_000)).toBe(false);
    // A slow connection or a late click must not start a second round.
    expect(claimStaleChunkReload(storage, 1_000_000 + 60_000)).toBe(false);
  });

  it('recovers again after a later deploy in the same tab', () => {
    const storage = memoryStorage();
    expect(claimStaleChunkReload(storage, 1_000_000)).toBe(true);
    expect(claimStaleChunkReload(storage, 1_000_000 + 6 * 60_000)).toBe(true);
  });

  it('never reloads when the attempt cannot be remembered', () => {
    expect(claimStaleChunkReload(null)).toBe(false);
    const throwing = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); },
    };
    expect(claimStaleChunkReload(throwing)).toBe(false);
    const readOnly = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(claimStaleChunkReload(readOnly)).toBe(false);
    // Writes silently dropped (some embedded web views).
    const forgetful = { getItem: () => null, setItem: () => undefined };
    expect(claimStaleChunkReload(forgetful)).toBe(false);
  });
});
