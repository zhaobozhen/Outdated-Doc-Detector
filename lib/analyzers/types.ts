import type { SiteId } from './sites';

export type { SiteId } from './sites';

export interface PageMetadata {
  site: SiteId;
  pageUrl: string;
  englishUrl: string | null;
  locale: string;
  localizedAt: string | null;
  isEnglish: boolean;
}

export interface EnglishPageMetadata {
  englishAt: string | null;
}

export interface SiteAdapter {
  id: SiteId;
  canHandle(url: URL): boolean;
  inspect(document: Document, url: URL): PageMetadata;
  inspectEnglish(document: Document, lastModified: string | null): EnglishPageMetadata;
}
