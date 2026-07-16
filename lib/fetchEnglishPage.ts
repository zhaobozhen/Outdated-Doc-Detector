import { findAdapterById } from './analyzers';
import type { SiteId } from './analyzers/sites';
import type { FetchedPage } from './analysis/types';

export async function fetchEnglishPage(value: string, site: SiteId): Promise<FetchedPage> {
  const url = new URL(value);
  const adapter = findAdapterById(site);
  if (url.protocol !== 'https:' || !adapter?.canHandle(url)) {
    throw new Error('Refusing a document request outside configured hosts.');
  }

  const response = await fetch(url, {
    credentials: 'include',
    redirect: 'error',
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  if (!response.ok) {
    throw new Error(`Document request failed with ${response.status}.`);
  }
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !adapter.canHandle(finalUrl)) {
    throw new Error('Document request resolved outside configured hosts.');
  }

  return {
    html: await response.text(),
    lastModified: response.headers.get('last-modified'),
    url: finalUrl.href,
  };
}
