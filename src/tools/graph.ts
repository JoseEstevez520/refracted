/**
 * refracted_graph — traverse relations across multiple files (N levels deep).
 */

import { readFile, stat as fsStat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { parseDocument } from '../parser.js';
import type { Relation } from '../types.js';

const MAX_DEPTH = 3;

interface GraphNode {
  file: string;
  relations: Relation[];
}

interface GraphEdge {
  from: string;
  to: string;
  description: string;
  depth: number;
}

async function tryReadMd(dir: string, name: string): Promise<string | null> {
  // name may already have .md, or not
  const candidates = name.endsWith('.md')
    ? [join(dir, name)]
    : [join(dir, `${name}.md`), join(dir, name)];

  for (const candidate of candidates) {
    try {
      const s = await fsStat(candidate);
      if (s.isFile() && s.size < 2 * 1024 * 1024) {
        const buf = await readFile(candidate, 'utf-8');
        return buf;
      }
    } catch {
      // not found or unreadable — try next
    }
  }
  return null;
}

export async function handleGraph(file: string, depth: number): Promise<string> {
  const resolvedDepth = Math.max(1, Math.min(depth, MAX_DEPTH));
  const dir = dirname(file);
  const rootName = basename(file);

  // BFS traversal
  const visited = new Map<string, GraphNode>(); // key = resolved filename
  const edges: GraphEdge[] = [];
  const queue: Array<{ name: string; currentDepth: number }> = [
    { name: rootName, currentDepth: 0 },
  ];

  // Read root file
  let rootText: string;
  try {
    const s = await fsStat(file);
    if (!s.isFile()) return `Error: Not a file: ${file}`;
    rootText = await readFile(file, 'utf-8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error reading file: ${msg}`;
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { name, currentDepth } = item;

    if (visited.has(name)) continue;

    // Read and parse the file
    let text: string;
    if (name === rootName) {
      text = rootText;
    } else {
      const content = await tryReadMd(dir, name);
      if (content === null) {
        // File not found — mark as visited with no relations
        visited.set(name, { file: name, relations: [] });
        continue;
      }
      text = content;
    }

    const parsed = parseDocument(text);
    const node: GraphNode = { file: name, relations: parsed.relations };
    visited.set(name, node);

    // If we haven't reached max depth, enqueue targets
    if (currentDepth < resolvedDepth) {
      for (const rel of parsed.relations) {
        const targetName = rel.target.endsWith('.md') ? rel.target : `${rel.target}.md`;
        edges.push({
          from: name,
          to: targetName,
          description: rel.description,
          depth: currentDepth + 1,
        });
        if (!visited.has(targetName)) {
          queue.push({ name: targetName, currentDepth: currentDepth + 1 });
        }
      }
    } else {
      // At max depth, still record edges but don't follow them
      for (const rel of parsed.relations) {
        const targetName = rel.target.endsWith('.md') ? rel.target : `${rel.target}.md`;
        edges.push({
          from: name,
          to: targetName,
          description: rel.description,
          depth: currentDepth + 1,
        });
      }
    }
  }

  if (edges.length === 0 && visited.size === 1) {
    return `Graph from: ${rootName} (depth: ${resolvedDepth})\n\n${rootName}\n  (no relations found)`;
  }

  // Render graph
  const lines: string[] = [];
  lines.push(`Graph from: ${rootName} (depth: ${resolvedDepth})`);
  lines.push('');

  function renderNode(name: string, indent: string): void {
    lines.push(`${indent}${name}`);
    const nodeEdges = edges.filter(e => e.from === name);
    for (const edge of nodeEdges) {
      const childIndent = indent + '  ';
      lines.push(`${childIndent}→ ${edge.to}: "${edge.description}"`);
      // Recursively render targets that are not the root (avoid infinite loops)
      if (edge.to !== rootName && visited.has(edge.to)) {
        const childEdges = edges.filter(e => e.from === edge.to);
        for (const childEdge of childEdges) {
          const grandIndent = childIndent + '  ';
          lines.push(`${grandIndent}→ ${childEdge.to}: "${childEdge.description}"`);
        }
      }
    }
  }

  renderNode(rootName, '');

  return lines.join('\n');
}
