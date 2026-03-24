export type Recipient = string | string[];

export type EmailAttachmentEncoding = BufferEncoding | 'base64' | 'hex' | 'binary';

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  contentId?: string;
  encoding?: EmailAttachmentEncoding;
}

export interface SendEmailOptions {
  to: Recipient;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: Recipient;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
}
