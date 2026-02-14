import { z } from 'zod';
import { ListQuerySchema, ListQuery } from '../../common/dto/list-query.dto';
import { IntegrationRouteTypes, CriticalityLevels, InterfaceLifecycles } from './create-interface.dto';

/**
 * Extended query schema for listing interfaces.
 * Extends the common ListQuerySchema with interface-specific filters.
 */
export const ListInterfacesQuerySchema = ListQuerySchema.extend({
  /** Filter by source application ID */
  source_application_id: z.string().uuid().optional(),

  /** Filter by target application ID */
  target_application_id: z.string().uuid().optional(),

  /** Filter by business process ID */
  business_process_id: z.string().uuid().optional(),

  /** Filter by integration route type */
  integration_route_type: z.enum(IntegrationRouteTypes).optional(),

  /** Filter by lifecycle (comma-separated for multiple) */
  lifecycle: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }),

  /** Filter by criticality */
  criticality: z.enum(CriticalityLevels).optional(),

  /** Filter by data classification */
  data_class: z.string().optional(),

  /** Filter by contains PII */
  contains_pii: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'boolean') return val;
      return val.toLowerCase() === 'true';
    }),
});

export type ListInterfacesQueryInput = z.input<typeof ListInterfacesQuerySchema>;
export type ListInterfacesQuery = z.output<typeof ListInterfacesQuerySchema>;

/**
 * Parse and validate list interfaces query parameters.
 */
export function parseListInterfacesQuery(input: unknown): ListInterfacesQuery {
  return ListInterfacesQuerySchema.parse(input);
}

/**
 * DTO class for list interfaces query.
 */
export class ListInterfacesQueryDto implements ListInterfacesQuery {
  offset!: number;
  limit!: number;
  sort!: { field: string; direction: 'ASC' | 'DESC' };
  filter?: Record<string, unknown>;
  include!: string[];
  q?: string;
  status?: 'enabled' | 'disabled';
  source_application_id?: string;
  target_application_id?: string;
  business_process_id?: string;
  integration_route_type?: (typeof IntegrationRouteTypes)[number];
  lifecycle?: string[];
  criticality?: (typeof CriticalityLevels)[number];
  data_class?: string;
  contains_pii?: boolean;

  static parse(input: unknown): ListInterfacesQuery {
    return ListInterfacesQuerySchema.parse(input);
  }

  static safeParse(input: unknown): z.SafeParseReturnType<ListInterfacesQueryInput, ListInterfacesQuery> {
    return ListInterfacesQuerySchema.safeParse(input);
  }

  static from(input: unknown): ListInterfacesQueryDto {
    const parsed = ListInterfacesQuerySchema.parse(input);
    const dto = new ListInterfacesQueryDto();
    Object.assign(dto, parsed);
    return dto;
  }
}
