import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { StorageService, PutObjectParams, GetObjectResult } from './storage.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService extends StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private bucket: string;
  private region!: string;
  private forcePathStyle = false;
  private client!: S3Client;
  private hasLoggedSseFallback = false;

  constructor() {
    super();
    const endpoint = process.env.S3_ENDPOINT?.trim();
    this.region = process.env.S3_REGION?.trim() || 'nbg1';
    this.forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE ?? 'false').toLowerCase() === 'true';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const bucket = process.env.S3_BUCKET?.trim();
    this.bucket = bucket || '';
    if (!endpoint) throw new Error('S3_ENDPOINT not configured');
    this.client = new S3Client({
      region: this.region,
      endpoint,
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private getAwsErrorInfo(error: any): { code: string; status: number | string; message: string } {
    const code = error?.name || error?.Code || error?.code || 'S3Error';
    const status = error?.$metadata?.httpStatusCode ?? error?.statusCode ?? error?.status ?? 'n/a';
    const message = error?.message || String(error);
    return { code, status, message };
  }

  private isSseUnsupportedError(error: any): boolean {
    const code = String(error?.name || error?.Code || error?.code || '').toLowerCase();
    const status = error?.$metadata?.httpStatusCode ?? error?.statusCode ?? error?.status;
    return code === 'invalidargument' || code === 'notimplemented'
      || Number(status) === 400 || Number(status) === 501;
  }

  private toReadable(body: any): Readable {
    if (!body) {
      throw new Error('S3 object body is empty');
    }
    if (typeof body.pipe === 'function') {
      return body as Readable;
    }
    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      return Readable.from(body);
    }
    throw new Error('Unsupported S3 object body type');
  }

  async putObject(params: PutObjectParams): Promise<void> {
    if (!this.bucket) throw new Error('S3_BUCKET is not configured');
    const metadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(params.metadata ?? {})) {
      if (!value) continue;
      metadata[key] = value;
    }
    const body = params.body as any;
    const contentLength = typeof params.contentLength === 'number' ? params.contentLength : (Buffer.isBuffer(body) ? body.length : undefined);
    const baseInput = {
      Bucket: this.bucket,
      Key: params.key,
      Body: body,
      ContentType: params.contentType || undefined,
      ContentLength: contentLength,
      Metadata: Object.keys(metadata).length ? metadata : undefined,
    };
    try {
      await this.client.send(new PutObjectCommand({
        ...baseInput,
        // Keep explicit SSE where supported; if provider rejects it, fallback below.
        ServerSideEncryption: params.sse || undefined,
      }));
    } catch (e: any) {
      // Some S3-compatible providers reject explicit SSE headers:
      // - 400 InvalidArgument (e.g. Cloudflare R2)
      // - 501 NotImplemented (e.g. MinIO without KMS)
      if (params.sse && this.isSseUnsupportedError(e)) {
        try {
          await this.client.send(new PutObjectCommand(baseInput as any));
          if (!this.hasLoggedSseFallback) {
            // Log once to keep signal without flooding.
            this.hasLoggedSseFallback = true;
            this.logger.warn(
              'PutObject fallback used: provider rejected explicit SSE header; upload retried without SSE request header',
            );
          }
          return;
        } catch (retryErr: any) {
          const retryInfo = this.getAwsErrorInfo(retryErr);
          throw new Error(`${retryInfo.code} (${retryInfo.status}): ${retryInfo.message}`);
        }
      }
      const { code, status, message } = this.getAwsErrorInfo(e);
      throw new Error(`${code} (${status}): ${message}`);
    }
  }

  async getObjectStream(key: string): Promise<GetObjectResult> {
    if (!this.bucket) throw new Error('S3_BUCKET is not configured');
    try {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      const stream = this.toReadable(result.Body);
      const contentType = result.ContentType ?? null;
      const contentLength = typeof result.ContentLength === 'number' ? result.ContentLength : null;
      const metadata = result.Metadata ?? undefined;
      return { stream, contentType, contentLength, metadata };
    } catch (e: any) {
      const { code, status, message } = this.getAwsErrorInfo(e);
      throw new Error(`${code} (${status}): ${message}`);
    }
  }

  async headObject(key: string): Promise<{ contentType?: string | null; contentLength?: number | null; metadata?: Record<string, string> } | null> {
    if (!this.bucket) throw new Error('S3_BUCKET is not configured');
    try {
      const result = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        contentType: result.ContentType ?? null,
        contentLength: typeof result.ContentLength === 'number' ? result.ContentLength : null,
        metadata: result.Metadata ?? undefined,
      };
    } catch (e: any) {
      const status = e?.$metadata?.httpStatusCode ?? e?.statusCode;
      const code = e?.name || e?.Code || e?.code;
      if (status === 404 || code === 'NoSuchKey' || code === 'NotFound') {
        return null;
      }
      const info = this.getAwsErrorInfo(e);
      throw new Error(`${info.code} (${info.status}): ${info.message}`);
    }
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.bucket) throw new Error('S3_BUCKET is not configured');
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (e: any) {
      const { code, status, message } = this.getAwsErrorInfo(e);
      throw new Error(`${code} (${status}): ${message}`);
    }
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    if (!this.bucket) throw new Error('S3_BUCKET is not configured');
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expirySeconds },
      );
    } catch (e: any) {
      const { code, status, message } = this.getAwsErrorInfo(e);
      throw new Error(`${code} (${status}): ${message}`);
    }
  }

  async *listObjects(prefix: string): AsyncGenerator<{ key: string; lastModified: Date | null; size: number }> {
    if (!this.bucket) throw new Error('S3_BUCKET is not configured');
    let continuationToken: string | undefined;
    do {
      const result = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      for (const obj of result.Contents ?? []) {
        if (obj.Key) {
          yield {
            key: obj.Key,
            lastModified: obj.LastModified ?? null,
            size: obj.Size ?? 0,
          };
        }
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);
  }
}
