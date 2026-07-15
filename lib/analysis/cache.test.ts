import { describe, expect, it } from 'vitest';

import { isResultForPage } from './cache';
import type { AnalysisResult } from './types';

const result: AnalysisResult = {
  kind: 'checking',
  pageUrl: 'https://developer.mozilla.org/zh-CN/docs/Web/API',
  checkedAt: '2026-07-15T00:00:00.000Z',
};

describe('isResultForPage', () => {
  it('only reuses a snapshot for the exact active document URL', () => {
    expect(isResultForPage(result, result.pageUrl)).toBe(true);
    expect(isResultForPage(result, 'https://example.com/')).toBe(false);
    expect(isResultForPage(result, `${result.pageUrl}#history`)).toBe(false);
  });

  it('rejects malformed active URLs', () => {
    expect(isResultForPage(result, '')).toBe(false);
    expect(isResultForPage(result, 'not a URL')).toBe(false);
  });
});
