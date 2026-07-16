import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { GoogleDevsiteAdapter } from './GoogleDevsiteAdapter';
import { GOOGLE_DEVSITE_HOSTS } from './sites';

const fixture = readFileSync('tests/fixtures/firebase-zh.html', 'utf8');

describe('GoogleDevsiteAdapter', () => {
  it('normalizes a localized DevSite footer and forces the declared original to English', () => {
    const document = new DOMParser().parseFromString(fixture, 'text/html');

    expect(
      GoogleDevsiteAdapter.inspect(
        document,
        new URL('https://firebase.google.com/docs/cloud-messaging?hl=zh-cn'),
      ),
    ).toEqual({
      site: 'google-devsite',
      pageUrl: 'https://firebase.google.com/docs/cloud-messaging?hl=zh-cn',
      englishUrl: 'https://firebase.google.com/docs/cloud-messaging?hl=en',
      locale: 'zh-CN',
      localizedAt: '2026-03-27T00:00:00.000Z',
      isEnglish: false,
    });
  });

  it.each([
    'developer.android.com',
    'developers.google.com',
    'firebase.google.com',
    'www.tensorflow.org',
    'source.android.com',
    'cloud.google.com',
    'docs.cloud.google.com',
  ])('recognizes %s as a configured DevSite host', (hostname) => {
    expect(GoogleDevsiteAdapter.canHandle(new URL(`https://${hostname}/docs`))).toBe(true);
  });

  it.each(GOOGLE_DEVSITE_HOSTS)('forces the English locale for %s', (hostname) => {
    const document = new DOMParser().parseFromString(
      `<html lang="zh-CN"><head><link rel="alternate" hreflang="en" href="https://${hostname}/docs"></head><body><devsite-content-footer>最后更新时间 (UTC)：2026-03-27。</devsite-content-footer></body></html>`,
      'text/html',
    );

    expect(
      GoogleDevsiteAdapter.inspect(document, new URL(`https://${hostname}/docs?hl=zh-cn`))
        .englishUrl,
    ).toBe(`https://${hostname}/docs?hl=en`);
  });

  it('uses a reliable HTTP Last-Modified value only when the English footer is missing', () => {
    const document = new DOMParser().parseFromString('<html lang="en"><body></body></html>', 'text/html');

    expect(
      GoogleDevsiteAdapter.inspectEnglish(document, 'Tue, 14 Jul 2026 08:00:00 GMT'),
    ).toEqual({ englishAt: '2026-07-14T08:00:00.000Z' });
  });

  it('rejects a localized response negotiated from an English alternate URL', () => {
    const document = new DOMParser().parseFromString(fixture, 'text/html');

    expect(
      GoogleDevsiteAdapter.inspectEnglish(document, 'Fri, 27 Mar 2026 08:00:00 GMT'),
    ).toEqual({ englishAt: null });
  });
});
