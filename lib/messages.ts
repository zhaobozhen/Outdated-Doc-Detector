import type { AnalysisResult } from './analysis/types';
import type { FetchedPage } from './analysis/types';
import { isFreshnessKind } from './analysis/classify';
import { isSiteId } from './analyzers/sites';
import type { SiteId } from './analyzers/sites';

export interface ExtensionMessageMap {
  'fetch:english': {
    request: { url: string; site: SiteId };
    response: FetchedPage;
  };
  'analysis:publish': {
    request: { result: AnalysisResult };
    response: void;
  };
  'analysis:get': {
    request: { tabId: number; pageUrl: string };
    response: AnalysisResult | null;
  };
  'analysis:run': {
    request: Record<never, never>;
    response: AnalysisResult;
  };
  'english:open': {
    request: { url: string; site: SiteId };
    response: void;
  };
}

export type ExtensionMessageType = keyof ExtensionMessageMap;
export type ExtensionMessageOf<Type extends ExtensionMessageType> = {
  type: Type;
} & ExtensionMessageMap[Type]['request'];
export type ExtensionMessage = {
  [Type in ExtensionMessageType]: ExtensionMessageOf<Type>;
}[ExtensionMessageType];
export type ExtensionMessageResponse<Type extends ExtensionMessageType> =
  ExtensionMessageMap[Type]['response'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasBaseResult(value: Record<string, unknown>): boolean {
  return typeof value.pageUrl === 'string' && typeof value.checkedAt === 'string';
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!isRecord(value) || !hasBaseResult(value) || typeof value.kind !== 'string') {
    return false;
  }
  if (value.kind === 'checking' || value.kind === 'unsupported') {
    return true;
  }

  if (!isSiteId(value.site) || typeof value.locale !== 'string') {
    return false;
  }
  if (value.kind === 'english') {
    return typeof value.englishUrl === 'string';
  }
  if (value.kind === 'unknown') {
    return (
      (typeof value.englishUrl === 'string' || value.englishUrl === null) &&
      ['missing-english-url', 'missing-localized-date', 'missing-english-date'].includes(
        String(value.reason),
      )
    );
  }
  if (value.kind === 'error') {
    return typeof value.englishUrl === 'string' && value.reason === 'network';
  }
  if (isFreshnessKind(value.kind)) {
    return (
      typeof value.englishUrl === 'string' &&
      typeof value.localizedAt === 'string' &&
      typeof value.englishAt === 'string' &&
      typeof value.lagMs === 'number' &&
      Number.isFinite(value.lagMs) &&
      typeof value.lagDays === 'number' &&
      Number.isFinite(value.lagDays)
    );
  }

  return false;
}

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type === 'fetch:english') {
    return typeof value.url === 'string' && isSiteId(value.site);
  }
  if (value.type === 'analysis:publish') {
    return isAnalysisResult(value.result);
  }
  if (value.type === 'analysis:get') {
    return (
      Number.isInteger(value.tabId) &&
      Number(value.tabId) >= 0 &&
      typeof value.pageUrl === 'string'
    );
  }
  if (value.type === 'english:open') {
    return typeof value.url === 'string' && isSiteId(value.site);
  }
  return value.type === 'analysis:run';
}
