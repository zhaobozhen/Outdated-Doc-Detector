import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { analyzePage } from './analyzePage';
import type { DocumentDiff } from './diffTypes';

const localizedHtml = readFileSync('tests/fixtures/firebase-zh.html', 'utf8');
const englishHtml = readFileSync('tests/fixtures/firebase-en.html', 'utf8');

describe('analyzePage', () => {
  it('returns unsupported without making a network request outside configured sites', async () => {
    const document = new DOMParser().parseFromString('<html lang="zh-CN"></html>', 'text/html');
    let requested = false;

    const result = await analyzePage({
      document,
      url: new URL('https://example.com/docs'),
      fetchEnglish: async () => {
        requested = true;
        throw new Error('must not fetch');
      },
      now: new Date('2026-07-15T00:00:00.000Z'),
    });

    expect(requested).toBe(false);
    expect(result).toEqual({
      kind: 'unsupported',
      pageUrl: 'https://example.com/docs',
      checkedAt: '2026-07-15T00:00:00.000Z',
    });
  });

  it('recognizes an English original without fetching it again', async () => {
    const document = new DOMParser().parseFromString(englishHtml, 'text/html');
    let requested = false;

    const result = await analyzePage({
      document,
      url: new URL('https://firebase.google.com/docs/cloud-messaging'),
      fetchEnglish: async () => {
        requested = true;
        throw new Error('must not fetch');
      },
      now: new Date('2026-07-15T00:00:00.000Z'),
    });

    expect(requested).toBe(false);
    expect(result).toEqual({
      kind: 'english',
      site: 'google-devsite',
      pageUrl: 'https://firebase.google.com/docs/cloud-messaging',
      englishUrl: 'https://firebase.google.com/docs/cloud-messaging',
      locale: 'en',
      checkedAt: '2026-07-15T00:00:00.000Z',
    });
  });

  it('reports the verified Firebase example as 105 days severely outdated', async () => {
    const document = new DOMParser().parseFromString(localizedHtml, 'text/html');
    let requestedSite: string | null = null;
    let documentDiff: DocumentDiff | null = null;

    await expect(
      analyzePage({
        document,
        url: new URL('https://firebase.google.com/docs/cloud-messaging?hl=zh-cn'),
        fetchEnglish: async (_url, site) => {
          requestedSite = site;
          return {
            html: englishHtml,
            lastModified: null,
            url: 'https://firebase.google.com/docs/cloud-messaging',
          };
        },
        now: new Date('2026-07-15T00:00:00.000Z'),
        onDocumentDiff: (diff) => {
          documentDiff = diff;
        },
      }),
    ).resolves.toEqual({
      kind: 'stale',
      site: 'google-devsite',
      pageUrl: 'https://firebase.google.com/docs/cloud-messaging?hl=zh-cn',
      englishUrl: 'https://firebase.google.com/docs/cloud-messaging',
      locale: 'zh-CN',
      localizedAt: '2026-03-27T00:00:00.000Z',
      englishAt: '2026-07-10T00:00:00.000Z',
      lagMs: 9_072_000_000,
      lagDays: 105,
      checkedAt: '2026-07-15T00:00:00.000Z',
    });
    expect(requestedSite).toBe('google-devsite');
    expect(documentDiff).toMatchObject({
      changes: [],
      english: { codeBlocks: 1, inlineCode: 2, links: 1, sections: 2 },
      localized: { codeBlocks: 1, inlineCode: 2, links: 1, sections: 2 },
      matchedSections: 2,
      reliability: 'exact',
    });
  });

  it('returns a retryable error instead of an outdated warning when the network fails', async () => {
    const document = new DOMParser().parseFromString(localizedHtml, 'text/html');

    const result = await analyzePage({
      document,
      url: new URL('https://firebase.google.com/docs/cloud-messaging?hl=zh-cn'),
      fetchEnglish: async () => Promise.reject(new Error('offline')),
      now: new Date('2026-07-15T00:00:00.000Z'),
    });

    expect(result).toMatchObject({ kind: 'error', reason: 'network' });
  });

  it('does not request English when the localized date is unreliable', async () => {
    const document = new DOMParser().parseFromString(
      localizedHtml.replace('最后更新时间 (UTC)：2026-03-27。', '更新时间不可用'),
      'text/html',
    );
    let requested = false;

    const result = await analyzePage({
      document,
      url: new URL('https://firebase.google.com/docs/cloud-messaging?hl=zh-cn'),
      fetchEnglish: async () => {
        requested = true;
        return {
          html: englishHtml,
          lastModified: null,
          url: 'https://firebase.google.com/docs/cloud-messaging',
        };
      },
    });

    expect(requested).toBe(false);
    expect(result).toMatchObject({ kind: 'unknown', reason: 'missing-localized-date' });
  });
});
