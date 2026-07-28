/**
 * refracted_entities — extract all [[wikilink]] entities from a markdown file.
 */

import type { ParsedDocument } from '../types.js';
import { extractEntities } from '../parser.js';

export function handleEntities(
  parsed: ParsedDocument,
  filePath: string,
  role?: string,
): string {
  // If role is given, validate it
  if (role && !parsed.meta.roles[role]) {
    return `Role "${role}" is not defined in this document.\nAvailable roles: ${Object.keys(parsed.meta.roles).join(', ') || '(none)'}`;
  }

  const entities = extractEntities(parsed, role);

  const header = role
    ? `Entities in: ${filePath} (role: ${role})\n`
    : `Entities in: ${filePath}\n`;

  if (entities.length === 0) {
    return header + '\n  (no wikilinks found)';
  }

  const formatted = entities.map(e => `  ${e.name} (in "${e.section}")`);
  return header + '\n' + formatted.join('\n');
}
