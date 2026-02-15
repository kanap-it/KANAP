/**
 * Shared inactive-segment computation for roadmap Gantt rendering.
 * Used by both the UI (PortfolioGantt) and PNG export (exportRoadmapGanttAsPng)
 * to guarantee parity.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseYmdUtc(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function getWeekStartMondayUtc(date: Date): Date {
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  return new Date(date.getTime() - offset * MS_PER_DAY);
}

export type InactiveSegment = {
  /** Segment type: 'gap' for scheduling gaps, 'on_hold' for on-hold periods */
  type: 'gap' | 'on_hold';
  /** Inclusive start date (YYYY-MM-DD) */
  from: string;
  /** Inclusive end date (YYYY-MM-DD) */
  to: string;
};

/**
 * Compute inactive segments for a scheduled project.
 *
 * @param plannedStart - Scheduled start date (YYYY-MM-DD)
 * @param plannedEnd - Scheduled end date (YYYY-MM-DD)
 * @param activeWeekStarts - Sorted ascending list of week-start dates where effort was burned
 * @param onHoldRanges - Optional on-hold date ranges from backend
 * @param historicalStart - Optional historical start date (may be before plannedStart)
 */
export function computeInactiveSegments(
  plannedStart: string,
  plannedEnd: string,
  activeWeekStarts: string[],
  onHoldRanges?: Array<{ from: string; to: string }>,
  historicalStart?: string | null,
): InactiveSegment[] {
  const segments: InactiveSegment[] = [];

  const startDate = parseYmdUtc(plannedStart);
  const endDate = parseYmdUtc(plannedEnd);

  // --- Scheduling gaps ---
  // Build set of all week-start keys between planned start and planned end
  if (activeWeekStarts.length > 0) {
    const activeSet = new Set(activeWeekStarts);
    const firstActive = parseYmdUtc(activeWeekStarts[0]);
    const lastActive = parseYmdUtc(activeWeekStarts[activeWeekStarts.length - 1]);

    // Iterate over weeks between first and last active week
    let cursor = getWeekStartMondayUtc(firstActive);
    const lastWeekStart = getWeekStartMondayUtc(lastActive);
    let gapStart: Date | null = null;

    while (cursor.getTime() <= lastWeekStart.getTime()) {
      const weekKey = cursor.toISOString().slice(0, 10);

      if (!activeSet.has(weekKey)) {
        if (!gapStart) gapStart = new Date(cursor);
      } else {
        if (gapStart) {
          // Gap ends at Friday of the previous week
          const gapEnd = new Date(cursor.getTime() - MS_PER_DAY * 3); // previous Friday
          segments.push({
            type: 'gap',
            from: gapStart.toISOString().slice(0, 10),
            to: gapEnd.toISOString().slice(0, 10),
          });
          gapStart = null;
        }
      }
      cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY);
    }

    // Close any trailing gap
    if (gapStart) {
      // Gap extends to end of last gap week (Friday)
      const lastGapWeekEnd = new Date(cursor.getTime() - MS_PER_DAY * 3);
      const clippedEnd = new Date(Math.min(lastGapWeekEnd.getTime(), endDate.getTime()));
      segments.push({
        type: 'gap',
        from: gapStart.toISOString().slice(0, 10),
        to: clippedEnd.toISOString().slice(0, 10),
      });
    }
  }

  // --- On-hold ranges ---
  if (onHoldRanges) {
    for (const range of onHoldRanges) {
      segments.push({
        type: 'on_hold',
        from: range.from,
        to: range.to,
      });
    }
  }

  return segments;
}

/**
 * Get a tooltip description for inactive segments.
 */
export function formatInactiveTooltip(segments: InactiveSegment[]): string {
  if (segments.length === 0) return '';
  const lines: string[] = [];
  for (const seg of segments) {
    const label = seg.type === 'gap' ? 'Scheduling Gap' : 'On Hold';
    lines.push(`${label}: ${seg.from} → ${seg.to}`);
  }
  return lines.join('\n');
}
