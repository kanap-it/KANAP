import { CapabilityEffect } from '../capability/capability-contract';

const AUTONOMY_ORDER = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'] as const;
export type AutonomyLevel = typeof AUTONOMY_ORDER[number];

export function autonomyRank(level: string | null | undefined): number | null {
  if (!level) {
    return null;
  }
  const rank = AUTONOMY_ORDER.indexOf(level as AutonomyLevel);
  return rank >= 0 ? rank : null;
}

export function isAutonomyLevel(value: string | null | undefined): value is AutonomyLevel {
  return autonomyRank(value) !== null;
}

export function minAutonomyLevel(levels: string[]): AutonomyLevel | null {
  let minRank: number | null = null;
  for (const level of levels) {
    const rank = autonomyRank(level);
    if (rank === null) {
      return null;
    }
    minRank = minRank === null ? rank : Math.min(minRank, rank);
  }
  return minRank === null ? null : AUTONOMY_ORDER[minRank];
}

export function autonomyAtLeast(actual: string | null | undefined, required: string | null | undefined): boolean {
  const actualRank = autonomyRank(actual);
  const requiredRank = autonomyRank(required);
  return actualRank !== null && requiredRank !== null && actualRank >= requiredRank;
}

export function requiredAutonomyForEffect(effect: CapabilityEffect | string): AutonomyLevel {
  if (effect === 'read') {
    return 'A1';
  }
  if (effect === 'propose' || effect === 'notify') {
    return 'A2';
  }
  return 'A3';
}
