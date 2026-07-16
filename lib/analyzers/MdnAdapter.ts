import { findEnglishUrl, getLocale, isEnglishLocale, toIsoDate } from './dom';
import { extractComparableDocument } from './comparableDocument';
import { MDN_HOST } from './sites';
import type { PageMetadata, SiteAdapter } from './types';

function readLastModified(document: Document): string | null {
  const time = document.querySelector<HTMLTimeElement>(
    '.article-footer__last-modified time[datetime]',
  );
  return toIsoDate(time?.dateTime);
}

function normalizeComparableLink(value: string, baseUrl: URL): string | null {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.hash = '';
    url.pathname = url.pathname.replace(
      /^\/[a-z]{2,3}(?:-[a-z0-9]+)?\/docs\//iu,
      '/docs/',
    );
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.href;
  } catch {
    return null;
  }
}

export const MdnAdapter: SiteAdapter = {
  id: 'mdn',

  canHandle(url) {
    return url.hostname === MDN_HOST;
  },

  inspect(document, url): PageMetadata {
    const locale = getLocale(document);
    const isEnglish = isEnglishLocale(locale);

    return {
      site: 'mdn',
      pageUrl: url.href,
      englishUrl: isEnglish ? url.href : findEnglishUrl(document, url),
      locale,
      localizedAt: readLastModified(document),
      isEnglish,
    };
  },

  inspectComparable(document, url) {
    return extractComparableDocument({
      document,
      normalizeLink: (href) => normalizeComparableLink(href, url),
      rootSelector: 'main#content .reference-layout__body, main#content .layout__body, main#content',
      stableSectionIds: false,
    });
  },

  inspectEnglish(document) {
    return { englishAt: readLastModified(document) };
  },
};
