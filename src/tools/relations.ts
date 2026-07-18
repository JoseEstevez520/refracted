/**
 * refracted_relations — extract semantic relations from link reference definitions.
 */

import type { ParsedDocument } from '../types.js';

export function handleRelations(parsed: ParsedDocument): string {
  const relations = parsed.relations;

  if (relations.length === 0) {
    return 'No relations found in this document.';
  }

  const header = `Found ${relations.length} relation(s):\n`;
  const formatted = relations.map(
    rel => `- ${rel.target}: "${rel.description}"`,
  );

  return header + formatted.join('\n');
}

/**
 * Return relations as structured JSON (for programmatic consumers).
 */
export function handleRelationsJSON(parsed: ParsedDocument): object {
  return {
    count: parsed.relations.length,
    relations: parsed.relations,
  };
}
