/**
 * refracted — core parsing functions.
 *
 * Pure deterministic parsing: regex + YAML, no LLM, no external deps beyond yaml.
 * Extracts frontmatter (meta, facts, roles), role blocks, relations, and heading tree.
 */

import { parse as parseYaml } from 'yaml';
import type {
  ParsedDocument,
  DocumentMeta,
  Fact,
  RoleTable,
  RoleBlock,
  Relation,
  HeadingNode,
} from './types.js';

// ── Token estimation ──────────────────────────────────────────────────

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Frontmatter extraction ────────────────────────────────────────────

function extractFrontmatter(lines: string[]): {
  meta: DocumentMeta;
  frontmatterRaw: string | null;
  contentStartLine: number;
} {
  const emptyMeta: DocumentMeta = {
    roles: {},
    facts: [],
    extra: {},
  };

  if (lines.length === 0 || lines[0].trim() !== '---') {
    return { meta: emptyMeta, frontmatterRaw: null, contentStartLine: 0 };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { meta: emptyMeta, frontmatterRaw: null, contentStartLine: 0 };
  }

  const raw = lines.slice(1, endIdx).join('\n');

  let parsed: Record<string, unknown>;
  try {
    parsed = parseYaml(raw) as Record<string, unknown>;
  } catch {
    // Malformed YAML — treat as no frontmatter
    return { meta: emptyMeta, frontmatterRaw: raw, contentStartLine: endIdx + 1 };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { meta: emptyMeta, frontmatterRaw: raw, contentStartLine: endIdx + 1 };
  }

  // Extract known fields
  const meta: DocumentMeta = {
    type: typeof parsed.type === 'string' ? parsed.type : undefined,
    version: parsed.version != null ? String(parsed.version) : undefined,
    created: parsed.created != null ? String(parsed.created) : undefined,
    modified: parsed.modified != null ? String(parsed.modified) : undefined,
    roles: extractRoles(parsed.roles),
    facts: extractFacts(parsed.facts ?? parsed.hechos),
    extra: {},
  };

  // Collect extra keys
  const knownKeys = new Set(['type', 'version', 'created', 'modified', 'roles', 'facts', 'hechos']);
  for (const [key, value] of Object.entries(parsed)) {
    if (!knownKeys.has(key)) {
      meta.extra[key] = value;
    }
  }

  return { meta, frontmatterRaw: raw, contentStartLine: endIdx + 1 };
}

function extractRoles(raw: unknown): RoleTable {
  if (!raw || typeof raw !== 'object') return {};

  const roles: RoleTable = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      roles[key] = value.map(String);
    } else if (typeof value === 'string') {
      // Support comma-separated string: "core, training"
      roles[key] = value.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return roles;
}

function extractFacts(raw: unknown): Fact[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map(item => {
      const fact: Fact = { id: String(item.id ?? '') };
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'id' && value !== undefined) {
          fact[key] = typeof value === 'number' ? value : String(value);
        }
      }
      return fact;
    })
    .filter(f => f.id !== '');
}

// ── Role block detection ──────────────────────────────────────────────

/**
 * Matches: <!-- @role: core training audit -->
 * Captures the role list as a single string.
 */
const ROLE_OPEN_RE = /^<!--\s*@role:\s*(.+?)\s*-->$/;

/**
 * Matches: <!-- @/role -->
 */
const ROLE_CLOSE_RE = /^<!--\s*@\/role\s*-->$/;

function extractRoleBlocks(lines: string[], startLine: number): RoleBlock[] {
  const blocks: RoleBlock[] = [];
  let currentBlock: { roles: string[]; lineStart: number } | null = null;

  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!currentBlock) {
      const openMatch = trimmed.match(ROLE_OPEN_RE);
      if (openMatch) {
        const roles = openMatch[1].split(/\s+/).filter(Boolean);
        currentBlock = { roles, lineStart: i };
      }
    } else {
      if (ROLE_CLOSE_RE.test(trimmed)) {
        blocks.push({
          roles: currentBlock.roles,
          lineStart: currentBlock.lineStart,
          lineEnd: i,
        });
        currentBlock = null;
      }
    }
  }

  // If a block was never closed, close it at EOF
  if (currentBlock) {
    blocks.push({
      roles: currentBlock.roles,
      lineStart: currentBlock.lineStart,
      lineEnd: lines.length - 1,
    });
  }

  return blocks;
}

// ── Relation extraction ───────────────────────────────────────────────

/**
 * Matches: [rel:target_name]: # "description text"
 */
const RELATION_RE = /^\[rel:([^\]]+)\]:\s*#\s*"([^"]+)"/;

function extractRelations(lines: string[]): Relation[] {
  const relations: Relation[] = [];

  for (const line of lines) {
    const match = line.match(RELATION_RE);
    if (match) {
      relations.push({
        target: match[1].trim(),
        description: match[2].trim(),
      });
    }
  }

  return relations;
}

// ── Heading tree ──────────────────────────────────────────────────────

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

interface RawHeading {
  level: number;
  title: string;
  lineIndex: number;
}

function findHeadings(lines: string[], startLine: number): RawHeading[] {
  const headings: RawHeading[] = [];
  let inCodeBlock = false;

  for (let i = startLine; i < lines.length; i++) {
    const trimmedStart = lines[i].trimStart();

    // Track fenced code blocks
    if (trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    const m = lines[i].match(HEADING_RE);
    if (m) {
      headings.push({
        level: m[1].length,
        title: m[2].trim(),
        lineIndex: i,
      });
    }
  }

  return headings;
}

function buildTree(headings: RawHeading[], lines: string[]): HeadingNode[] {
  if (headings.length === 0) return [];

  const nodes: HeadingNode[] = headings.map((h, i) => {
    const lineEnd = i < headings.length - 1
      ? headings[i + 1].lineIndex - 1
      : lines.length - 1;
    const content = lines.slice(h.lineIndex, lineEnd + 1).join('\n');
    return {
      level: h.level,
      title: h.title,
      lineStart: h.lineIndex,
      lineEnd,
      tokenEstimate: estimateTokens(content),
      children: [],
    };
  });

  const root: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const node of nodes) {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return root;
}

// ── Role filtering ────────────────────────────────────────────────────

/**
 * Given a role name and the document's role table, determine which
 * section tags that role can access. Then filter the heading tree
 * to only include headings that fall within matching role blocks.
 */
export function filterTreeByRole(
  tree: HeadingNode[],
  roleBlocks: RoleBlock[],
  roleName: string,
  roleTable: RoleTable,
): HeadingNode[] {
  const allowedTags = roleTable[roleName];
  if (!allowedTags) return []; // unknown role sees nothing

  // Find which line ranges are visible to this role
  const visibleRanges: Array<{ start: number; end: number }> = [];
  for (const block of roleBlocks) {
    // A block is visible if ANY of the block's role tags is in the allowed list
    const hasAccess = block.roles.some(tag => allowedTags.includes(tag));
    if (hasAccess) {
      visibleRanges.push({ start: block.lineStart, end: block.lineEnd });
    }
  }

  return filterNodes(tree, visibleRanges);
}

function isLineVisible(line: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some(r => line >= r.start && line <= r.end);
}

function filterNodes(
  nodes: HeadingNode[],
  visibleRanges: Array<{ start: number; end: number }>,
): HeadingNode[] {
  const result: HeadingNode[] = [];

  for (const node of nodes) {
    // A heading is visible if its line falls within a visible range
    if (isLineVisible(node.lineStart, visibleRanges)) {
      const filtered: HeadingNode = {
        ...node,
        children: filterNodes(node.children, visibleRanges),
      };
      result.push(filtered);
    } else {
      // Even if this heading is not visible, its children might be
      const visibleChildren = filterNodes(node.children, visibleRanges);
      result.push(...visibleChildren);
    }
  }

  return result;
}

// ── Section content extraction ────────────────────────────────────────

/**
 * Fuzzy match: case-insensitive substring + word overlap scoring.
 * Returns similarity 0..1
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1.0;
  if (t.includes(q)) return 0.9;
  if (q.includes(t)) return 0.8;

  // Word overlap
  const qWords = q.split(/\s+/).filter(w => w.length >= 2);
  const tWords = t.split(/\s+/).filter(w => w.length >= 2);

  if (qWords.length === 0) return 0;

  const matches = qWords.filter(w =>
    tWords.some(tw => tw.includes(w) || w.includes(tw)),
  );

  if (matches.length > 0) {
    return 0.5 + (0.3 * matches.length / Math.max(qWords.length, tWords.length));
  }

  return 0;
}

function flattenTree(nodes: HeadingNode[]): HeadingNode[] {
  const flat: HeadingNode[] = [];
  for (const n of nodes) {
    flat.push(n);
    flat.push(...flattenTree(n.children));
  }
  return flat;
}

export function findSection(
  parsed: ParsedDocument,
  heading: string,
  role?: string,
): { node: HeadingNode; content: string } | null {
  let searchTree = parsed.tree;

  // If role is specified, filter the tree first
  if (role) {
    searchTree = filterTreeByRole(
      parsed.tree,
      parsed.roleBlocks,
      role,
      parsed.meta.roles,
    );
  }

  const allNodes = flattenTree(searchTree);
  let best: HeadingNode | null = null;
  let bestScore = 0;

  for (const node of allNodes) {
    const score = fuzzyScore(heading, node.title);
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }

  if (!best || bestScore < 0.5) return null;

  // Extract content, but filter out lines from role blocks the role can't see
  let contentLines = parsed.lines.slice(best.lineStart, best.lineEnd + 1);

  if (role) {
    contentLines = filterContentByRole(
      contentLines,
      best.lineStart,
      parsed.roleBlocks,
      role,
      parsed.meta.roles,
    );
  }

  return { node: best, content: contentLines.join('\n') };
}

/**
 * Filter content lines: remove any lines inside role blocks that the
 * given role does not have access to.
 */
function filterContentByRole(
  contentLines: string[],
  offsetLineStart: number,
  roleBlocks: RoleBlock[],
  roleName: string,
  roleTable: RoleTable,
): string[] {
  const allowedTags = roleTable[roleName];
  if (!allowedTags) return [];

  // Build set of blocked line ranges
  const blockedRanges: Array<{ start: number; end: number }> = [];
  for (const block of roleBlocks) {
    const hasAccess = block.roles.some(tag => allowedTags.includes(tag));
    if (!hasAccess) {
      blockedRanges.push({ start: block.lineStart, end: block.lineEnd });
    }
  }

  if (blockedRanges.length === 0) return contentLines;

  return contentLines.filter((_, idx) => {
    const absoluteLine = offsetLineStart + idx;
    return !blockedRanges.some(r => absoluteLine >= r.start && absoluteLine <= r.end);
  });
}

// ── Tree rendering ────────────────────────────────────────────────────

export function renderTree(nodes: HeadingNode[]): string {
  const lines: string[] = [];
  for (const node of nodes) {
    const indent = '  '.repeat(node.level - 1);
    lines.push(`${indent}${'#'.repeat(node.level)} ${node.title}  (~${node.tokenEstimate} tok)`);
    if (node.children.length > 0) {
      lines.push(renderTree(node.children));
    }
  }
  return lines.join('\n');
}

// ── Main parse function ───────────────────────────────────────────────

export function parseDocument(text: string): ParsedDocument {
  const lines = text.split('\n');
  const { meta, frontmatterRaw, contentStartLine } = extractFrontmatter(lines);
  const roleBlocks = extractRoleBlocks(lines, contentStartLine);
  const relations = extractRelations(lines);
  const headings = findHeadings(lines, contentStartLine);
  const tree = buildTree(headings, lines);

  return {
    meta,
    frontmatterRaw,
    roleBlocks,
    relations,
    tree,
    lines,
    fullText: text,
  };
}

// ── Entity extraction ─────────────────────────────────────────────────

/**
 * Matches: [[entity name]] — wikilinks.
 */
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export interface EntityOccurrence {
  name: string;
  section: string;
}

/**
 * Extract all [[wikilink]] entities from document lines.
 * Skips content inside fenced code blocks.
 * If role is given, only extract from lines visible to that role.
 */
export function extractEntities(
  parsed: ParsedDocument,
  role?: string,
): EntityOccurrence[] {
  const { lines } = parsed;
  const results: EntityOccurrence[] = [];
  const seen = new Set<string>();

  // Build a map of line → section title
  const lineToSection = buildLineToSectionMap(lines, parsed);

  // Determine which lines are visible (for role filtering)
  let visibleLines: Set<number> | null = null;
  if (role) {
    const allowedTags = parsed.meta.roles[role];
    if (!allowedTags) return [];
    visibleLines = new Set<number>();
    for (const block of parsed.roleBlocks) {
      const hasAccess = block.roles.some(tag => allowedTags.includes(tag));
      if (hasAccess) {
        for (let i = block.lineStart; i <= block.lineEnd; i++) {
          visibleLines.add(i);
        }
      }
    }
  }

  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();

    // Track fenced code blocks
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Role filter
    if (visibleLines !== null && !visibleLines.has(i)) continue;

    // Find all wikilinks on this line
    const line = lines[i];
    let match: RegExpExecArray | null;
    WIKILINK_RE.lastIndex = 0;
    while ((match = WIKILINK_RE.exec(line)) !== null) {
      const name = match[1].trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ name, section: lineToSection(i) });
    }
  }

  return results;
}

function buildLineToSectionMap(
  lines: string[],
  parsed: ParsedDocument,
): (line: number) => string {
  // Build sorted list of heading starts and their titles
  const headings: Array<{ lineStart: number; title: string }> = [];

  function collectHeadings(nodes: import('./types.js').HeadingNode[]): void {
    for (const n of nodes) {
      headings.push({ lineStart: n.lineStart, title: n.title });
      collectHeadings(n.children);
    }
  }
  collectHeadings(parsed.tree);
  headings.sort((a, b) => a.lineStart - b.lineStart);

  return (line: number): string => {
    let section = '(preamble)';
    for (const h of headings) {
      if (h.lineStart <= line) section = h.title;
      else break;
    }
    return section;
  };
}

// ── Date extraction ───────────────────────────────────────────────────

export interface DateOccurrence {
  date: string;
  context: string;
}

const DATE_FULL_RE = /\b(\d{4}-\d{2}-\d{2})\b/g;
const DATE_MONTH_RE = /\b(\d{4}-\d{2})\b/g;

/**
 * Scan document body lines for date patterns (YYYY-MM-DD and YYYY-MM).
 * Returns each occurrence with surrounding context (the whole line trimmed).
 * Skips code blocks and frontmatter.
 */
export function extractDates(parsed: ParsedDocument): DateOccurrence[] {
  const results: DateOccurrence[] = [];
  let inCodeBlock = false;

  for (let i = parsed.lines.length > 0 ? 0 : 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i];
    const trimmed = line.trimStart();

    // Skip fenced code blocks
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Collect full dates first (YYYY-MM-DD), then month-only (YYYY-MM)
    const fullMatches = new Set<string>();
    let m: RegExpExecArray | null;

    DATE_FULL_RE.lastIndex = 0;
    while ((m = DATE_FULL_RE.exec(line)) !== null) {
      fullMatches.add(m[1]);
      results.push({ date: m[1], context: line.trim() });
    }

    DATE_MONTH_RE.lastIndex = 0;
    while ((m = DATE_MONTH_RE.exec(line)) !== null) {
      // Skip if this YYYY-MM is already part of a full YYYY-MM-DD match
      const candidate = m[1];
      const isPartOfFull = [...fullMatches].some(fd => fd.startsWith(candidate));
      if (!isPartOfFull) {
        results.push({ date: candidate, context: line.trim() });
      }
    }
  }

  return results;
}

// ── Simple in-memory cache ────────────────────────────────────────────

const cache = new Map<string, { mtime: number; parsed: ParsedDocument }>();

export async function parseDocumentCached(
  path: string,
  text: string,
  mtime?: number,
): Promise<ParsedDocument> {
  const key = path;
  const ts = mtime ?? Date.now();
  const cached = cache.get(key);

  if (cached && cached.mtime >= ts) {
    return cached.parsed;
  }

  const parsed = parseDocument(text);
  cache.set(key, { mtime: ts, parsed });
  return parsed;
}
