import type { MessageKey } from '../i18n';
import { message } from '../i18n';
import type { FreshnessKind } from './classify';
import type { ComparedResult } from './types';

export type WarningKind = Exclude<FreshnessKind, 'current'>;

const STATUS_KEYS: Record<FreshnessKind, MessageKey> = {
  current: 'statusCurrent',
  behind: 'statusBehind',
  outdated: 'statusOutdated',
  stale: 'statusStale',
};

const SUMMARY_KEYS: Record<WarningKind, MessageKey> = {
  behind: 'behindSummary',
  outdated: 'outdatedSummary',
  stale: 'staleSummary',
};

export function freshnessStatusKey(kind: FreshnessKind): MessageKey {
  return STATUS_KEYS[kind];
}

export function freshnessStatusText(kind: FreshnessKind): string {
  return message(freshnessStatusKey(kind));
}

export function lagDurationText(lagDays: number): string {
  if (lagDays === 0) {
    return message('underOneDay');
  }
  if (lagDays === 1) {
    return message('oneDay');
  }
  return message('daysCount', String(lagDays));
}

export function freshnessSummaryText(result: ComparedResult): string {
  if (result.kind === 'current') {
    return message('currentSummary');
  }
  return message(SUMMARY_KEYS[result.kind], lagDurationText(result.lagDays));
}
