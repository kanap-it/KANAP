import { z } from 'zod';

/**
 * Valid integration route types.
 */
export const IntegrationRouteTypes = ['direct', 'via_middleware'] as const;

/**
 * Valid interface lifecycle stages.
 */
export const InterfaceLifecycles = ['proposed', 'planned', 'active', 'deprecated', 'retired'] as const;

/**
 * Valid criticality levels.
 */
export const CriticalityLevels = ['business_critical', 'high', 'medium', 'low'] as const;

/**
 * Valid data classification levels.
 */
export const DataClassifications = ['public', 'internal', 'confidential', 'restricted'] as const;

/**
 * Zod schema for creating an interface.
 */
export const CreateInterfaceSchema = z.object({
  /** Interface ID (human-readable identifier) */
  interface_id: z.string().min(1, 'Interface ID is required'),

  /** Interface name (required) */
  name: z.string().min(1, 'Name is required'),

  /** Business process ID (optional) */
  business_process_id: z.string().uuid().nullable().optional(),

  /** Business purpose description */
  business_purpose: z.string().min(1, 'Business purpose is required'),

  /** Source application ID */
  source_application_id: z.string().uuid('Source application ID must be a valid UUID'),

  /** Target application ID */
  target_application_id: z.string().uuid('Target application ID must be a valid UUID'),

  /** Data category */
  data_category: z.string().min(1, 'Data category is required'),

  /** Integration route type */
  integration_route_type: z.enum(IntegrationRouteTypes),

  /** Lifecycle stage */
  lifecycle: z.string().optional().default('proposed'),

  /** Overview notes (optional) */
  overview_notes: z.string().nullable().optional(),

  /** Criticality level */
  criticality: z.enum(CriticalityLevels).optional().default('medium'),

  /** Impact of failure description (optional) */
  impact_of_failure: z.string().nullable().optional(),

  /** Business objects (JSON array) */
  business_objects: z.any().nullable().optional(),

  /** Main use cases (optional) */
  main_use_cases: z.string().nullable().optional(),

  /** Functional rules (optional) */
  functional_rules: z.string().nullable().optional(),

  /** Core transformations summary (optional) */
  core_transformations_summary: z.string().nullable().optional(),

  /** Error handling summary (optional) */
  error_handling_summary: z.string().nullable().optional(),

  /** Data classification level */
  data_class: z.string().optional().default('internal'),

  /** Contains personally identifiable information */
  contains_pii: z.boolean().optional().default(false),

  /** PII description (optional) */
  pii_description: z.string().nullable().optional(),

  /** Typical data description (optional) */
  typical_data: z.string().nullable().optional(),

  /** Audit logging description (optional) */
  audit_logging: z.string().nullable().optional(),

  /** Security controls summary (optional) */
  security_controls_summary: z.string().nullable().optional(),

  /** Initial managed specification markdown (optional) */
  specification_markdown: z.string().nullable().optional(),
});

export type CreateInterfaceInput = z.input<typeof CreateInterfaceSchema>;
export type CreateInterfaceDto = z.output<typeof CreateInterfaceSchema>;

/**
 * Parse and validate create interface input.
 */
export function parseCreateInterface(input: unknown): CreateInterfaceDto {
  return CreateInterfaceSchema.parse(input);
}
