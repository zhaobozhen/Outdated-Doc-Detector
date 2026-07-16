import { isFreshnessKind, type FreshnessKind } from './classify';
import type { ComparedResult } from './types';

const DAY_MS = 86_400_000;
const PREVIEW_LAG_DAYS: Record<FreshnessKind, number> = {
  current: 0,
  behind: 3,
  outdated: 21,
  stale: 105,
};

export function createPreviewResult(value: string | null): ComparedResult {
  const kind = value && isFreshnessKind(value) ? value : 'stale';
  const lagDays = PREVIEW_LAG_DAYS[kind];
  const englishAt = new Date('2026-07-10T00:00:00.000Z');

  return {
    kind,
    site: 'google-devsite',
    pageUrl: 'https://firebase.google.com/docs/cloud-messaging?hl=zh-cn',
    englishUrl: 'https://firebase.google.com/docs/cloud-messaging',
    locale: 'zh-CN',
    localizedAt: new Date(englishAt.getTime() - lagDays * DAY_MS).toISOString(),
    englishAt: englishAt.toISOString(),
    lagMs: lagDays * DAY_MS,
    lagDays,
    checkedAt: '2026-07-15T00:00:00.000Z',
  };
}
