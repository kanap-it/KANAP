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
  entity_id?: number | null;
  category_id?: number | null;
  date?: string | null;
  updated_date?: string | null;
  glpi_url: string;
};

export type GlpiTicketListScope = {
  createdAfter: string;
  maxResults: number;
  entityId?: number | null;
  categoryId?: number | null;
};

export type GlpiTicketFollowup = {
  id: number;
  content_html: string | null;
  author_id?: number | null;
  author_label: string | null;
  editor_id?: number | null;
  date: string | null;
  updated_date?: string | null;
  is_private: boolean;
  image_targets: string[];
};

export type GlpiTicketUserAssociation = {
  id: number;
  user_id: number;
  user_label: string | null;
  role: 'requester' | 'assigned' | 'observer' | 'unknown';
};

export type GlpiTicketFollowupWriteResult = {
  id: number;
  ticket_id: number;
  is_private: boolean;
  content_html: string | null;
};

export type GlpiTicketUpdateFields = {
  type?: number;
  priority?: number;
  urgency?: number;
  status?: number;
};

export type GlpiTicketUpdateResult = {
  ticket_id: number;
  updated_fields: string[];
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
