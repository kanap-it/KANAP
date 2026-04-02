type AccessTokenSnapshot = {
  token: string | null;
  expiresAt: number | null;
};

let snapshot: AccessTokenSnapshot = {
  token: null,
  expiresAt: null,
};

const listeners = new Set<(next: AccessTokenSnapshot) => void>();

function emit(): void {
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function getAccessToken(): string | null {
  return snapshot.token;
}

export function getAccessTokenExpiresAt(): number | null {
  return snapshot.expiresAt;
}

export function setAccessToken(token: string | null, expiresAt?: number | null): void {
  const next: AccessTokenSnapshot = {
    token,
    expiresAt: token ? expiresAt ?? null : null,
  };

  if (snapshot.token === next.token && snapshot.expiresAt === next.expiresAt) {
    return;
  }

  snapshot = next;
  emit();
}

export function subscribeAccessToken(listener: (next: AccessTokenSnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
