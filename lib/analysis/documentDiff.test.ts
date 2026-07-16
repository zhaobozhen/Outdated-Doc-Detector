import { describe, expect, it } from 'vitest';

import type { ComparableDocument, ComparableSection } from './diffTypes';
import { createDocumentDiff } from './documentDiff';

function section(overrides: Partial<ComparableSection> = {}): ComparableSection {
  return {
    codeBlocks: ['val stable = true'],
    id: 'stability',
    inlineCode: ['@Stable', 'ImmutableList'],
    level: 2,
    links: ['https://developer.android.com/reference/kotlin/androidx/compose/runtime/Stable'],
    order: 0,
    shape: { callouts: 0, listItems: 2, paragraphs: 3 },
    tables: [],
    title: '稳定性',
    ...overrides,
  };
}

function document(
  sections: ComparableSection[],
  stableSectionIds = true,
): ComparableDocument {
  return { sections, stableSectionIds, truncated: false };
}

describe('createDocumentDiff', () => {
  it('reports aligned translated evidence without diffing prose', () => {
    const localized = document([section()]);
    const english = document([section({ title: 'Stability' })]);

    expect(createDocumentDiff(localized, english)).toMatchObject({
      changes: [],
      matchedSections: 1,
      reliability: 'exact',
      unalignedSections: 0,
    });
  });

  it('reports stable-ID section, code, API token, link, and table evidence', () => {
    const localized = document([
      section({
        codeBlocks: ['val stable = false'],
        inlineCode: ['@Stable'],
        links: ['https://developer.android.com/old'],
        tables: [{ columns: 2, headerCells: 2, rows: 2 }],
      }),
      section({ id: 'localized-only', order: 1, title: '仅译文存在' }),
    ]);
    const english = document([
      section({
        codeBlocks: ['val stable = true'],
        inlineCode: ['@Stable', 'ImmutableList'],
        links: ['https://developer.android.com/new'],
        tables: [{ columns: 3, headerCells: 3, rows: 2 }],
        title: 'Stability',
      }),
      section({ id: 'english-only', order: 1, title: 'English only' }),
    ]);

    const diff = createDocumentDiff(localized, english);
    expect(diff?.changes.map((change) => change.kind)).toEqual([
      'section-removed',
      'section-added',
      'code',
      'inline-code',
      'links',
      'tables',
    ]);
    expect(diff?.changes.find((change) => change.kind === 'code')).toMatchObject({
      added: ['val stable = true'],
      removed: ['val stable = false'],
    });
  });

  it('aligns translated MDN headings by ordered evidence and suppresses uncertain sections', () => {
    const localized = document(
      [
        section({ id: '稳定性', title: '稳定性' }),
        section({
          codeBlocks: [],
          id: '无法确认',
          inlineCode: [],
          links: [],
          order: 1,
          shape: { callouts: 0, listItems: 0, paragraphs: 1 },
          title: '无法确认',
        }),
      ],
      false,
    );
    const english = document(
      [
        section({ codeBlocks: ['val stable = false'], id: 'stability', title: 'Stability' }),
        section({
          codeBlocks: [],
          id: 'unmatched',
          inlineCode: [],
          links: [],
          order: 1,
          shape: { callouts: 0, listItems: 0, paragraphs: 5 },
          title: 'Unmatched',
        }),
      ],
      false,
    );

    const diff = createDocumentDiff(localized, english);
    expect(diff).toMatchObject({
      matchedSections: 1,
      reliability: 'partial',
      unalignedSections: 2,
    });
    expect(diff?.changes).toHaveLength(1);
    expect(diff?.changes[0]).toMatchObject({ kind: 'code', sectionTitle: '稳定性' });
  });
});
