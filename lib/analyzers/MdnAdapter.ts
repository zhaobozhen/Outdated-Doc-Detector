import { findEnglishUrl, getLocale, isEnglishLocale, toIsoDate } from './dom';
import { MDN_HOST } from './sites';
import type { PageMetadata, SiteAdapter } from './types';

function readLastModified(document: Document): string | null {
  const time = document.querySelector<HTMLTimeElement>(
    '.article-footer__last-modified time[datetime]',
  );
  return toIsoDate(time?.dateTime);
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

  inspectEnglish(document) {
    return { englishAt: readLastModified(document) };
  },
};
