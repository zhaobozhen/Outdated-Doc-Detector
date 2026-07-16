import { browser } from 'wxt/browser';

import { findAdapterById } from '../lib/analyzers';
import type { SiteId } from '../lib/analyzers/sites';
import { isResultForPage } from '../lib/analysis/cache';
import { isFreshnessKind, type FreshnessKind } from '../lib/analysis/classify';
import { freshnessStatusKey } from '../lib/analysis/presentation';
import type { AnalysisResult } from '../lib/analysis/types';
import { fetchEnglishPage } from '../lib/fetchEnglishPage';
import { message } from '../lib/i18n';
import { isExtensionMessage } from '../lib/messages';

const resultKey = (tabId: number): string => `analysis:${tabId}`;

function iconPaths(state: 'default' | FreshnessKind): Record<number, string> {
  const prefix = state === 'default' ? 'icon' : `icon-${state}`;
  return {
    16: `/icons/${prefix}-16.png`,
    32: `/icons/${prefix}-32.png`,
  };
}

async function updateAction(tabId: number, result: AnalysisResult): Promise<void> {
  const state = isFreshnessKind(result.kind) ? result.kind : 'default';
  const titleKey = isFreshnessKind(result.kind)
    ? freshnessStatusKey(result.kind)
    : result.kind === 'checking'
      ? 'statusChecking'
      : 'statusUnknown';

  await Promise.all([
    browser.action.setIcon({ tabId, path: iconPaths(state) }),
    browser.action.setTitle({ tabId, title: message(titleKey) }),
  ]);
}

async function resetAction(tabId: number): Promise<void> {
  try {
    await Promise.all([
      browser.action.setIcon({ tabId, path: iconPaths('default') }),
      browser.action.setTitle({ tabId, title: message('extensionName') }),
    ]);
  } catch {
    // The tab may have closed while asynchronous cleanup was in flight.
  }
}

async function publishResult(tabId: number, result: AnalysisResult): Promise<void> {
  await browser.storage.session.set({ [resultKey(tabId)]: result });
  await updateAction(tabId, result);
}

async function clearResult(tabId: number): Promise<void> {
  await browser.storage.session.remove(resultKey(tabId));
  await resetAction(tabId);
}

async function getResult(tabId: number, pageUrl: string): Promise<AnalysisResult | null> {
  const stored = await browser.storage.session.get(resultKey(tabId));
  const result = stored[resultKey(tabId)];
  if (!result || typeof result !== 'object') {
    return null;
  }

  const analysisResult = result as AnalysisResult;
  if (!isResultForPage(analysisResult, pageUrl)) {
    await clearResult(tabId);
    return null;
  }
  return analysisResult;
}

async function openEnglishPage(value: string, site: SiteId): Promise<void> {
  const url = new URL(value);
  const adapter = findAdapterById(site);
  if (url.protocol !== 'https:' || !adapter?.canHandle(url)) {
    throw new Error('Refusing to open a document outside configured hosts.');
  }
  if (site === 'google-devsite') {
    url.searchParams.set('hl', 'en');
  }
  await browser.tabs.create({ url: url.href });
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void browser.storage.sync.get('showPageNotice').then((stored) => {
      if (typeof stored.showPageNotice !== 'boolean') {
        return browser.storage.sync.set({ showPageNotice: true });
      }
    });
  });

  browser.runtime.onMessage.addListener((rawMessage, sender) => {
    if (!isExtensionMessage(rawMessage)) {
      return undefined;
    }

    if (rawMessage.type === 'fetch:english') {
      return fetchEnglishPage(rawMessage.url, rawMessage.site);
    }
    if (rawMessage.type === 'analysis:publish' && sender.tab?.id !== undefined) {
      return publishResult(sender.tab.id, rawMessage.result);
    }
    if (rawMessage.type === 'analysis:get') {
      return getResult(rawMessage.tabId, rawMessage.pageUrl);
    }
    if (rawMessage.type === 'english:open') {
      return openEnglishPage(rawMessage.url, rawMessage.site);
    }

    return undefined;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    void browser.storage.session.remove(resultKey(tabId));
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading' || changeInfo.url !== undefined) {
      void clearResult(tabId);
    }
  });
});
