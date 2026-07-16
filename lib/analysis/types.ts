import type { SiteId } from '../analyzers/types';
import type { FreshnessKind } from './classify';

interface ResultBase {
  pageUrl: string;
  checkedAt: string;
}

export interface FetchedPage {
  html: string;
  lastModified: string | null;
  url: string;
}

export interface ComparedResult extends ResultBase {
  kind: FreshnessKind;
  site: SiteId;
  englishUrl: string;
  locale: string;
  localizedAt: string;
  englishAt: string;
  lagMs: number;
  lagDays: number;
}

export interface UnsupportedResult extends ResultBase {
  kind: 'unsupported';
}

export interface EnglishPageResult extends ResultBase {
  kind: 'english';
  site: SiteId;
  englishUrl: string;
  locale: string;
}

export type UnknownReason =
  | 'missing-english-url'
  | 'missing-localized-date'
  | 'missing-english-date';

export interface UnknownResult extends ResultBase {
  kind: 'unknown';
  site: SiteId;
  englishUrl: string | null;
  locale: string;
  reason: UnknownReason;
}

export interface ErrorResult extends ResultBase {
  kind: 'error';
  site: SiteId;
  englishUrl: string;
  locale: string;
  reason: 'network';
}

export interface CheckingResult extends ResultBase {
  kind: 'checking';
}

export type AnalysisResult =
  | ComparedResult
  | UnsupportedResult
  | EnglishPageResult
  | UnknownResult
  | ErrorResult
  | CheckingResult;

export function isWarningResult(
  result: AnalysisResult,
): result is ComparedResult & { kind: 'behind' | 'outdated' | 'stale' } {
  return result.kind === 'behind' || result.kind === 'outdated' || result.kind === 'stale';
}
