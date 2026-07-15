import { DocumentClockIcon } from './DocumentClockIcon';
import type { ComparedResult } from '../lib/analysis/types';
import { message } from '../lib/i18n';

interface PageNoticeProps {
  result: ComparedResult & { kind: 'behind' | 'outdated' };
  onClose: () => void;
  onOpenEnglish: () => void;
}

export function PageNotice({ result, onClose, onOpenEnglish }: PageNoticeProps) {
  return (
    <aside aria-live="polite" className="page-notice" data-state={result.kind}>
      <div className="page-notice__icon">
        <DocumentClockIcon size={34} state={result.kind} />
      </div>
      <div className="page-notice__copy">
        <strong>{message(result.kind === 'outdated' ? 'statusOutdated' : 'statusBehind')}</strong>
        <span>
          {result.lagDays === 0
            ? message('lagUnderDaySummary')
            : message('lagSummary', String(result.lagDays))}
        </span>
        <small>Outdated Docs</small>
      </div>
      <button
        aria-label={message('close')}
        className="page-notice__close"
        onClick={onClose}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
          <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </button>
      <button className="page-notice__action" onClick={onOpenEnglish} type="button">
        {message('openEnglish')}
        <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
          <path d="m6 3 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      </button>
    </aside>
  );
}
