import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { GoogleDevsiteAdapter } from './GoogleDevsiteAdapter';

const fixture = readFileSync('tests/fixtures/firebase-zh.html', 'utf8');

describe('GoogleDevsiteAdapter', () => {
  it('normalizes a localized DevSite footer across supported Google hosts', () => {
    const document = new DOMParser().parseFromString(fixture, 'text/html');

    expect(
      GoogleDevsiteAdapter.inspect(
        document,
        new URL('https://firebase.google.com/docs/cloud-messaging?hl=zh-cn'),
      ),
    ).toEqual({
      site: 'google-devsite',
      pageUrl: 'https://firebase.google.com/docs/cloud-messaging?hl=zh-cn',
      englishUrl: 'https://firebase.google.com/docs/cloud-messaging',
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

  it('uses a reliable HTTP Last-Modified value only when the English footer is missing', () => {
    const document = new DOMParser().parseFromString('<html lang="en"><body></body></html>', 'text/html');

    expect(
      GoogleDevsiteAdapter.inspectEnglish(document, 'Tue, 14 Jul 2026 08:00:00 GMT'),
    ).toEqual({ englishAt: '2026-07-14T08:00:00.000Z' });
  });
});
