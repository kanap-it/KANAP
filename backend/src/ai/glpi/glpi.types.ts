export type GlpiConnectionOverrides = {
  glpi_url?: string | null;
  glpi_user_token?: string | null;
  glpi_app_token?: string | null;
};

export type GlpiSession = {
  baseUrl: string;
  sessionToken: string;
  appToken: string | null;
};

export type GlpiTicket = {
  id: number;
  name: string | null;
  content_html: string | null;
  status: string | null;
  priority: number | null;
  urgency: string | null;
  type: number | null;
  glpi_url: string;
};

export type GlpiDocument = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

export type GlpiTestResult = {
  ok: boolean;
  message: string;
  latency_ms: number | null;
};
