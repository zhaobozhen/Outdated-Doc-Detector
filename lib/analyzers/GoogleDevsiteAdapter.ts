import { findEnglishUrl, getLocale, isEnglishLocale, toIsoDate } from './dom';
import { GOOGLE_DEVSITE_HOSTS } from './sites';
import type { PageMetadata, SiteAdapter } from './types';

const SUPPORTED_HOSTS = new Set<string>(GOOGLE_DEVSITE_HOSTS);

const FOOTER_SELECTORS = [
  'devsite-content-footer time[datetime]',
  'devsite-content-footer [itemprop="dateModified"][content]',
  'devsite-content-footer [data-translation-date]',
  'devsite-content-footer',
  '#devsite-content-footer',
];

const META_SELECTORS = [
  'meta[itemprop="dateModified"][content]',
  'meta[property="article:modified_time"][content]',
];

function dateFromElement(element: Element): string | null {
  const value =
    element.getAttribute('datetime') ??
    element.getAttribute('content') ??
    element.getAttribute('data-translation-date');
  const fromAttribute = toIsoDate(value);
  if (fromAttribute) {
    return fromAttribute;
  }

  const match = element.textContent?.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/u);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return toIsoDate(`${year}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}T00:00:00.000Z`);
}

function readDevsiteDate(document: Document): string | null {
  for (const selector of FOOTER_SELECTORS) {
    const element = document.querySelector(selector);
    const date = element ? dateFromElement(element) : null;
    if (date) {
      return date;
    }
  }

  for (const selector of META_SELECTORS) {
    const element = document.querySelector(selector);
    const date = element ? dateFromElement(element) : null;
    if (date) {
      return date;
    }
  }

  return null;
}

export const GoogleDevsiteAdapter: SiteAdapter = {
  id: 'google-devsite',

  canHandle(url) {
    return SUPPORTED_HOSTS.has(url.hostname);
  },

  inspect(document, url): PageMetadata {
    const locale = getLocale(document);
    const isEnglish = isEnglishLocale(locale);

    return {
      site: 'google-devsite',
      pageUrl: url.href,
      englishUrl: isEnglish ? url.href : findEnglishUrl(document, url),
      locale,
      localizedAt: readDevsiteDate(document),
      isEnglish,
    };
  },

  inspectEnglish(document, lastModified) {
    return { englishAt: readDevsiteDate(document) ?? toIsoDate(lastModified) };
  },
};
