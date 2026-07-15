import { GoogleDevsiteAdapter } from './GoogleDevsiteAdapter';
import { MdnAdapter } from './MdnAdapter';
import type { SiteAdapter } from './types';
import type { SiteId } from './sites';

export const SITE_ADAPTERS: readonly SiteAdapter[] = [MdnAdapter, GoogleDevsiteAdapter];

export function findAdapter(url: URL): SiteAdapter | null {
  return SITE_ADAPTERS.find((adapter) => adapter.canHandle(url)) ?? null;
}

export function findAdapterById(site: SiteId): SiteAdapter | null {
  return SITE_ADAPTERS.find((adapter) => adapter.id === site) ?? null;
}
