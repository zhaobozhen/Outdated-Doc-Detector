import type { AnalysisResult } from './types';

export function isResultForPage(result: AnalysisResult, pageUrl: string): boolean {
  try {
    return new URL(result.pageUrl).href === new URL(pageUrl).href;
  } catch {
    return false;
  }
}
