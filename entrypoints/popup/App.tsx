import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { DocumentClockIcon } from '../../components/DocumentClockIcon';
import type { AnalysisResult, ComparedResult } from '../../lib/analysis/types';
import { OUTDATED_PREVIEW_RESULT } from '../../lib/analysis/preview';
import { formatDate, message } from '../../lib/i18n';
import type { MessageKey } from '../../lib/i18n';
import { sendRuntimeMessage, sendTabMessage } from '../../lib/messageClient';

const initialResult: AnalysisResult = {
  kind: 'checking',
  pageUrl: '',
  checkedAt: new Date().toISOString(),
};

function isCompared(result: AnalysisResult): result is ComparedResult {
  return result.kind === 'current' || result.kind === 'behind' || result.kind === 'outdated';
}

function statusText(result: AnalysisResult): string {
  const keys: Record<AnalysisResult['kind'], MessageKey> = {
    checking: 'statusChecking',
    current: 'statusCurrent',
    behind: 'statusBehind',
    outdated: 'statusOutdated',
    unknown: 'statusUnknown',
    error: 'statusUnknown',
    english: 'statusEnglish',
    unsupported: 'statusUnsupported',
  };
  return message(keys[result.kind]);
}

function summaryText(result: AnalysisResult): string {
  if (result.kind === 'behind' || result.kind === 'outdated') {
    if (result.lagDays === 0) {
      return message('lagUnderDaySummary');
    }
    return message('lagSummary', String(result.lagDays));
  }
  const keys: Partial<Record<AnalysisResult['kind'], MessageKey>> = {
    checking: 'checkingSummary',
    current: 'currentSummary',
    unknown: 'unknownSummary',
    error: 'networkSummary',
    english: 'englishSummary',
    unsupported: 'unsupportedSummary',
  };
  return message(keys[result.kind] ?? 'unknownSummary');
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-.13-1.1 2-1.55-2-3.46-2.47 1a8.8 8.8 0 0 0-1.9-1.1L15.12 3h-4l-.4 2.8c-.67.27-1.3.64-1.88 1.08L6.32 5.9l-2 3.46 2.05 1.57A8.4 8.4 0 0 0 6.25 12c0 .37.03.73.1 1.08l-2.03 1.57 2 3.46 2.52-1c.58.45 1.2.81 1.88 1.08l.4 2.81h4l.4-2.8a8.8 8.8 0 0 0 1.88-1.1l2.48 1.01 2-3.46-2-1.55c.08-.36.12-.73.12-1.1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path d="M11 4h5v5M16 4l-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path d="M16 7V3m0 0h-4m4 0-2.2 2.2A6 6 0 1 0 16 11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 16 16" width="15">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
      <path d="m5 8 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

export default function App() {
  const [result, setResult] = useState<AnalysisResult>(initialResult);
  const [tabId, setTabId] = useState<number | null>(null);

  const detect = useCallback(async () => {
    if (import.meta.env.MODE === 'test' && new URLSearchParams(location.search).has('preview')) {
      setResult(OUTDATED_PREVIEW_RESULT);
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
          <DocumentClockIcon size={28} />
          <span>Outdated Docs</span>
        </div>
        <button
          aria-label={message('settings')}
          className="icon-button"
          onClick={() => void browser.runtime.openOptionsPage()}
          type="button"
        >
          <SettingsIcon />
          <span>{message('settings')}</span>
        </button>
      </header>

      <section aria-live="polite" className="status-block">
        <div className="status-icon">
          <DocumentClockIcon size={58} state={visualState} />
        </div>
        <div>
          <h1>{statusText(result)}</h1>
          <p>{summaryText(result)}</p>
        </div>
      </section>

      {isCompared(result) && (
        <section aria-label={message('timestampComparison')} className="timeline">
          <div className="date-column">
            <span>{message('localizedVersion')}</span>
            <strong>{formatDate(result.localizedAt)}</strong>
          </div>
          <div className="lag-marker">
            {result.lagDays === 0
              ? message('underOneDay')
              : `${result.lagDays} ${message('daysUnit')}`}
          </div>
          <div className="date-column date-column--end">
            <span>{message('englishOriginal')}</span>
            <strong>{formatDate(result.englishAt)}</strong>
          </div>
          <div className="timeline-line" aria-hidden="true"><i /><i /></div>
        </section>
      )}

      <div className="actions">
        {'englishUrl' in result && result.englishUrl && result.kind !== 'english' && (
          <button className="button button--primary" onClick={() => void openEnglish()} type="button">
            <OpenIcon />
            {message('openEnglish')}
          </button>
        )}
        <button
          className="button button--secondary"
          disabled={result.kind === 'checking'}
          onClick={() => void retry()}
          type="button"
        >
          <RefreshIcon />
          {message('retry')}
        </button>
      </div>

      {hostname && (
        <footer>
          <span>{hostname}</span>
          {isCompared(result) && <span className="verified"><CheckIcon /> {message('verified')}</span>}
        </footer>
      )}
    </main>
  );
}
