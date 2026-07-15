export function getLocale(document: Document): string {
  return document.documentElement.lang.trim() || 'und';
}

export function isEnglishLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('en');
}

export function findEnglishUrl(document: Document, pageUrl: URL): string | null {
  const alternate = document.querySelector<HTMLLinkElement | HTMLAnchorElement>(
    'link[rel~="alternate"][hreflang="en"], a[rel~="alternate"][hreflang="en"]',
  );
  const href = alternate?.getAttribute('href');

  if (!href) {
    return null;
  }

  try {
    const url = new URL(href, pageUrl);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
