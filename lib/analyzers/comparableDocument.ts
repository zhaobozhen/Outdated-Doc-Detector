import type {
  ComparableDocument,
  ComparableSection,
  ComparableTable,
} from '../analysis/diffTypes';

const MAX_CODE_BLOCKS = 64;
const MAX_CODE_BYTES = 256 * 1024;
const MAX_ITEMS = 500;
const MAX_SECTIONS = 200;

interface ExtractComparableDocumentOptions {
  document: Document;
  normalizeLink: (href: string) => string | null;
  rootSelector: string;
  stableSectionIds: boolean;
}

function compactText(value: string | null | undefined): string {
  return value?.replace(/\s+/gu, ' ').trim() ?? '';
}

function normalizeCode(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\r\n?/gu, '\n')
    .replace(/\u00a0/gu, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/gu, ''))
    .join('\n')
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function tableShape(table: Element): ComparableTable {
  const rows = [...table.querySelectorAll('tr')];
  return {
    columns: rows.reduce(
      (maximum, row) => Math.max(maximum, row.querySelectorAll('th, td').length),
      0,
    ),
    headerCells: table.querySelectorAll('th').length,
    rows: rows.length,
  };
}

function isIgnored(element: Element): boolean {
  return Boolean(
    element.closest(
      'nav, script, style, template, [hidden], [aria-hidden="true"], .nocontent',
    ),
  );
}

function isTopLevelCodeBlock(element: Element): boolean {
  if (!element.matches('devsite-code, pre')) {
    return false;
  }

  const parentCode = element.parentElement?.closest('devsite-code, pre');
  return !parentCode;
}

export function extractComparableDocument({
  document,
  normalizeLink,
  rootSelector,
  stableSectionIds,
}: ExtractComparableDocumentOptions): ComparableDocument | null {
  const root = document.querySelector(rootSelector);
  if (!root) {
    return null;
  }

  const allElements = [...root.querySelectorAll('*')];
  const elementIndexes = new Map(allElements.map((element, index) => [element, index]));
  const headings = allElements.filter(
    (element) => element.matches('h2, h3') && !isIgnored(element),
  );
  if (headings.length === 0) {
    return null;
  }

  let codeBlocks = 0;
  let codeBytes = 0;
  let inlineCodeCount = 0;
  let linkCount = 0;
  let truncated = headings.length > MAX_SECTIONS;
  const sections: ComparableSection[] = [];

  for (const [order, heading] of headings.slice(0, MAX_SECTIONS).entries()) {
    const start = (elementIndexes.get(heading) ?? -1) + 1;
    const nextHeading = headings[order + 1];
    const end = nextHeading
      ? (elementIndexes.get(nextHeading) ?? allElements.length)
      : allElements.length;
    const elements = allElements.slice(start, end).filter((element) => !isIgnored(element));

    const sectionCode: string[] = [];
    for (const element of elements) {
      if (!isTopLevelCodeBlock(element)) {
        continue;
      }
      if (codeBlocks >= MAX_CODE_BLOCKS || codeBytes >= MAX_CODE_BYTES) {
        truncated = true;
        break;
      }

      const value = normalizeCode(element.textContent);
      if (!value) {
        continue;
      }
      const remaining = MAX_CODE_BYTES - codeBytes;
      const limited = value.slice(0, remaining);
      if (limited.length !== value.length) {
        truncated = true;
      }
      sectionCode.push(limited);
      codeBlocks += 1;
      codeBytes += limited.length;
    }

    const inlineCode = unique(
      elements
        .filter(
          (element) =>
            element.matches('code') && !element.closest('pre, devsite-code'),
        )
        .map((element) => compactText(element.textContent))
        .filter(Boolean),
    );

    const links = unique(
      elements
        .filter((element) => element.matches('a[href]'))
        .map((element) => normalizeLink(element.getAttribute('href') ?? ''))
        .filter((value): value is string => Boolean(value)),
    );

    const remainingInlineCode = Math.max(0, MAX_ITEMS - inlineCodeCount);
    const limitedInlineCode = inlineCode.slice(0, remainingInlineCode);
    inlineCodeCount += limitedInlineCode.length;
    const remainingLinks = Math.max(0, MAX_ITEMS - linkCount);
    const limitedLinks = links.slice(0, remainingLinks);
    linkCount += limitedLinks.length;
    if (limitedInlineCode.length !== inlineCode.length || limitedLinks.length !== links.length) {
      truncated = true;
    }

    const title = compactText(heading.textContent).slice(0, 160);
    sections.push({
      codeBlocks: sectionCode,
      id: heading.id || null,
      inlineCode: limitedInlineCode,
      level: Number(heading.tagName.slice(1)),
      links: limitedLinks,
      order,
      shape: {
        callouts: elements.filter((element) =>
          element.matches('aside, .note, .notecard, devsite-callout'),
        ).length,
        listItems: elements.filter((element) => element.matches('li')).length,
        paragraphs: elements.filter((element) => element.matches('p')).length,
      },
      tables: elements
        .filter(
          (element) => element.matches('table') && !element.parentElement?.closest('table'),
        )
        .map(tableShape),
      title: title || heading.id || `Section ${order + 1}`,
    });
  }

  return { sections, stableSectionIds, truncated };
}
