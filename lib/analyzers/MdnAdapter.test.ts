import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { MdnAdapter } from './MdnAdapter';

const fixture = readFileSync('tests/fixtures/mdn-zh.html', 'utf8');

describe('MdnAdapter', () => {
  it('normalizes a localized MDN document into comparable metadata', () => {
    const document = new DOMParser().parseFromString(fixture, 'text/html');

    expect(
      MdnAdapter.inspect(
        document,
        new URL('https://developer.mozilla.org/zh-CN/docs/Web/API/Document'),
      ),
    ).toEqual({
      site: 'mdn',
      pageUrl: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Document',
      englishUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Document',
      locale: 'zh-CN',
      localizedAt: '2026-03-27T09:30:00.000Z',
      isEnglish: false,
    });
  });
});
