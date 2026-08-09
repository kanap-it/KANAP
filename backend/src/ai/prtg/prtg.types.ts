// PRTG classic API (v1) transport types. Raw PRTG shapes stay inside the
// backend/src/ai/prtg module and the PRTG monitoring adapter — normalized
// monitoring vocabularies are the only thing that leaves the adapter layer.

// Credential material formats (parsed defensively, never echoed):
// - plain string                       => API token (PRTG >= 21.2)
// - JSON { "api_token": "..." }        => API token
// - JSON { "username", "passhash" }    => legacy username+passhash fallback
export type PrtgAuth =
  | { kind: 'api_token'; apiToken: string }
  | { kind: 'passhash'; username: string; passhash: string };

export type PrtgConnection = {
  // Normalized base URL (no trailing slash), e.g. https://prtg.example.com
  baseUrl: string;
  auth: PrtgAuth;
  // IANA time zone the PRTG server clock runs in (adapter-config metadata
  // `server_timezone`). PRTG absolute `*_raw` datetimes and sdate/edate
  // parameters are server-local wall-clock values; absent/null means UTC.
  serverTimeZone?: string | null;
  // Operator-tuned per-request timeout (ai_adapter_configs.timeout_seconds,
  // already clamped by the adapter); absent/null means the client default.
  requestTimeoutMs?: number | null;
};

export type PrtgObjectContent = 'sensors' | 'devices' | 'groups';

// table.json rows are parsed defensively as loose records: PRTG returns the
// requested columns plus `<column>_raw` twins. Display columns are LOCALIZED
// strings and must never be parsed for semantics — only `_raw` values are.
export type PrtgTableRow = Record<string, unknown>;

export type PrtgTableRequest = {
  content: PrtgObjectContent;
  columns: readonly string[];
  // Repeated query filters, e.g. [['filter_status', '5'], ['filter_status', '4']].
  filters?: ReadonlyArray<readonly [string, string]>;
  // Scopes the table to an object subtree via the PRTG `id=` query parameter.
  parentObjectId?: string | null;
  count: number;
  start: number;
};

// getsensordetails.json `sensordata` payload — loose record, enrichment only.
export type PrtgSensorDetails = Record<string, unknown>;

export type PrtgHistoricDataRequest = {
  sensorId: string;
  startDate: Date;
  endDate: Date;
  averageIntervalSeconds: number;
};

// historicdata.json `histdata` rows: `datetime`/`datetime_raw` plus one
// display + `_raw` pair per channel (channel names are instance-defined).
export type PrtgHistoricRow = Record<string, unknown>;

export type PrtgSensorTypeInUse = {
  id: string;
  name: string;
};

// Structured transport error carrying the normalized adapter error code so
// the provider layer never has to substring-classify PRTG messages. Messages
// must never contain URLs with query strings (auth material lives there).
export type PrtgApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'timeout'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'invalid_response';

export class PrtgApiError extends Error {
  constructor(
    readonly errorCode: PrtgApiErrorCode,
    message: string,
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'PrtgApiError';
  }
}
