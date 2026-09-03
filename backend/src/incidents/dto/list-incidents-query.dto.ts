import { z } from 'zod';
import { parseWith } from './parse';

const optionalUuid = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.string().uuid().optional(),
);

/**
 * Extra list parameters on top of the shared grid params (page, limit, sort, q, filters)
 * handled by `parsePagination`. Both restrict the list to incidents linked to that object.
 */
export const ListIncidentsQuerySchema = z
  .object({
    asset_id: optionalUuid,
    application_id: optionalUuid,
  })
  .passthrough();

export type ListIncidentsQueryInput = z.input<typeof ListIncidentsQuerySchema>;
export type ListIncidentsQuery = z.output<typeof ListIncidentsQuerySchema>;

export function parseListIncidentsQuery(input: unknown): ListIncidentsQuery {
  return parseWith(ListIncidentsQuerySchema, input);
}
