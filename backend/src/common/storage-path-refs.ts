import { EntityManager } from 'typeorm';

const ATTACHMENT_TABLES = [
  'portfolio_project_attachments',
  'portfolio_request_attachments',
  'task_attachments',
  'document_attachments',
  'application_attachments',
  'interface_attachments',
  'contract_attachments',
  'spend_attachments',
  'capex_attachments',
  'asset_attachments',
] as const;

export { ATTACHMENT_TABLES };

export async function isStoragePathReferencedInAnyTable(
  manager: EntityManager,
  storagePath: string,
  excludeIds: string[] = [],
): Promise<boolean> {
  for (const table of ATTACHMENT_TABLES) {
    const query = excludeIds.length > 0
      ? `SELECT 1 AS exists FROM ${table} WHERE storage_path = $1 AND id <> ALL($2::uuid[]) LIMIT 1`
      : `SELECT 1 AS exists FROM ${table} WHERE storage_path = $1 LIMIT 1`;
    const params = excludeIds.length > 0 ? [storagePath, excludeIds] : [storagePath];
    const rows = await manager.query(query, params);
    if (rows.length > 0) return true;
  }
  return false;
}
