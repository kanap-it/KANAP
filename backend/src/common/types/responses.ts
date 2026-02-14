/**
 * Standard response types for API endpoints.
 */

/**
 * Paginated list response with total count for offset-based pagination.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Single item response wrapper.
 */
export interface SingleResponse<T> {
  data: T;
}

/**
 * Standard response for delete operations.
 */
export interface DeleteResponse {
  deleted: boolean;
  id: string;
}

/**
 * Bulk delete response.
 */
export interface BulkDeleteResponse {
  deleted: boolean;
  count: number;
  ids: string[];
}

/**
 * Helper function to create a paginated response.
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  offset: number,
  limit: number,
): PaginatedResponse<T> {
  return { items, total, offset, limit };
}

/**
 * Helper function to create a single item response.
 */
export function singleResponse<T>(data: T): SingleResponse<T> {
  return { data };
}

/**
 * Helper function to create a delete response.
 */
export function deleteResponse(id: string, deleted = true): DeleteResponse {
  return { deleted, id };
}

/**
 * Helper function to create a bulk delete response.
 */
export function bulkDeleteResponse(ids: string[], deleted = true): BulkDeleteResponse {
  return { deleted, count: ids.length, ids };
}
