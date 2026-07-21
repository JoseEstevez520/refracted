/**
 * refracted_diff — detect structural changes in a markdown file.
 *
 * Stores a snapshot of parsed metadata (facts, relations, section headings)
 * alongside a simple hash in .refracted/hashes.json next to the target file.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import type { ParsedDocument } from '../types.js';

interface Snapshot {
  hash: string;
  factIds: string[];
  relationTargets: string[];
  sectionHeadings: string[];
}

type HashStore = Record<string, Snapshot>;

function computeHash(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16);
}

function snapshotFromParsed(parsed: ParsedDocument, hash: string): Snapshot {
  return {
    hash,
    factIds: parsed.meta.facts.map(f => f.id),
    relationTargets: parsed.relations.map(r => r.target),
    sectionHeadings: flattenHeadings(parsed),
  };
}

function flattenHeadings(parsed: ParsedDocument): string[] {
  const result: string[] = [];
  function collect(nodes: ParsedDocument['tree']): void {
    for (const n of nodes) {
      result.push(`${'#'.repeat(n.level)} ${n.title}`);
      collect(n.children);
    }
  }
  collect(parsed.tree);
  return result;
}

async function loadStore(storeFile: string): Promise<HashStore> {
  try {
    const raw = await readFile(storeFile, 'utf-8');
    return JSON.parse(raw) as HashStore;
  } catch {
    return {};
  }
}

async function saveStore(storeFile: string, store: HashStore): Promise<void> {
  await mkdir(dirname(storeFile), { recursive: true });
  await writeFile(storeFile, JSON.stringify(store, null, 2), 'utf-8');
}

function diffSnapshots(prev: Snapshot, curr: Snapshot, fileName: string): string {
  const changes: string[] = [];

  // Facts
  const addedFacts = curr.factIds.filter(id => !prev.factIds.includes(id));
  const removedFacts = prev.factIds.filter(id => !curr.factIds.includes(id));
  if (addedFacts.length > 0) changes.push(`  Facts added: ${addedFacts.join(', ')}`);
  if (removedFacts.length > 0) changes.push(`  Facts removed: ${removedFacts.join(', ')}`);

  // Relations
  const addedRels = curr.relationTargets.filter(t => !prev.relationTargets.includes(t));
  const removedRels = prev.relationTargets.filter(t => !curr.relationTargets.includes(t));
  if (addedRels.length > 0) changes.push(`  Relations added: ${addedRels.join(', ')}`);
  if (removedRels.length > 0) changes.push(`  Relations removed: ${removedRels.join(', ')}`);

  // Sections
  const addedSections = curr.sectionHeadings.filter(h => !prev.sectionHeadings.includes(h));
  const removedSections = prev.sectionHeadings.filter(h => !curr.sectionHeadings.includes(h));
  if (addedSections.length > 0) changes.push(`  Sections added: ${addedSections.join(', ')}`);
  if (removedSections.length > 0) changes.push(`  Sections removed: ${removedSections.join(', ')}`);

  if (changes.length === 0) {
    changes.push('  Content modified (structure unchanged)');
  }

  const header = [
    `Diff for: ${fileName}`,
    `  Hash: ${prev.hash} → ${curr.hash}`,
    '',
    'Changes detected:',
  ];

  return [...header, ...changes].join('\n');
}

export async function handleDiff(
  parsed: ParsedDocument,
  filePath: string,
): Promise<string> {
  const dir = dirname(filePath);
  const fileName = basename(filePath);
  const storeFile = join(dir, '.refracted', 'hashes.json');

  const text = parsed.fullText;
  const hash = computeHash(text);
  const currSnapshot = snapshotFromParsed(parsed, hash);

  const store = await loadStore(storeFile);
  const prev = store[fileName];

  if (!prev) {
    // First read — store and report
    store[fileName] = currSnapshot;
    await saveStore(storeFile, store);
    return [
      `Diff for: ${fileName}`,
      '',
      'Status: first read — snapshot stored.',
      `  Hash: ${hash}`,
      `  Facts: ${currSnapshot.factIds.length}`,
      `  Relations: ${currSnapshot.relationTargets.length}`,
      `  Sections: ${currSnapshot.sectionHeadings.length}`,
    ].join('\n');
  }

  if (prev.hash === hash) {
    return [
      `Diff for: ${fileName}`,
      '',
      'Status: no changes (hash matches).',
      `  Hash: ${hash}`,
    ].join('\n');
  }

  // Changes detected — update store and report diff
  store[fileName] = currSnapshot;
  await saveStore(storeFile, store);

  return diffSnapshots(prev, currSnapshot, fileName);
}
