import { z } from 'zod';
import {
  IntegrationRouteTypes,
  CriticalityLevels,
} from './create-interface.dto';

/**
 * Zod schema for updating an interface.
 * All fields are optional for partial updates.
 */
export const UpdateInterfaceSchema = z.object({
  /** Interface ID (human-readable identifier) */
  interface_id: z.string().min(1).optional(),

  /** Interface name */
  name: z.string().min(1).optional(),

  /** Business process ID */
  business_process_id: z.string().uuid().nullable().optional(),

  /** Business purpose description */
  business_purpose: z.string().min(1).optional(),

  /** Source application ID */
  source_application_id: z.string().uuid().optional(),

  /** Target application ID */
  target_application_id: z.string().uuid().optional(),

  /** Data category */
  data_category: z.string().min(1).optional(),

  /** Integration route type */
  integration_route_type: z.enum(IntegrationRouteTypes).optional(),

  /** Lifecycle stage */
  lifecycle: z.string().optional(),

  /** Overview notes */
  overview_notes: z.string().nullable().optional(),

  /** Criticality level */
  criticality: z.enum(CriticalityLevels).optional(),

  /** Impact of failure description */
  impact_of_failure: z.string().nullable().optional(),

  /** Business objects (JSON array) */
  business_objects: z.any().nullable().optional(),

  /** Main use cases */
  main_use_cases: z.string().nullable().optional(),

  /** Functional rules */
  functional_rules: z.string().nullable().optional(),

  /** Core transformations summary */
  core_transformations_summary: z.string().nullable().optional(),

  /** Error handling summary */
  error_handling_summary: z.string().nullable().optional(),

  /** Data classification level */
  data_class: z.string().optional(),

  /** Contains personally identifiable information */
  contains_pii: z.boolean().optional(),

  /** PII description */
  pii_description: z.string().nullable().optional(),

  /** Typical data description */
  typical_data: z.string().nullable().optional(),

  /** Audit logging description */
  audit_logging: z.string().nullable().optional(),

  /** Security controls summary */
  security_controls_summary: z.string().nullable().optional(),
});

export type UpdateInterfaceInput = z.input<typeof UpdateInterfaceSchema>;
export type UpdateInterfaceDto = z.output<typeof UpdateInterfaceSchema>;

/**
 * Parse and validate update interface input.
 */
export function parseUpdateInterface(input: unknown): UpdateInterfaceDto {
  return UpdateInterfaceSchema.parse(input);
}
