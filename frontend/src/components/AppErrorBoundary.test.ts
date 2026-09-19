import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './AppErrorBoundary';

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
