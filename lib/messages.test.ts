import { describe, expect, it } from 'vitest';

import { isExtensionMessage } from './messages';

describe('isExtensionMessage', () => {
  it('rejects incomplete messages at the extension trust boundary', () => {
    expect(isExtensionMessage({ type: 'fetch:english' })).toBe(false);
    expect(
      isExtensionMessage({
        type: 'fetch:english',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API',
      }),
    ).toBe(false);
    expect(isExtensionMessage({ type: 'analysis:get', tabId: -1 })).toBe(false);
    expect(isExtensionMessage({ type: 'analysis:get', tabId: 7 })).toBe(false);
    expect(
      isExtensionMessage({
        type: 'english:open',
        url: 'https://developer.android.com/docs?hl=en',
      }),
    ).toBe(false);
    expect(isExtensionMessage({ type: 'analysis:publish', result: null })).toBe(false);
  });

  it('accepts a complete analysis request', () => {
    expect(
      isExtensionMessage({
        type: 'analysis:get',
        tabId: 7,
        pageUrl: 'https://developer.mozilla.org/zh-CN/docs/Web/API',
      }),
    ).toBe(true);
    expect(
      isExtensionMessage({
        type: 'fetch:english',
        site: 'mdn',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API',
      }),
    ).toBe(true);
    expect(
      isExtensionMessage({
        type: 'english:open',
        site: 'google-devsite',
        url: 'https://developer.android.com/docs?hl=en',
      }),
    ).toBe(true);
    expect(
      isExtensionMessage({
        type: 'analysis:publish',
        result: {
          kind: 'stale',
          site: 'google-devsite',
          pageUrl: 'https://developer.android.com/docs?hl=zh-cn',
          englishUrl: 'https://developer.android.com/docs?hl=en',
          locale: 'zh-CN',
          localizedAt: '2026-01-01T00:00:00.000Z',
          englishAt: '2026-07-01T00:00:00.000Z',
          lagMs: 15_638_400_000,
          lagDays: 181,
          checkedAt: '2026-07-16T00:00:00.000Z',
        },
      }),
    ).toBe(true);
  });
});
