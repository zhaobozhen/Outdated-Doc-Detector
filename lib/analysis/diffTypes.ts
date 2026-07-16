export interface DocumentShape {
  callouts: number;
  listItems: number;
  paragraphs: number;
}

export interface ComparableTable {
  columns: number;
  headerCells: number;
  rows: number;
}

export interface ComparableSection {
  codeBlocks: string[];
  id: string | null;
  inlineCode: string[];
  level: number;
  links: string[];
  order: number;
  shape: DocumentShape;
  tables: ComparableTable[];
  title: string;
}

export interface ComparableDocument {
  sections: ComparableSection[];
  stableSectionIds: boolean;
  truncated: boolean;
}

export interface DocumentEvidenceStats {
  codeBlocks: number;
  inlineCode: number;
  links: number;
  sections: number;
  tables: number;
}

export type DiffConfidence = 'high' | 'medium';

export interface EvidenceDiffChange {
  added: string[];
  confidence: DiffConfidence;
  kind: 'code' | 'inline-code' | 'links';
  removed: string[];
  sectionTitle: string;
  truncated: boolean;
}

export interface SectionDiffChange {
  confidence: 'high';
  kind: 'section-added' | 'section-removed';
  sectionTitle: string;
}

export interface TableDiffChange {
  confidence: DiffConfidence;
  english: ComparableTable[];
  kind: 'tables';
  localized: ComparableTable[];
  sectionTitle: string;
}

export type DocumentDiffChange = EvidenceDiffChange | SectionDiffChange | TableDiffChange;

export interface DocumentDiff {
  changes: DocumentDiffChange[];
  english: DocumentEvidenceStats;
  localized: DocumentEvidenceStats;
  matchedSections: number;
  reliability: 'exact' | 'partial';
  truncated: boolean;
  unalignedSections: number;
}
