export const MAX_PERSONA_INSTRUCTIONS = 16;
export const MAX_PERSONA_INSTRUCTION_CHARS = 500;
export const MAX_PERSONA_PURPOSE_CHARS = 500;

export function cleanPersonaLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseInstructionLines(draft: string): string[] {
  return draft.split('\n').map(cleanPersonaLine).filter(Boolean);
}

export function mergeInstructionsForDisplay(input: {
  instructions: string;
  escalationGuidance: string;
  outputStyleTone: string;
}): string {
  const lines = parseInstructionLines(input.instructions);
  const escalation = cleanPersonaLine(input.escalationGuidance);
  const tone = cleanPersonaLine(input.outputStyleTone);
  if (escalation) lines.push(escalation);
  if (tone) lines.push(tone);
  return lines.join('\n');
}

export type PersonaIdentityLimits = {
  purposeChars: number;
  instructionLines: number;
  overLongLineIndex: number | null;
  purposeOverLimit: boolean;
  instructionsOverLimit: boolean;
};

export function measurePersonaIdentityLimits(input: {
  mission: string;
  instructionsDraft: string;
}): PersonaIdentityLimits {
  const purposeChars = cleanPersonaLine(input.mission).length;
  const lines = parseInstructionLines(input.instructionsDraft);
  let overLongLineIndex: number | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].length > MAX_PERSONA_INSTRUCTION_CHARS) {
      overLongLineIndex = index + 1;
      break;
    }
  }
  return {
    purposeChars,
    instructionLines: lines.length,
    overLongLineIndex,
    purposeOverLimit: purposeChars > MAX_PERSONA_PURPOSE_CHARS,
    instructionsOverLimit: lines.length > MAX_PERSONA_INSTRUCTIONS || overLongLineIndex != null,
  };
}

export function canPersistIdentity(input: {
  mission: string;
  instructionsDraft: string;
  instructionsTouched: boolean;
}): boolean {
  const limits = measurePersonaIdentityLimits(input);
  if (limits.purposeOverLimit) return false;
  if (input.instructionsTouched && limits.instructionsOverLimit) return false;
  return true;
}

export function personaIdentitySavePatch(input: {
  mission: string;
  instructionsStored: string;
  instructionsDraft: string;
  instructionsTouched: boolean;
  escalationGuidance: string;
  outputStyleTone: string;
  outputStyleLanguage: string;
  sharedContextEnabled: boolean;
  sharedContextProfileId: string | null;
}): {
  mission: string;
  instructions: string[];
  output_style: { tone: string; language: string };
  escalation_guidance: string;
  shared_context: { enabled: boolean; profile_id: string | null };
} {
  return {
    mission: input.mission,
    instructions: parseInstructionLines(input.instructionsTouched ? input.instructionsDraft : input.instructionsStored),
    output_style: {
      tone: input.instructionsTouched ? '' : input.outputStyleTone,
      language: input.outputStyleLanguage,
    },
    escalation_guidance: input.instructionsTouched ? '' : input.escalationGuidance,
    shared_context: {
      enabled: input.sharedContextEnabled,
      profile_id: input.sharedContextProfileId,
    },
  };
}

export function droppedSharedContextLineCount(bounds: string[] | undefined | null): number {
  if (!bounds?.length) return 0;
  let fromCap = 0;
  let fromBudget = 0;
  for (const entry of bounds) {
    const match = entry.match(/^shared_context_lines_clamped:(\d+)->(\d+)$/);
    if (match) fromCap = Math.max(fromCap, Number(match[1]) - Number(match[2]));
    if (entry === 'total_guidance_chars_clamped:shared_context') fromBudget += 1;
  }
  return fromCap + fromBudget;
}

export function droppedInstructionLineCount(bounds: string[] | undefined | null): number {
  if (!bounds?.length) return 0;
  let fromCap = 0;
  let fromBudget = 0;
  for (const entry of bounds) {
    const match = entry.match(/^instructions_clamped:(\d+)->(\d+)$/);
    if (match) fromCap = Math.max(fromCap, Number(match[1]) - Number(match[2]));
    if (entry === 'total_guidance_chars_clamped:instructions') fromBudget += 1;
  }
  return fromCap + fromBudget;
}

export function collectEffectivePromptBounds(prompt: {
  bounds_applied?: string[];
  prompt_profile?: Record<string, unknown>;
  tasks?: Partial<Record<string, { bounds_applied?: string[] }>>;
} | null | undefined): string[] {
  const lists: string[][] = [];
  if (Array.isArray(prompt?.bounds_applied)) lists.push(prompt.bounds_applied);
  const profileBounds = prompt?.prompt_profile?.bounds_applied;
  if (Array.isArray(profileBounds)) lists.push(profileBounds as string[]);
  for (const task of Object.values(prompt?.tasks ?? {})) {
    if (Array.isArray(task?.bounds_applied)) lists.push(task.bounds_applied);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (typeof item !== 'string' || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}
