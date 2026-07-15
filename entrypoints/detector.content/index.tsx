import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';

import { PageNotice } from '../../components/PageNotice';
import { DOCUMENT_MATCHES } from '../../lib/analyzers/sites';
import { analyzePage } from '../../lib/analysis/analyzePage';
import { OUTDATED_PREVIEW_RESULT } from '../../lib/analysis/preview';
import type { AnalysisResult, ComparedResult } from '../../lib/analysis/types';
import { isWarningResult } from '../../lib/analysis/types';
import { sendRuntimeMessage } from '../../lib/messageClient';
import { getSettings } from '../../lib/storage/settings';
import './style.css';

async function publishResult(result: AnalysisResult): Promise<void> {
  await sendRuntimeMessage({ type: 'analysis:publish', result });
}

export default defineContentScript({
  matches: DOCUMENT_MATCHES,
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    let root: ReactDOM.Root | null = null;
    let runId = 0;
    let dismissedUrl: string | null = null;
    let currentResult: AnalysisResult | null = null;

    const ui = await createShadowRootUi(ctx, {
      name: 'outdated-docs-notice',
      position: 'overlay',
      anchor: 'body',
      isolateEvents: true,
      onMount(container) {
        const app = document.createElement('div');
        app.className = 'outdated-docs-host';
        container.append(app);
        root = ReactDOM.createRoot(app);
        return root;
      },
      onRemove(mountedRoot) {
        mountedRoot?.unmount();
        root = null;
      },
    });
    ui.mount();

    const renderNotice = async (result: AnalysisResult | null) => {
      const settings = await getSettings();
      if (
        !root ||
        !result ||
        result.pageUrl !== location.href ||
        !isWarningResult(result) ||
        !settings.showPageNotice
      ) {
        root?.render(null);
        return;
      }
      if (dismissedUrl === result.pageUrl) {
        root.render(null);
        return;
      }

      root.render(
        <PageNotice
          onClose={() => {
            dismissedUrl = result.pageUrl;
            root?.render(null);
          }}
          onOpenEnglish={() => void browser.tabs.create({ url: result.englishUrl })}
          result={result as ComparedResult & { kind: 'behind' | 'outdated' }}
        />,
      );
    };

    const detect = async (): Promise<AnalysisResult> => {
      const thisRun = ++runId;
      const checking: AnalysisResult = {
        kind: 'checking',
        pageUrl: location.href,
        checkedAt: new Date().toISOString(),
      };
      await publishResult(checking);

      if (
        import.meta.env.MODE === 'test' &&
        new URLSearchParams(location.search).has('outdated-docs-preview')
      ) {
        const previewResult: AnalysisResult = {
          ...OUTDATED_PREVIEW_RESULT,
          pageUrl: location.href,
        };
        currentResult = previewResult;
        await publishResult(previewResult);
        await renderNotice(previewResult);
        return previewResult;
      }

      const result = await analyzePage({
        document,
        url: new URL(location.href),
        fetchEnglish: (url, site) => sendRuntimeMessage({ type: 'fetch:english', url, site }),
      });

      if (thisRun !== runId) {
        return result;
      }
      currentResult = result;
      await publishResult(result);
      await renderNotice(result);
      return result;
    };

    const onMessage = (rawMessage: unknown) => {
      if (
        typeof rawMessage === 'object' &&
        rawMessage !== null &&
        'type' in rawMessage &&
        rawMessage.type === 'analysis:run'
      ) {
        return detect();
      }
      return undefined;
    };
    browser.runtime.onMessage.addListener(onMessage);

    const onStorageChanged = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'sync' && changes.showPageNotice) {
        void renderNotice(currentResult);
      }
    };
    browser.storage.onChanged.addListener(onStorageChanged);

    const onLocationChange = () => {
      runId += 1;
      dismissedUrl = null;
      currentResult = null;
      root?.render(null);
      void detect();
    };
    ctx.addEventListener(window, 'wxt:locationchange', onLocationChange);

    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(onMessage);
      browser.storage.onChanged.removeListener(onStorageChanged);
      ui.remove();
    });

    await detect();
  },
});
