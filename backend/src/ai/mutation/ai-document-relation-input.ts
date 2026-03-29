import { z } from 'zod';
import { RelationEntityType } from '../../knowledge/knowledge.service';

export const AI_DOCUMENT_RELATION_ENTITY_TYPES = [
  'applications',
  'assets',
  'projects',
  'requests',
  'tasks',
] as const satisfies readonly RelationEntityType[];

type RelationFieldConfig = {
  singular: string;
  label: string;
  inputHint: string;
};

const RELATION_VALUE_SCHEMA = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

const RELATION_FIELD_CONFIG: Record<RelationEntityType, RelationFieldConfig> = {
  applications: {
    singular: 'application',
    label: 'Linked Applications',
    inputHint: 'Application name or UUID. Use an array to link multiple applications.',
  },
  assets: {
    singular: 'asset',
    label: 'Linked Assets',
    inputHint: 'Asset name or UUID. Use an array to link multiple assets.',
  },
  projects: {
    singular: 'project',
    label: 'Linked Projects',
    inputHint: 'Project reference such as PRJ-33 or an exact project name. Use an array to link multiple projects.',
  },
  requests: {
    singular: 'request',
    label: 'Linked Requests',
    inputHint: 'Request reference such as REQ-14 or an exact request name. Use an array to link multiple requests.',
  },
  tasks: {
    singular: 'task',
    label: 'Linked Tasks',
    inputHint: 'Task reference such as T-42 or an exact task title. Use an array to link multiple tasks.',
  },
};

export type AiDocumentRelationInput = Partial<Record<RelationEntityType, string[]>>;

export const AI_DOCUMENT_RELATION_INPUT_SHAPE = {
  applications: RELATION_VALUE_SCHEMA.optional().describe(RELATION_FIELD_CONFIG.applications.inputHint),
  application: RELATION_VALUE_SCHEMA.optional().describe(`Alias for applications. ${RELATION_FIELD_CONFIG.applications.inputHint}`),
  assets: RELATION_VALUE_SCHEMA.optional().describe(RELATION_FIELD_CONFIG.assets.inputHint),
  asset: RELATION_VALUE_SCHEMA.optional().describe(`Alias for assets. ${RELATION_FIELD_CONFIG.assets.inputHint}`),
  projects: RELATION_VALUE_SCHEMA.optional().describe(RELATION_FIELD_CONFIG.projects.inputHint),
  project: RELATION_VALUE_SCHEMA.optional().describe(`Alias for projects. ${RELATION_FIELD_CONFIG.projects.inputHint}`),
  requests: RELATION_VALUE_SCHEMA.optional().describe(RELATION_FIELD_CONFIG.requests.inputHint),
  request: RELATION_VALUE_SCHEMA.optional().describe(`Alias for requests. ${RELATION_FIELD_CONFIG.requests.inputHint}`),
  tasks: RELATION_VALUE_SCHEMA.optional().describe(RELATION_FIELD_CONFIG.tasks.inputHint),
  task: RELATION_VALUE_SCHEMA.optional().describe(`Alias for tasks. ${RELATION_FIELD_CONFIG.tasks.inputHint}`),
};

export const AI_DOCUMENT_RELATION_WRITE_FIELDS = AI_DOCUMENT_RELATION_ENTITY_TYPES.map(
  (entityType) => `linked_${entityType}`,
);

function normalizeRelationValues(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const deduped = Array.from(new Set(
    values
      .map((entry) => String(entry || '').trim())
      .filter(Boolean),
  ));

  return deduped.length > 0 ? deduped : [];
}

function sameRelationValues(left: string[] | undefined, right: string[] | undefined): boolean {
  const sortedLeft = [...(left || [])].sort();
  const sortedRight = [...(right || [])].sort();
  if (sortedLeft.length !== sortedRight.length) {
    return false;
  }
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function extractAiDocumentRelationInput(
  value: Record<string, unknown>,
  ctx?: z.RefinementCtx,
): AiDocumentRelationInput {
  const relations: AiDocumentRelationInput = {};

  for (const entityType of AI_DOCUMENT_RELATION_ENTITY_TYPES) {
    const pluralValues = normalizeRelationValues(value[entityType]);
    const singularKey = RELATION_FIELD_CONFIG[entityType].singular;
    const singularValues = normalizeRelationValues(value[singularKey]);

    if (
      pluralValues !== undefined
      && singularValues !== undefined
      && !sameRelationValues(pluralValues, singularValues)
    ) {
      ctx?.addIssue({
        code: z.ZodIssueCode.custom,
        message: `\`${entityType}\` and \`${singularKey}\` must match when both are provided.`,
        path: [singularKey],
      });
      continue;
    }

    const merged = pluralValues ?? singularValues;
    if (merged && merged.length > 0) {
      relations[entityType] = merged;
    }
  }

  return relations;
}

export function hasAiDocumentRelationInput(relations: AiDocumentRelationInput | null | undefined): boolean {
  return AI_DOCUMENT_RELATION_ENTITY_TYPES.some((entityType) => (relations?.[entityType] || []).length > 0);
}

export function getAiDocumentRelationInputSummary(): Record<string, string> {
  return Object.fromEntries(
    AI_DOCUMENT_RELATION_ENTITY_TYPES.map((entityType) => [entityType, RELATION_FIELD_CONFIG[entityType].inputHint]),
  );
}

export function getAiDocumentRelationLabel(entityType: RelationEntityType): string {
  return RELATION_FIELD_CONFIG[entityType].label;
}

export function getAiDocumentRelationSingular(entityType: RelationEntityType): string {
  return RELATION_FIELD_CONFIG[entityType].singular;
}
