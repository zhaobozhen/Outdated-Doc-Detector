const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const CURRENT_TOLERANCE_MS = 30 * MINUTE_MS;
export const OUTDATED_THRESHOLD_MS = 7 * DAY_MS;
export const STALE_THRESHOLD_MS = 45 * DAY_MS;

export const FRESHNESS_KINDS = ['current', 'behind', 'outdated', 'stale'] as const;
export type FreshnessKind = (typeof FRESHNESS_KINDS)[number];

export function isFreshnessKind(value: string): value is FreshnessKind {
  return FRESHNESS_KINDS.some((kind) => kind === value);
}

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

  let kind: FreshnessKind = 'behind';
  if (lagMs >= STALE_THRESHOLD_MS) {
    kind = 'stale';
  } else if (lagMs >= OUTDATED_THRESHOLD_MS) {
    kind = 'outdated';
  }

  return {
    kind,
    lagMs,
    lagDays: Math.floor(lagMs / DAY_MS),
  };
}
