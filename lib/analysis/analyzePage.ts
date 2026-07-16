import { findAdapter } from '../analyzers';
import { classifyFreshness } from './classify';
import { createDocumentDiff } from './documentDiff';
import type { DocumentDiff } from './diffTypes';
import type { AnalysisResult, FetchedPage, UnknownReason } from './types';

interface AnalyzePageOptions {
  document: Document;
  url: URL;
  fetchEnglish: (
    url: string,
    site: NonNullable<ReturnType<typeof findAdapter>>['id'],
  ) => Promise<FetchedPage>;
  now?: Date;
  onDocumentDiff?: (diff: DocumentDiff | null) => void;
}

export async function analyzePage({
  document,
  url,
  fetchEnglish,
  now = new Date(),
  onDocumentDiff,
}: AnalyzePageOptions): Promise<AnalysisResult> {
  const checkedAt = now.toISOString();
  const adapter = findAdapter(url);

  if (!adapter) {
    return { kind: 'unsupported', pageUrl: url.href, checkedAt };
  }

  const localized = adapter.inspect(document, url);
  if (localized.isEnglish) {
    return {
      kind: 'english',
      site: localized.site,
      pageUrl: localized.pageUrl,
      englishUrl: localized.englishUrl ?? localized.pageUrl,
      locale: localized.locale,
      checkedAt,
    };
  }

  const unreliable = (
    reason: UnknownReason,
    englishUrl: string | null = localized.englishUrl,
  ): AnalysisResult => ({
    kind: 'unknown',
    site: localized.site,
    pageUrl: localized.pageUrl,
    englishUrl,
    locale: localized.locale,
    reason,
    checkedAt,
  });

  if (!localized.englishUrl) {
    return unreliable('missing-english-url', null);
  }
  if (!localized.localizedAt) {
    return unreliable('missing-localized-date');
  }

  let fetched: FetchedPage;
  try {
    fetched = await fetchEnglish(localized.englishUrl, adapter.id);
  } catch {
    return {
      kind: 'error',
      site: localized.site,
      pageUrl: localized.pageUrl,
      englishUrl: localized.englishUrl,
      locale: localized.locale,
      reason: 'network',
      checkedAt,
    };
  }

  const englishDocument = new DOMParser().parseFromString(fetched.html, 'text/html');
  const { englishAt } = adapter.inspectEnglish(englishDocument, fetched.lastModified);
  if (!englishAt) {
    return unreliable('missing-english-date');
  }

  const freshness = classifyFreshness(new Date(localized.localizedAt), new Date(englishAt));
  try {
    const localizedComparable = adapter.inspectComparable(document, url);
    const englishComparable = adapter.inspectComparable(
      englishDocument,
      new URL(fetched.url),
    );
    onDocumentDiff?.(createDocumentDiff(localizedComparable, englishComparable));
  } catch {
    onDocumentDiff?.(null);
  }
  return {
    ...freshness,
    site: localized.site,
    pageUrl: localized.pageUrl,
    englishUrl: fetched.url,
    locale: localized.locale,
    localizedAt: localized.localizedAt,
    englishAt,
    checkedAt,
  };
}
