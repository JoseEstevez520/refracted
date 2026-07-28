#!/usr/bin/env node
/**
 * refracted — MCP server for role-aware markdown views.
 *
 * One document. Many readings. No LLM at read time.
 *
 * Tools:
 *   refracted_tree(file, role?)              — heading tree, filtered by role
 *   refracted_section(file, heading, role?)  — section content, filtered by role
 *   refracted_facts(file)                    — structured facts from frontmatter
 *   refracted_relations(file)                — semantic relations from link refs
 *   refracted_meta(file)                     — document metadata and role table
 *   refracted_graph(file, depth?)            — traverse relations across files
 *   refracted_entities(file, role?)          — extract [[wikilink]] entities
 *   refracted_timeline(file)                 — chronological date/fact timeline
 *   refracted_diff(file)                     — detect structural changes
 *   refracted_crossdoc(directory, target)    — find files referencing a target
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile, stat as fsStat } from 'node:fs/promises';
import { parseDocumentCached } from './parser.js';
import { handleTree } from './tools/tree.js';
import { handleSection } from './tools/section.js';
import { handleFacts } from './tools/facts.js';
import { handleRelations } from './tools/relations.js';
import { handleMeta } from './tools/meta.js';
import { handleGraph } from './tools/graph.js';
import { handleEntities } from './tools/entities.js';
import { handleTimeline } from './tools/timeline.js';
import { handleDiff } from './tools/diff.js';
import { handleCrossdoc } from './tools/crossdoc.js';

// ── Helpers ────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function categorizeError(e: unknown, path: string): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code;
    if (code === 'ENOENT') return `File not found: ${path}`;
    if (code === 'EACCES' || code === 'EPERM') return `Permission denied: ${path}`;
    if (code === 'EISDIR') return `Path is a directory, not a file: ${path}`;
  }
  if (e instanceof Error) return e.message;
  return `Unknown error reading: ${path}`;
}

async function loadFile(path: string): Promise<{ text: string; mtime: number }> {
  let s;
  try {
    s = await fsStat(path);
  } catch (e: unknown) {
    throw new Error(categorizeError(e, path));
  }

  if (s.isDirectory()) {
    throw new Error(`Path is a directory, not a file: ${path}`);
  }

  if (s.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large (${Math.round(s.size / 1024)}KB > ${MAX_FILE_SIZE / 1024}KB limit): ${path}`,
    );
  }

  if (s.size === 0) {
    return { text: '', mtime: s.mtimeMs };
  }

  let buf: Buffer;
  try {
    buf = await readFile(path);
  } catch (e: unknown) {
    throw new Error(categorizeError(e, path));
  }

  // Detect binary files
  const checkLen = Math.min(buf.length, 8192);
  for (let i = 0; i < checkLen; i++) {
    if (buf[i] === 0) {
      throw new Error(`Binary file detected: ${path}`);
    }
  }

  return { text: buf.toString('utf-8'), mtime: s.mtimeMs };
}

function textResult(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

// ── Server setup ───────────────────────────────────────────────────────

const server = new McpServer(
  {
    name: 'refracted',
    version: '0.1.0',
  },
  {
    instructions: `refracted provides role-aware markdown reading tools. Documents use three invisible mechanisms to embed structured data:

1. **Frontmatter YAML** — facts, role visibility table, document metadata
2. **HTML comments** (\`<!-- @role: X -->\` blocks) — section-level visibility markers
3. **Link reference definitions** (\`[rel:doc_name]: # "description"\`) — semantic relations

## When to use these tools

- **refracted_tree**: See the heading structure, optionally filtered by a specific role. Use this FIRST.
- **refracted_section**: Read a specific section. If a role is given, only content visible to that role is returned.
- **refracted_facts**: Extract structured data points (facts/hechos) from frontmatter.
- **refracted_relations**: Extract semantic links between documents.
- **refracted_meta**: Read document metadata and the role visibility table.
- **refracted_graph**: Traverse relations across multiple files N levels deep, building a connected graph.
- **refracted_entities**: Extract all [[wikilink]] entities from a file (optionally filtered by role).
- **refracted_timeline**: Present facts and body-text dates in chronological order.
- **refracted_diff**: Detect structural changes in a file since last read (stored in .refracted/hashes.json).
- **refracted_crossdoc**: Find all documents in a directory that reference a specific file.

## Workflow

1. refracted_meta → understand what roles exist and what the document is
2. refracted_tree → see the structure (with or without role filter)
3. refracted_section → read only the section you need
4. refracted_facts / refracted_relations → extract structured data
5. refracted_graph → explore the document network
6. refracted_entities → find referenced entities and concepts
7. refracted_timeline → build a chronological view
8. refracted_diff → track changes over time
9. refracted_crossdoc → find back-references from a directory`,
  },
);

// ── Tool: refracted_tree ──────────────────────────────────────────────

server.tool(
  'refracted_tree',
  'Returns the heading tree of a markdown file with token estimates. With a role, filters to only show sections that role can see.',
  {
    file: z.string().describe('Absolute path to the .md file'),
    role: z.string().optional().describe('Role name to filter by (e.g., "training", "auditor")'),
  },
  async ({ file, role }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleTree(parsed, file, role));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_section ───────────────────────────────────────────

server.tool(
  'refracted_section',
  'Returns the content of a specific section matched by heading text (fuzzy match). With a role, only returns content visible to that role.',
  {
    file: z.string().describe('Absolute path to the .md file'),
    heading: z.string().describe('Heading text to match (fuzzy, case-insensitive)'),
    role: z.string().optional().describe('Role name to filter by'),
  },
  async ({ file, heading, role }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleSection(parsed, heading, role));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_facts ─────────────────────────────────────────────

server.tool(
  'refracted_facts',
  'Extracts structured facts (hechos) from the YAML frontmatter of a markdown file.',
  {
    file: z.string().describe('Absolute path to the .md file'),
  },
  async ({ file }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleFacts(parsed));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_relations ─────────────────────────────────────────

server.tool(
  'refracted_relations',
  'Extracts semantic relations embedded as link reference definitions ([rel:X]: # "description").',
  {
    file: z.string().describe('Absolute path to the .md file'),
  },
  async ({ file }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleRelations(parsed));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_meta ──────────────────────────────────────────────

server.tool(
  'refracted_meta',
  'Returns document metadata and the role visibility table from frontmatter.',
  {
    file: z.string().describe('Absolute path to the .md file'),
  },
  async ({ file }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleMeta(parsed));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_graph ─────────────────────────────────────────────

server.tool(
  'refracted_graph',
  'Traverses [rel:X] relations across multiple files up to N levels deep, building a graph of connected documents.',
  {
    file: z.string().describe('Absolute path to the starting .md file'),
    depth: z.number().int().min(1).max(3).optional().describe('Traversal depth (default 1, max 3)'),
  },
  async ({ file, depth = 1 }) => {
    try {
      return textResult(await handleGraph(file, depth));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_entities ──────────────────────────────────────────

server.tool(
  'refracted_entities',
  'Extracts all [[wikilink]] entities from a markdown file with the section they appear in. Optionally filtered by role.',
  {
    file: z.string().describe('Absolute path to the .md file'),
    role: z.string().optional().describe('Role name — if given, only extract from sections visible to that role'),
  },
  async ({ file, role }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleEntities(parsed, file, role));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_timeline ──────────────────────────────────────────

server.tool(
  'refracted_timeline',
  'Extracts facts and body-text date patterns and presents them chronologically.',
  {
    file: z.string().describe('Absolute path to the .md file'),
  },
  async ({ file }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(handleTimeline(parsed, file));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_diff ──────────────────────────────────────────────

server.tool(
  'refracted_diff',
  'Compares the current state of a file against a stored snapshot to detect structural changes (facts, relations, sections). Stores snapshots in .refracted/hashes.json next to the file.',
  {
    file: z.string().describe('Absolute path to the .md file'),
  },
  async ({ file }) => {
    try {
      const { text, mtime } = await loadFile(file);
      const parsed = await parseDocumentCached(file, text, mtime);
      return textResult(await handleDiff(parsed, file));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Tool: refracted_crossdoc ──────────────────────────────────────────

server.tool(
  'refracted_crossdoc',
  'Scans all .md files in a directory and returns those that reference the specified target file through [rel:X] relations.',
  {
    directory: z.string().describe('Absolute path to the directory to scan'),
    target: z.string().describe('Filename (with or without .md) to search for, e.g. "checklist_v1"'),
  },
  async ({ directory, target }) => {
    try {
      return textResult(await handleCrossdoc(directory, target));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(`Error: ${msg}`, true);
    }
  },
);

// ── Start ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('refracted server running on stdio');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
