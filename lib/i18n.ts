import { browser } from 'wxt/browser';

export type MessageKey =
  | 'extensionName'
  | 'extensionDescription'
  | 'openPopupCommand'
  | 'settings'
  | 'statusChecking'
  | 'statusCurrent'
  | 'statusBehind'
  | 'statusOutdated'
  | 'statusUnknown'
  | 'statusEnglish'
  | 'statusUnsupported'
  | 'lagSummary'
  | 'lagUnderDaySummary'
  | 'daysUnit'
  | 'underOneDay'
  | 'currentSummary'
  | 'checkingSummary'
  | 'unknownSummary'
  | 'networkSummary'
  | 'englishSummary'
  | 'unsupportedSummary'
  | 'localizedVersion'
  | 'englishOriginal'
  | 'timestampComparison'
  | 'openEnglish'
  | 'retry'
  | 'verified'
  | 'close'
  | 'optionsTitle'
  | 'optionsDescription'
  | 'showPageNotice'
  | 'showPageNoticeHelp'
  | 'privacyTitle'
  | 'privacyCopy'
  | 'autoSaved'
  | 'saved';

export function message(key: MessageKey, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions) || key;
}

export function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
