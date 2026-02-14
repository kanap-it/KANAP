import { Readable } from 'stream';

export type PutObjectParams = {
  key: string;
  body: Buffer | Uint8Array | Readable;
  contentType?: string | null;
  contentLength?: number | null;
  metadata?: Record<string, string>;
  sse?: 'AES256';
};

export type GetObjectResult = {
  stream: Readable;
  contentType?: string | null;
  contentLength?: number | null;
  metadata?: Record<string, string>;
};

export abstract class StorageService {
  abstract putObject(params: PutObjectParams): Promise<void>;
  abstract getObjectStream(key: string): Promise<GetObjectResult>;
  abstract headObject(key: string): Promise<{ contentType?: string | null; contentLength?: number | null; metadata?: Record<string, string> } | null>;
  abstract deleteObject(key: string): Promise<void>;
  abstract getPresignedUrl(key: string, expirySeconds?: number): Promise<string>;
}

