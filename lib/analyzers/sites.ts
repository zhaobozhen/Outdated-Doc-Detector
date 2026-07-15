export const MDN_HOST = 'developer.mozilla.org';

export const GOOGLE_DEVSITE_HOSTS = [
  'developer.android.com',
  'developers.google.com',
  'firebase.google.com',
  'www.tensorflow.org',
  'source.android.com',
  'cloud.google.com',
  'docs.cloud.google.com',
] as const;

export const SITE_DESCRIPTORS = [
  { id: 'mdn', hosts: [MDN_HOST] },
  { id: 'google-devsite', hosts: GOOGLE_DEVSITE_HOSTS },
] as const;

export type SiteId = (typeof SITE_DESCRIPTORS)[number]['id'];

export const SITE_IDS = SITE_DESCRIPTORS.map((site) => site.id);
export const DOCUMENT_HOSTS = SITE_DESCRIPTORS.flatMap((site) => site.hosts);
export const DOCUMENT_MATCHES = DOCUMENT_HOSTS.map((host) => `https://${host}/*`);

export function isSiteId(value: unknown): value is SiteId {
  return typeof value === 'string' && SITE_IDS.some((site) => site === value);
}
