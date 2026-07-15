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
  });
});
