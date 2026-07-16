import { useEffect, useId, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileMinus2,
  FilePlus2,
  GitCompareArrows,
  Link2,
  ListTree,
  Minus,
  Plus,
  Table2,
  X,
} from 'lucide-react';

import { FreshnessIcon } from './FreshnessIcon';
import type { DocumentDiff, DocumentDiffChange } from '../lib/analysis/diffTypes';
import {
  lagDurationText,
  freshnessStatusText,
  freshnessSummaryText,
  type WarningKind,
} from '../lib/analysis/presentation';
import type { ComparedResult } from '../lib/analysis/types';
import { formatDate, message } from '../lib/i18n';

interface PageNoticeProps {
  diff: DocumentDiff | null;
  result: ComparedResult & { kind: WarningKind };
  onClose: () => void;
  onOpenEnglish: () => void;
}

function metricValue(localized: number, english: number): string {
  return localized === english ? String(english) : `${localized} → ${english}`;
}

function summarizeTables(tables: Extract<DocumentDiffChange, { kind: 'tables' }>['localized']) {
  return tables.length === 0
    ? '0'
    : tables.map((table) => `${table.rows}×${table.columns}`).join(', ');
}

function tableValue(change: Extract<DocumentDiffChange, { kind: 'tables' }>): string {
  return `${summarizeTables(change.localized)} → ${summarizeTables(change.english)}`;
}

function changeLabel(change: DocumentDiffChange): string {
  switch (change.kind) {
    case 'section-added':
      return message('diffSectionAdded');
    case 'section-removed':
      return message('diffSectionRemoved');
    case 'code':
      return message('diffCodeChanged');
    case 'inline-code':
      return message('diffApiChanged');
    case 'links':
      return message('diffLinksChanged');
    case 'tables':
      return message('diffTablesChanged');
  }
}

function ChangeIcon({ change }: { change: DocumentDiffChange }) {
  const props = { 'aria-hidden': true, size: 16, strokeWidth: 1.9 } as const;
  switch (change.kind) {
    case 'section-added':
      return <FilePlus2 {...props} />;
    case 'section-removed':
      return <FileMinus2 {...props} />;
    case 'code':
      return <Code2 {...props} />;
    case 'inline-code':
      return <ListTree {...props} />;
    case 'links':
      return <Link2 {...props} />;
    case 'tables':
      return <Table2 {...props} />;
  }
}

function ChangeRow({ change }: { change: DocumentDiffChange }) {
  return (
    <article className="page-notice__change">
      <div className="page-notice__change-icon">
        <ChangeIcon change={change} />
      </div>
      <div className="page-notice__change-copy">
        <div>
          <strong>{changeLabel(change)}</strong>
          <span>{change.sectionTitle}</span>
        </div>
        {'added' in change ? (
          <div className="page-notice__change-values">
            {change.added.slice(0, 3).map((value) => (
              <code className="page-notice__change-value page-notice__change-value--added" key={`a-${value}`}>
                <Plus aria-hidden="true" size={11} strokeWidth={2.4} />
                <span>{value}</span>
              </code>
            ))}
            {change.removed.slice(0, 3).map((value) => (
              <code className="page-notice__change-value page-notice__change-value--removed" key={`r-${value}`}>
                <Minus aria-hidden="true" size={11} strokeWidth={2.4} />
                <span>{value}</span>
              </code>
            ))}
          </div>
        ) : change.kind === 'tables' ? (
          <code className="page-notice__table-value">{tableValue(change)}</code>
        ) : null}
      </div>
    </article>
  );
}

function DiffPanel({ diff }: { diff: DocumentDiff }) {
  const sectionCount = Math.max(diff.localized.sections, diff.english.sections);
  const hasChanges = diff.changes.length > 0;
  const method =
    diff.reliability === 'exact'
      ? message('diffExactMethod', [String(diff.matchedSections), String(sectionCount)])
      : message('diffPartialMethod', String(diff.matchedSections));

  return (
    <section aria-label={message('diffTitle')} className="page-notice__diff-panel">
      <header className="page-notice__diff-header">
        <div className="page-notice__diff-mark">
          <GitCompareArrows aria-hidden="true" size={18} strokeWidth={1.9} />
        </div>
        <div>
          <strong>{message('diffTitle')}</strong>
          <span>{method}</span>
        </div>
        <span className="page-notice__diff-badge">
          {message(diff.reliability === 'exact' ? 'diffExactBadge' : 'diffPartialBadge')}
        </span>
      </header>

      <div className="page-notice__diff-layout">
        <div className="page-notice__diff-score">
          <span className="page-notice__diff-number">{diff.changes.length}</span>
          <strong>
            {hasChanges
              ? message('diffChangesTitle', String(diff.changes.length))
              : message('diffNoChangesTitle')}
          </strong>
          <div className="page-notice__metrics">
            <div><span>{message('diffSections')}</span><strong>{metricValue(diff.localized.sections, diff.english.sections)}</strong></div>
            <div><span>{message('diffCodeBlocks')}</span><strong>{metricValue(diff.localized.codeBlocks, diff.english.codeBlocks)}</strong></div>
            <div><span>{message('diffApiTokens')}</span><strong>{metricValue(diff.localized.inlineCode, diff.english.inlineCode)}</strong></div>
            <div><span>{message('diffLinks')}</span><strong>{metricValue(diff.localized.links, diff.english.links)}</strong></div>
          </div>
        </div>

        <div className="page-notice__diff-result">
          {hasChanges ? (
            <>
              <div className="page-notice__diff-result-heading">
                <strong>{message('diffChangesTitle', String(diff.changes.length))}</strong>
                <span>{message('diffChangesBody')}</span>
              </div>
              <div className="page-notice__changes">
                {diff.changes.map((change, index) => (
                  <ChangeRow change={change} key={`${change.kind}-${change.sectionTitle}-${index}`} />
                ))}
              </div>
            </>
          ) : (
            <div className="page-notice__empty">
              <span className="page-notice__empty-icon">
                <Check aria-hidden="true" size={20} strokeWidth={2.2} />
              </span>
              <div>
                <strong>{message('diffNoChangesTitle')}</strong>
                <span>{message('diffNoChangesBody')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="page-notice__diff-caveat">
        {diff.truncated ? message('diffTruncated') : message('diffCaveat')}
      </footer>
    </section>
  );
}

export function PageNotice({ diff, result, onClose, onOpenEnglish }: PageNoticeProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setExpanded(false);
  }, [result.pageUrl]);

  const summary = diff
    ? diff.changes.length === 0
      ? message('diffNoChangesSummary', lagDurationText(result.lagDays))
      : message('diffChangesSummary', [
          lagDurationText(result.lagDays),
          String(diff.changes.length),
        ])
    : freshnessSummaryText(result);

  return (
    <aside
      aria-live="polite"
      className="page-notice"
      data-expanded={expanded}
      data-state={result.kind}
    >
      <div className="page-notice__icon">
        <FreshnessIcon size={26} state={result.kind} strokeWidth={1.9} />
      </div>
      <div className="page-notice__copy">
        <small>Outdated Docs</small>
        <strong>{freshnessStatusText(result.kind)}</strong>
        <span>{summary}</span>
      </div>
      <button
        aria-label={message('close')}
        className="page-notice__close"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={18} strokeWidth={1.9} />
      </button>
      <div
        aria-label={message('timestampComparison')}
        className="page-notice__comparison"
        role="group"
      >
        <div className="page-notice__date">
          <span>{message('localizedVersion')}</span>
          <time dateTime={result.localizedAt}>{formatDate(result.localizedAt)}</time>
        </div>
        <div className="page-notice__lag" aria-hidden="true">
          <span>{lagDurationText(result.lagDays)}</span>
          <ArrowRight size={15} strokeWidth={1.8} />
        </div>
        <div className="page-notice__date page-notice__date--end">
          <span>{message('englishOriginal')}</span>
          <time dateTime={result.englishAt}>{formatDate(result.englishAt)}</time>
        </div>
      </div>
      <div className="page-notice__footer">
        {diff ? (
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            aria-label={expanded ? message('diffCollapse') : message('diffButton')}
            className="page-notice__diff-button"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            <GitCompareArrows aria-hidden="true" size={15} strokeWidth={1.9} />
            {message('diffButton')}
            <ChevronDown aria-hidden="true" className="page-notice__diff-chevron" size={14} strokeWidth={2} />
          </button>
        ) : <span />}
        <button className="page-notice__action" onClick={onOpenEnglish} type="button">
          {message('openEnglish')}
          <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
        </button>
      </div>
      {diff ? (
        <div
          aria-hidden={!expanded}
          className="page-notice__diff-reveal"
          id={panelId}
        >
          <div className="page-notice__diff-clip">
            <DiffPanel diff={diff} />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
