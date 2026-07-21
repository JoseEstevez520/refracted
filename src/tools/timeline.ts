/**
 * refracted_timeline — extract and present facts and body dates chronologically.
 */

import { basename } from 'node:path';
import type { ParsedDocument } from '../types.js';
import { extractDates } from '../parser.js';
import type { Fact } from '../types.js';

interface TimelineEntry {
  date: string;
  label: string;
  sortKey: string;
}

/** Known date-like keys in a Fact object (beyond 'date'). */
const DATE_FACT_KEYS = new Set([
  'date', 'created', 'valid', 'valid_from', 'valid_until', 'modified', 'timestamp',
]);

function isoToSortKey(date: string): string {
  // Normalise partial dates so they sort correctly
  // 2025-09 → 2025-09-00, 2025 → 2025-00-00
  const parts = date.split('-');
  while (parts.length < 3) parts.push('00');
  return parts.join('-');
}

function extractFactDates(facts: Fact[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const fact of facts) {
    for (const [key, value] of Object.entries(fact)) {
      if (key === 'id') continue;
      if (!DATE_FACT_KEYS.has(key)) continue;
      const v = String(value ?? '').trim();
      if (!v) continue;

      // Accept YYYY-MM-DD, YYYY-MM, or loose patterns like "jun-sep"
      entries.push({
        date: v,
        label: `${fact.id}: ${formatFactLabel(fact)}`,
        sortKey: deriveSort(v),
      });
    }
  }

  return entries;
}

function formatFactLabel(fact: Fact): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fact)) {
    if (k === 'id') continue;
    if (v !== undefined) parts.push(`${k}: ${v}`);
  }
  return parts.join(', ');
}

function deriveSort(date: string): string {
  // Try ISO first
  const isoMatch = date.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/);
  if (isoMatch) return isoToSortKey(isoMatch[1]);
  // Fall back to end for loose strings like "jun-sep"
  return 'z' + date;
}

export function handleTimeline(parsed: ParsedDocument, filePath: string): string {
  const fileName = basename(filePath);
  const meta = parsed.meta;

  const entries: TimelineEntry[] = [];

  // 1. Document-level dates from frontmatter
  if (meta.created) {
    entries.push({
      date: meta.created,
      label: 'Document created',
      sortKey: isoToSortKey(meta.created),
    });
  }
  if (meta.modified) {
    entries.push({
      date: meta.modified,
      label: 'Document last modified',
      sortKey: isoToSortKey(meta.modified),
    });
  }

  // 2. Fact-level date fields
  entries.push(...extractFactDates(meta.facts));

  // 3. Body text dates
  const bodyDates = extractDates(parsed);
  for (const bd of bodyDates) {
    entries.push({
      date: bd.date,
      label: bd.context,
      sortKey: isoToSortKey(bd.date),
    });
  }

  if (entries.length === 0) {
    return `Timeline for: ${fileName}\n\n  (no temporal information found)`;
  }

  // Sort by sortKey
  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const lines: string[] = [`Timeline for: ${fileName}`, ''];
  for (const e of entries) {
    const pad = e.date.padEnd(12);
    lines.push(`  ${pad}${e.label}`);
  }

  return lines.join('\n');
}
