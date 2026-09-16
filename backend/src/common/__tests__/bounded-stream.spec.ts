import * as assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readStreamWithCaps, StreamLimitError } from '../bounded-stream';

function trackedNodeStream(chunks: Buffer[], onDestroy: () => void): Readable {
  const stream = Readable.from(chunks);
  const original = stream.destroy.bind(stream);
  (stream as any).destroy = (error?: Error) => {
    onDestroy();
    return original(error as any);
  };
  return stream;
}

async function run() {
  // ------------------------------------------------- flux web : lecture complète
  {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
    });
    const buffer = await readStreamWithCaps({ web: stream as any }, { maxBytes: 1024 });
    assert.deepEqual([...buffer], [1, 2, 3]);
  }

  // ------------------------- flux web : dépassement → erreur et source annulée
  {
    let sourceCancelled = false;
    const chunk = new Uint8Array(1024 * 1024);
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(chunk);
      },
      cancel() {
        sourceCancelled = true;
      },
    });

    await assert.rejects(
      () => readStreamWithCaps({ web: stream as any }, { maxBytes: 2 * 1024 * 1024 }),
      (error: unknown) => error instanceof StreamLimitError && error.failure === 'per-resource',
    );
    assert.equal(sourceCancelled, true, 'le flux web doit être annulé au dépassement');
  }

  // --------------------- flux web : budget global → erreur distincte et annulation
  {
    let sourceCancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(1024));
      },
      cancel() {
        sourceCancelled = true;
      },
    });

    await assert.rejects(
      () => readStreamWithCaps({ web: stream as any }, { maxBytes: 1024 * 1024, remainingTotalBytes: 512 }),
      (error: unknown) => error instanceof StreamLimitError && error.failure === 'total',
    );
    assert.equal(sourceCancelled, true);
  }

  // ------------------------------------------------- flux Node : lecture complète
  {
    const buffer = await readStreamWithCaps(
      { node: Readable.from([Buffer.from('ab'), Buffer.from('cd')]) },
      { maxBytes: 1024 },
    );
    assert.equal(buffer.toString('utf8'), 'abcd');
  }

  // ----------------- flux Node : dépassement → erreur et `destroy()` appelé
  {
    let destroyed = false;
    const stream = trackedNodeStream([Buffer.alloc(3 * 1024 * 1024)], () => { destroyed = true; });

    await assert.rejects(
      () => readStreamWithCaps({ node: stream }, { maxBytes: 1024 * 1024 }),
      (error: unknown) => error instanceof StreamLimitError && error.failure === 'per-resource',
    );
    assert.equal(destroyed, true, 'un flux Node doit être détruit au dépassement');
  }

  // --------------------------------------------- source absente / corps vide
  {
    assert.equal((await readStreamWithCaps({}, { maxBytes: 16 })).length, 0);
    assert.equal((await readStreamWithCaps({ node: null, web: null }, { maxBytes: 16 })).length, 0);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
