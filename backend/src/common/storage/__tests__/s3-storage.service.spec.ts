import * as assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { S3StorageService } from '../s3-storage.service';

type EnvSnapshot = Record<string, string | undefined>;

function snapshotEnv(keys: string[]): EnvSnapshot {
  return keys.reduce<EnvSnapshot>((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
}

async function testPutObjectBuffersReadableBodiesBeforeSseFallbackRetry() {
  const envSnapshot = snapshotEnv([
    'S3_ENDPOINT',
    'S3_REGION',
    'S3_FORCE_PATH_STYLE',
    'S3_BUCKET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ]);

  process.env.S3_ENDPOINT = 'https://example.invalid';
  process.env.S3_REGION = 'test-region';
  process.env.S3_FORCE_PATH_STYLE = 'false';
  process.env.S3_BUCKET = 'test-bucket';
  process.env.AWS_ACCESS_KEY_ID = 'test-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

  try {
    const service = new S3StorageService();
    const seenInputs: any[] = [];

    (service as any).client = {
      send: async (command: any) => {
        const input = command.input;
        seenInputs.push(input);

        if (seenInputs.length === 1) {
          assert.equal(Buffer.isBuffer(input.Body), true);
          assert.equal(input.ServerSideEncryption, 'AES256');
          throw {
            name: 'NotImplemented',
            message: 'explicit SSE header rejected',
            $metadata: { httpStatusCode: 501 },
          };
        }

        if (input.Body instanceof Readable) {
          throw {
            name: 'Error',
            message: 'Unable to calculate hash for flowing readable stream',
          };
        }

        assert.equal(input.ServerSideEncryption, undefined);
        assert.equal(Buffer.isBuffer(input.Body), true);
        assert.equal(input.ContentLength, Buffer.byteLength('hello world'));
        assert.equal(input.Body.toString('utf8'), 'hello world');
        return {};
      },
    };

    await service.putObject({
      key: 'files/test.txt',
      body: Readable.from([Buffer.from('hello world', 'utf8')]),
      contentType: 'text/plain',
      sse: 'AES256',
    });

    assert.equal(seenInputs.length, 2);
  } finally {
    restoreEnv(envSnapshot);
  }
}

async function run() {
  await testPutObjectBuffersReadableBodiesBeforeSseFallbackRetry();
}

void run();
