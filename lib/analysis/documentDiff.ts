import { diffLines } from 'diff';

import type {
  ComparableDocument,
  ComparableSection,
  DiffConfidence,
  DocumentDiff,
  DocumentDiffChange,
  DocumentEvidenceStats,
  EvidenceDiffChange,
} from './diffTypes';

const MAX_CHANGES = 100;
const MAX_PREVIEW_LINES = 12;
const MAX_PREVIEW_LINE_LENGTH = 180;

interface SectionMatch {
  confidence: DiffConfidence;
  english: ComparableSection;
  localized: ComparableSection;
}

interface MatchCandidate {
  confidence: DiffConfidence;
  score: number;
}

function stats(document: ComparableDocument): DocumentEvidenceStats {
  return {
    codeBlocks: document.sections.reduce(
      (count, section) => count + section.codeBlocks.length,
      0,
    ),
    inlineCode: new Set(document.sections.flatMap((section) => section.inlineCode)).size,
    links: new Set(document.sections.flatMap((section) => section.links)).size,
    sections: document.sections.length,
    tables: document.sections.reduce((count, section) => count + section.tables.length, 0),
  };
}

function setDifference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function jaccard(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((value) => rightSet.has(value)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function countSimilarity(left: number, right: number): number {
  const maximum = Math.max(left, right);
  return maximum === 0 ? 1 : 1 - Math.abs(left - right) / maximum;
}

function shapeSimilarity(left: ComparableSection, right: ComparableSection): number {
  const leftTotal = left.shape.callouts + left.shape.listItems + left.shape.paragraphs;
  const rightTotal = right.shape.callouts + right.shape.listItems + right.shape.paragraphs;
  if (leftTotal === 0 && rightTotal === 0) {
    return 0;
  }

  return (
    countSimilarity(left.shape.callouts, right.shape.callouts) +
    countSimilarity(left.shape.listItems, right.shape.listItems) +
    countSimilarity(left.shape.paragraphs, right.shape.paragraphs)
  ) / 3;
}

function candidate(
  localized: ComparableSection,
  english: ComparableSection,
  localizedCount: number,
  englishCount: number,
): MatchCandidate | null {
  const tokenScore = jaccard(localized.inlineCode, english.inlineCode);
  const linkScore = jaccard(localized.links, english.links);
  const structureScore = shapeSimilarity(localized, english);
  const localizedPosition = localized.order / Math.max(1, localizedCount - 1);
  const englishPosition = english.order / Math.max(1, englishCount - 1);
  const orderScore = 1 - Math.abs(localizedPosition - englishPosition);
  const score = tokenScore * 0.45 + linkScore * 0.3 + structureScore * 0.15 + orderScore * 0.1;
  const evidenceClasses = [tokenScore, linkScore, structureScore].filter(
    (value) => value >= 0.7,
  ).length;

  if (score >= 0.82 && evidenceClasses >= 2) {
    return { confidence: 'high', score };
  }
  if (score >= 0.7 && evidenceClasses >= 1) {
    return { confidence: 'medium', score };
  }
  return null;
}

function matchByStableId(
  localized: ComparableDocument,
  english: ComparableDocument,
): {
  matches: SectionMatch[];
  sectionChanges: DocumentDiffChange[];
} {
  const localizedById = new Map(
    localized.sections.filter((section) => section.id).map((section) => [section.id, section]),
  );
  const englishById = new Map(
    english.sections.filter((section) => section.id).map((section) => [section.id, section]),
  );
  const matches: SectionMatch[] = [];
  const sectionChanges: DocumentDiffChange[] = [];

  for (const section of localized.sections) {
    const matching = section.id ? englishById.get(section.id) : undefined;
    if (matching) {
      matches.push({ confidence: 'high', english: matching, localized: section });
    } else if (section.id) {
      sectionChanges.push({
        confidence: 'high',
        kind: 'section-removed',
        sectionTitle: section.title,
      });
    }
  }

  for (const section of english.sections) {
    if (section.id && !localizedById.has(section.id)) {
      sectionChanges.push({
        confidence: 'high',
        kind: 'section-added',
        sectionTitle: section.title,
      });
    }
  }

  return { matches, sectionChanges };
}

function matchByEvidence(
  localized: ComparableDocument,
  english: ComparableDocument,
): SectionMatch[] {
  const localizedCount = localized.sections.length;
  const englishCount = english.sections.length;
  const candidates = localized.sections.map((localizedSection) =>
    english.sections.map((englishSection) =>
      candidate(localizedSection, englishSection, localizedCount, englishCount),
    ),
  );
  const scores = Array.from({ length: localizedCount + 1 }, () =>
    new Float64Array(englishCount + 1),
  );
  const directions = Array.from({ length: localizedCount + 1 }, () =>
    new Uint8Array(englishCount + 1),
  );

  for (let localizedIndex = 1; localizedIndex <= localizedCount; localizedIndex += 1) {
    for (let englishIndex = 1; englishIndex <= englishCount; englishIndex += 1) {
      const skipLocalized = scores[localizedIndex - 1]![englishIndex]!;
      const skipEnglish = scores[localizedIndex]![englishIndex - 1]!;
      const matching = candidates[localizedIndex - 1]![englishIndex - 1];
      const match = matching
        ? scores[localizedIndex - 1]![englishIndex - 1]! + matching.score
        : -1;

      if (matching && match >= skipLocalized && match >= skipEnglish) {
        scores[localizedIndex]![englishIndex] = match;
        directions[localizedIndex]![englishIndex] = 3;
      } else if (skipLocalized >= skipEnglish) {
        scores[localizedIndex]![englishIndex] = skipLocalized;
        directions[localizedIndex]![englishIndex] = 1;
      } else {
        scores[localizedIndex]![englishIndex] = skipEnglish;
        directions[localizedIndex]![englishIndex] = 2;
      }
    }
  }

  const matches: SectionMatch[] = [];
  let localizedIndex = localizedCount;
  let englishIndex = englishCount;
  while (localizedIndex > 0 && englishIndex > 0) {
    const direction = directions[localizedIndex]![englishIndex];
    if (direction === 3) {
      const matching = candidates[localizedIndex - 1]![englishIndex - 1]!;
      matches.push({
        confidence: matching.confidence,
        english: english.sections[englishIndex - 1]!,
        localized: localized.sections[localizedIndex - 1]!,
      });
      localizedIndex -= 1;
      englishIndex -= 1;
    } else if (direction === 1) {
      localizedIndex -= 1;
    } else {
      englishIndex -= 1;
    }
  }

  return matches.toReversed();
}

function previewLines(value: string): string[] {
  return value
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, MAX_PREVIEW_LINES)
    .map((line) => line.slice(0, MAX_PREVIEW_LINE_LENGTH));
}

function codeChange(match: SectionMatch): EvidenceDiffChange | null {
  const added: string[] = [];
  const removed: string[] = [];
  const count = Math.max(match.localized.codeBlocks.length, match.english.codeBlocks.length);

  for (let index = 0; index < count; index += 1) {
    const localizedCode = match.localized.codeBlocks[index] ?? '';
    const englishCode = match.english.codeBlocks[index] ?? '';
    if (localizedCode === englishCode) {
      continue;
    }

    const changes = diffLines(localizedCode, englishCode, {
      maxEditLength: 2_000,
      stripTrailingCr: true,
      timeout: 20,
    });
    if (!changes) {
      removed.push(...previewLines(localizedCode));
      added.push(...previewLines(englishCode));
      continue;
    }
    for (const change of changes) {
      if (change.added) {
        added.push(...previewLines(change.value));
      } else if (change.removed) {
        removed.push(...previewLines(change.value));
      }
    }
  }

  if (added.length === 0 && removed.length === 0) {
    return null;
  }
  return {
    added: added.slice(0, MAX_PREVIEW_LINES),
    confidence: match.confidence,
    kind: 'code',
    removed: removed.slice(0, MAX_PREVIEW_LINES),
    sectionTitle: match.localized.title,
    truncated: added.length > MAX_PREVIEW_LINES || removed.length > MAX_PREVIEW_LINES,
  };
}

function evidenceChange(
  kind: 'inline-code' | 'links',
  match: SectionMatch,
  localized: string[],
  english: string[],
): EvidenceDiffChange | null {
  const added = setDifference(english, localized);
  const removed = setDifference(localized, english);
  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  return {
    added: added.slice(0, MAX_PREVIEW_LINES),
    confidence: match.confidence,
    kind,
    removed: removed.slice(0, MAX_PREVIEW_LINES),
    sectionTitle: match.localized.title,
    truncated: added.length > MAX_PREVIEW_LINES || removed.length > MAX_PREVIEW_LINES,
  };
}

function changesForMatch(match: SectionMatch): DocumentDiffChange[] {
  const changes: Array<DocumentDiffChange | null> = [
    codeChange(match),
    evidenceChange(
      'inline-code',
      match,
      match.localized.inlineCode,
      match.english.inlineCode,
    ),
    evidenceChange('links', match, match.localized.links, match.english.links),
  ];

  if (JSON.stringify(match.localized.tables) !== JSON.stringify(match.english.tables)) {
    changes.push({
      confidence: match.confidence,
      english: match.english.tables,
      kind: 'tables',
      localized: match.localized.tables,
      sectionTitle: match.localized.title,
    });
  }
  return changes.filter((change): change is DocumentDiffChange => Boolean(change));
}

export function createDocumentDiff(
  localized: ComparableDocument | null,
  english: ComparableDocument | null,
): DocumentDiff | null {
  if (!localized || !english) {
    return null;
  }

  const exact = localized.stableSectionIds && english.stableSectionIds;
  const matched = exact
    ? matchByStableId(localized, english)
    : { matches: matchByEvidence(localized, english), sectionChanges: [] };
  const allChanges = [
    ...matched.sectionChanges,
    ...matched.matches.flatMap(changesForMatch),
  ];
  const unalignedSections = exact
    ? localized.sections.filter((section) => !section.id).length +
      english.sections.filter((section) => !section.id).length
    : localized.sections.length + english.sections.length - matched.matches.length * 2;
  const previewTruncated = allChanges.some(
    (change) => 'truncated' in change && change.truncated,
  );

  return {
    changes: allChanges.slice(0, MAX_CHANGES),
    english: stats(english),
    localized: stats(localized),
    matchedSections: matched.matches.length,
    reliability: exact ? 'exact' : 'partial',
    truncated:
      localized.truncated ||
      english.truncated ||
      previewTruncated ||
      allChanges.length > MAX_CHANGES,
    unalignedSections,
  };
}
