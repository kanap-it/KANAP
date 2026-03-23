export type StreamUsage = {
  input_tokens: number;
  output_tokens: number;
};

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {
    name?: string;
    code?: string;
    message?: string;
  };

  return maybeError.name === 'AbortError'
    || maybeError.code === 'ABORT_ERR'
    || maybeError.message === 'The operation was aborted'
    || maybeError.message === 'The operation was aborted.';
}

export function cloneUsage(usage?: StreamUsage | null): StreamUsage | undefined {
  if (!usage) {
    return undefined;
  }
  return {
    input_tokens: Number(usage.input_tokens) || 0,
    output_tokens: Number(usage.output_tokens) || 0,
  };
}

export function addUsage(
  total: StreamUsage | undefined,
  usage?: StreamUsage | null,
): StreamUsage | undefined {
  const next = cloneUsage(usage);
  if (!next) {
    return total;
  }
  if (!total) {
    return next;
  }
  return {
    input_tokens: total.input_tokens + next.input_tokens,
    output_tokens: total.output_tokens + next.output_tokens,
  };
}

export function parseToolCallArguments(rawArguments: string): Record<string, unknown> {
  if (!rawArguments || !rawArguments.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawArguments);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to safe default
  }

  return {};
}
