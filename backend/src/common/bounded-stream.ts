/**
 * Lecture bornée de flux pour les ressources d'export.
 *
 * Deux natures de flux coexistent :
 *  - `ReadableStream` web, renvoyé par `fetch` (téléchargement d'images) ;
 *  - `Readable` Node, renvoyé par le stockage objet (`GetObjectResult`).
 *
 * Dans les deux cas la mémoire est comptée **pendant** la lecture et le transfert
 * est annulé dès le dépassement : `reader.cancel()` pour un flux web (un flux
 * verrouillé par un lecteur ne peut pas être annulé via `body.cancel()`), et
 * `destroy()` pour un flux Node.
 */

export type StreamReadFailure = 'per-resource' | 'total';

export class StreamLimitError extends Error {
  constructor(readonly failure: StreamReadFailure) {
    super(failure === 'per-resource' ? 'stream exceeds per-resource limit' : 'stream exceeds total budget');
    this.name = 'StreamLimitError';
  }
}

export type StreamReadLimits = {
  /** Plafond pour cette ressource (octets). */
  maxBytes: number;
  /** Budget restant pour l'ensemble de l'opération (octets), si connu. */
  remainingTotalBytes?: number;
};

export type StreamSource = {
  /** Flux web (`fetch`). */
  web?: ReadableStream<Uint8Array> | null;
  /** Flux Node (stockage objet). */
  node?: NodeJS.ReadableStream | null;
};

async function cancelWebReader(reader: { cancel?: () => Promise<void> } | null): Promise<void> {
  try {
    await reader?.cancel?.();
  } catch {
    // Flux déjà consommé, annulé ou verrouillé : rien à faire de plus.
  }
}

function destroyNodeStream(stream: NodeJS.ReadableStream | null | undefined): void {
  try {
    const destroyable = stream as { destroy?: () => void } | null | undefined;
    destroyable?.destroy?.();
  } catch {
    // Flux déjà détruit : rien à faire de plus.
  }
}

function assertWithinLimits(total: number, limits: StreamReadLimits): void {
  if (total > limits.maxBytes) throw new StreamLimitError('per-resource');
  if (limits.remainingTotalBytes !== undefined && total > limits.remainingTotalBytes) {
    throw new StreamLimitError('total');
  }
}

function toBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === 'string') return Buffer.from(chunk, 'utf8');
  return Buffer.from(chunk as Uint8Array);
}

/**
 * Lit la source jusqu'au bout en s'interrompant au premier dépassement de plafond,
 * et libère toujours le flux.
 */
export async function readStreamWithCaps(source: StreamSource, limits: StreamReadLimits): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  const body = source.web as any;
  const reader = body && typeof body.getReader === 'function' ? body.getReader() : null;

  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = toBuffer(value);
        total += chunk.length;
        assertWithinLimits(total, limits);
        chunks.push(chunk);
      }
    } catch (error) {
      await cancelWebReader(reader);
      throw error;
    }
    return Buffer.concat(chunks);
  }

  const stream = source.node;
  if (!stream) return Buffer.alloc(0);

  try {
    for await (const chunk of stream as AsyncIterable<unknown>) {
      const buffer = toBuffer(chunk);
      total += buffer.length;
      assertWithinLimits(total, limits);
      chunks.push(buffer);
    }
  } catch (error) {
    destroyNodeStream(stream);
    throw error;
  }

  return Buffer.concat(chunks);
}
