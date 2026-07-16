import { isFreshnessKind, type FreshnessKind } from './classify';
import type { DocumentDiff } from './diffTypes';
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

export function createPreviewDocumentDiff(value: string | null): DocumentDiff {
  const changed = value === 'changed';
  return {
    changes: changed
      ? [
          {
            added: ['SnapshotStateList<T>'],
            confidence: 'high',
            kind: 'inline-code',
            removed: [],
            sectionTitle: '修复稳定性问题',
            truncated: false,
          },
          {
            added: ['val items = immutableListOf(value)'],
            confidence: 'high',
            kind: 'code',
            removed: ['val items = listOf(value)'],
            sectionTitle: '不可变集合',
            truncated: false,
          },
        ]
      : [],
    english: { codeBlocks: 3, inlineCode: 19, links: 6, sections: 9, tables: 0 },
    localized: {
      codeBlocks: changed ? 2 : 3,
      inlineCode: changed ? 18 : 19,
      links: 6,
      sections: 9,
      tables: 0,
    },
    matchedSections: 9,
    reliability: 'exact',
    truncated: false,
    unalignedSections: 0,
  };
}

export function createStabilityPreviewResult(): ComparedResult {
  const localizedAt = new Date('2025-07-26T00:00:00.000Z');
  const englishAt = new Date('2026-01-16T00:00:00.000Z');
  const lagMs = englishAt.getTime() - localizedAt.getTime();
  return {
    checkedAt: '2026-07-15T00:00:00.000Z',
    englishAt: englishAt.toISOString(),
    englishUrl:
      'https://developer.android.com/develop/ui/compose/performance/stability?hl=en',
    kind: 'stale',
    lagDays: Math.floor(lagMs / DAY_MS),
    lagMs,
    locale: 'zh-CN',
    localizedAt: localizedAt.toISOString(),
    pageUrl:
      'https://developer.android.com/develop/ui/compose/performance/stability?hl=zh-cn',
    site: 'google-devsite',
  };
}
