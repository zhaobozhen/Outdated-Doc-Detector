import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CircleCheck,
  ExternalLink,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react';
import { browser } from 'wxt/browser';

import { FreshnessIcon } from '../../components/FreshnessIcon';
import {
  freshnessStatusText,
  freshnessSummaryText,
  lagDurationText,
} from '../../lib/analysis/presentation';
import type { AnalysisResult, ComparedResult } from '../../lib/analysis/types';
import { createPreviewResult } from '../../lib/analysis/preview';
import { formatDate, message } from '../../lib/i18n';
import type { MessageKey } from '../../lib/i18n';
import { sendRuntimeMessage, sendTabMessage } from '../../lib/messageClient';

const initialResult: AnalysisResult = {
  kind: 'checking',
  pageUrl: '',
  checkedAt: new Date().toISOString(),
};

function isCompared(result: AnalysisResult): result is ComparedResult {
  return (
    result.kind === 'current' ||
    result.kind === 'behind' ||
    result.kind === 'outdated' ||
    result.kind === 'stale'
  );
}

function statusText(result: AnalysisResult): string {
  if (isCompared(result)) {
    return freshnessStatusText(result.kind);
  }
  const keys: Record<AnalysisResult['kind'], MessageKey> = {
    checking: 'statusChecking',
    current: 'statusCurrent',
    behind: 'statusBehind',
    outdated: 'statusOutdated',
    stale: 'statusStale',
    unknown: 'statusUnknown',
    error: 'statusUnknown',
    english: 'statusEnglish',
    unsupported: 'statusUnsupported',
  };
  return message(keys[result.kind]);
}

function summaryText(result: AnalysisResult): string {
  if (isCompared(result)) {
    return freshnessSummaryText(result);
  }
  const keys: Partial<Record<AnalysisResult['kind'], MessageKey>> = {
    checking: 'checkingSummary',
    unknown: 'unknownSummary',
    error: 'networkSummary',
    english: 'englishSummary',
    unsupported: 'unsupportedSummary',
  };
  return message(keys[result.kind] ?? 'unknownSummary');
}

export default function App() {
  const [result, setResult] = useState<AnalysisResult>(initialResult);
  const [tabId, setTabId] = useState<number | null>(null);

  const detect = useCallback(async () => {
    const previewKind = new URLSearchParams(location.search).get('preview');
    if (import.meta.env.MODE === 'test' && previewKind !== null) {
      setResult(createPreviewResult(previewKind));
      return;
    }

    setResult(initialResult);
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) {
      setResult({ kind: 'unsupported', pageUrl: '', checkedAt: new Date().toISOString() });
      return;
    }
    setTabId(tab.id);

    const stored = await sendRuntimeMessage({
      type: 'analysis:get',
      tabId: tab.id,
      pageUrl: tab.url ?? '',
    });
    if (stored && stored.kind !== 'checking') {
      setResult(stored);
      return;
    }

    try {
      const detected = await sendTabMessage(tab.id, { type: 'analysis:run' });
      setResult(detected);
    } catch {
      setResult({
        kind: 'unsupported',
        pageUrl: tab.url ?? '',
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  const openEnglish = async () => {
    if ('englishUrl' in result && result.englishUrl) {
      await browser.tabs.create({ url: result.englishUrl });
    }
  };

  const retry = async () => {
    if (tabId === null) {
      await detect();
      return;
    }
    setResult(initialResult);
    try {
      setResult(await sendTabMessage(tabId, { type: 'analysis:run' }));
    } catch {
      await detect();
    }
  };

  const visualState = isCompared(result) ? result.kind : 'neutral';
  const hostname = result.pageUrl ? new URL(result.pageUrl).hostname : null;

  return (
    <main className="popup-shell" data-state={result.kind}>
      <header className="popup-header">
        <div className="brand">
          <span aria-hidden="true" className="brand-mark">
            <FreshnessIcon size={24} strokeWidth={1.8} />
          </span>
          <span>Outdated Docs</span>
        </div>
        <button
          aria-label={message('settings')}
          className="icon-button"
          onClick={() => void browser.runtime.openOptionsPage()}
          type="button"
        >
          <SettingsIcon aria-hidden="true" size={20} strokeWidth={1.8} />
          <span>{message('settings')}</span>
        </button>
      </header>

      <section aria-live="polite" className="status-block">
        <div aria-hidden="true" className="status-icon">
          <FreshnessIcon size={34} state={visualState} strokeWidth={1.9} />
        </div>
        <div className="status-copy">
          <h1>{statusText(result)}</h1>
          <p>{summaryText(result)}</p>
        </div>
      </section>

      {isCompared(result) && (
        <section aria-label={message('timestampComparison')} className="timeline">
          <div className="timeline-header">
            <span>{message('timestampComparison')}</span>
            <strong>{lagDurationText(result.lagDays)}</strong>
          </div>
          <div className="timeline-dates">
            <div className="date-column">
              <span>{message('localizedVersion')}</span>
              <time dateTime={result.localizedAt}>{formatDate(result.localizedAt)}</time>
            </div>
            <ArrowRight aria-hidden="true" className="timeline-arrow" size={18} strokeWidth={1.8} />
            <div className="date-column date-column--end">
              <span>{message('englishOriginal')}</span>
              <time dateTime={result.englishAt}>{formatDate(result.englishAt)}</time>
            </div>
          </div>
        </section>
      )}

      <div className="actions">
        {'englishUrl' in result && result.englishUrl && result.kind !== 'english' && (
          <button className="button button--primary" onClick={() => void openEnglish()} type="button">
            <ExternalLink aria-hidden="true" size={18} strokeWidth={1.9} />
            {message('openEnglish')}
          </button>
        )}
        <button
          className="button button--secondary"
          disabled={result.kind === 'checking'}
          onClick={() => void retry()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} strokeWidth={1.9} />
          {message('retry')}
        </button>
      </div>

      {hostname && (
        <footer className="popup-footer">
          <span>{hostname}</span>
          {isCompared(result) && <span className="verified"><CircleCheck aria-hidden="true" size={15} strokeWidth={1.8} /> {message('verified')}</span>}
        </footer>
      )}
    </main>
  );
}
