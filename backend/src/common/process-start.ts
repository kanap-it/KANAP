/**
 * Instant this process started, shared by the start-up report and the legacy access-token window
 * so both name the same cut-over. A module constant is deliberate: it is evaluated once, at first
 * import, before any provider is constructed.
 */
export const PROCESS_STARTED_AT = Date.now();
