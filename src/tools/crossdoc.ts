/**
 * refracted_crossdoc — find all documents in a directory that reference a target file.
 */

import { readdir, readFile, stat as fsStat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from '../parser.js';

export async function handleCrossdoc(
  directory: string,
  target: string,
): Promise<string> {
  // Normalise target — strip .md if present, we match both ways
  const targetBase = target.endsWith('.md') ? target.slice(0, -3) : target;

  // List .md files in directory
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error reading directory: ${msg}`;
  }

  const mdFiles = entries.filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    return `No .md files found in directory: ${directory}`;
  }

  const matches: Array<{ file: string; description: string }> = [];

  for (const fname of mdFiles) {
    const fullPath = join(directory, fname);
    try {
      const s = await fsStat(fullPath);
      if (!s.isFile() || s.size > 2 * 1024 * 1024) continue;

      const text = await readFile(fullPath, 'utf-8');
      const parsed = parseDocument(text);

      for (const rel of parsed.relations) {
        const relBase = rel.target.endsWith('.md') ? rel.target.slice(0, -3) : rel.target;
        if (relBase === targetBase) {
          matches.push({ file: fname, description: rel.description });
          break; // one match per file is enough
        }
      }
    } catch {
      // Skip unreadable files silently
    }
  }

  if (matches.length === 0) {
    return `Documents referencing: ${targetBase}\n\n  (no references found in ${directory})`;
  }

  const lines: string[] = [`Documents referencing: ${targetBase}`, ''];
  for (const m of matches) {
    lines.push(`  ${m.file}: "${m.description}"`);
  }

  return lines.join('\n');
}
