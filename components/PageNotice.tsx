import { ChevronRight, X } from 'lucide-react';

import { FreshnessIcon } from './FreshnessIcon';
import {
  freshnessStatusText,
  freshnessSummaryText,
  type WarningKind,
} from '../lib/analysis/presentation';
import type { ComparedResult } from '../lib/analysis/types';
import { message } from '../lib/i18n';

interface PageNoticeProps {
  result: ComparedResult & { kind: WarningKind };
  onClose: () => void;
  onOpenEnglish: () => void;
}

export function PageNotice({ result, onClose, onOpenEnglish }: PageNoticeProps) {
  return (
    <aside aria-live="polite" className="page-notice" data-state={result.kind}>
      <div className="page-notice__icon">
        <FreshnessIcon size={26} state={result.kind} strokeWidth={1.9} />
      </div>
      <div className="page-notice__copy">
        <small>Outdated Docs</small>
        <strong>{freshnessStatusText(result.kind)}</strong>
        <span>{freshnessSummaryText(result)}</span>
      </div>
      <button
        aria-label={message('close')}
        className="page-notice__close"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={18} strokeWidth={1.9} />
      </button>
      <button className="page-notice__action" onClick={onOpenEnglish} type="button">
        {message('openEnglish')}
        <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
      </button>
    </aside>
  );
}
