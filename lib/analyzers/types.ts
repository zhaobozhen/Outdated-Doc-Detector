import type { SiteId } from './sites';
import type { ComparableDocument } from '../analysis/diffTypes';

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
  inspectComparable(document: Document, url: URL): ComparableDocument | null;
  inspectEnglish(document: Document, lastModified: string | null): EnglishPageMetadata;
}
