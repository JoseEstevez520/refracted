/**
 * refracted — TypeScript interfaces for the role-aware markdown parser.
 */

// ── Frontmatter types ─────────────────────────────────────────────────

export interface Fact {
  id: string;
  value?: string | number;
  unit?: string;
  date?: string;
  cost?: number;
  cause?: string;
  valid?: string;
  [key: string]: string | number | undefined;
}

/** Maps role name to array of section tags the role can access */
export type RoleTable = Record<string, string[]>;

export interface DocumentMeta {
  type?: string;
  version?: string;
  created?: string;
  modified?: string;
  roles: RoleTable;
  facts: Fact[];
  /** All other frontmatter keys */
  extra: Record<string, unknown>;
}

// ── Role block types ──────────────────────────────────────────────────

export interface RoleBlock {
  /** Role tags this block is visible to (e.g., ["core", "training"]) */
  roles: string[];
  /** 0-based line index of the opening <!-- @role: X --> comment */
  lineStart: number;
  /** 0-based line index of the closing <!-- @/role --> comment */
  lineEnd: number;
}

// ── Heading tree types ────────────────────────────────────────────────

export interface HeadingNode {
  level: number;
  title: string;
  lineStart: number;
  lineEnd: number;
  tokenEstimate: number;
  children: HeadingNode[];
}

// ── Relation types ────────────────────────────────────────────────────

export interface Relation {
  target: string;
  description: string;
}

// ── Parsed document ───────────────────────────────────────────────────

export interface ParsedDocument {
  meta: DocumentMeta;
  frontmatterRaw: string | null;
  roleBlocks: RoleBlock[];
  relations: Relation[];
  tree: HeadingNode[];
  lines: string[];
  fullText: string;
}
