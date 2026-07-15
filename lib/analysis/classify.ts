const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const CURRENT_TOLERANCE_MS = 30 * MINUTE_MS;
export const OUTDATED_THRESHOLD_MS = 45 * DAY_MS;

export type FreshnessKind = 'current' | 'behind' | 'outdated';

export interface Freshness {
  kind: FreshnessKind;
  lagMs: number;
  lagDays: number;
}

export function classifyFreshness(localizedAt: Date, englishAt: Date): Freshness {
  const lagMs = Math.max(0, englishAt.getTime() - localizedAt.getTime());

  if (lagMs <= CURRENT_TOLERANCE_MS) {
    return { kind: 'current', lagMs, lagDays: 0 };
  }

  return {
    kind: lagMs >= OUTDATED_THRESHOLD_MS ? 'outdated' : 'behind',
    lagMs,
    lagDays: Math.floor(lagMs / DAY_MS),
  };
}
