/**
 * refracted_facts — extract structured facts from frontmatter.
 */

import type { ParsedDocument } from '../types.js';

export function handleFacts(parsed: ParsedDocument): string {
  const facts = parsed.meta.facts;

  if (facts.length === 0) {
    return 'No facts found in this document.';
  }

  const header = `Found ${facts.length} fact(s):\n`;
  const formatted = facts.map(fact => {
    const entries = Object.entries(fact)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');
    return `- ${fact.id}\n${entries}`;
  });

  return header + formatted.join('\n\n');
}

/**
 * Return facts as structured JSON (for programmatic consumers).
 */
export function handleFactsJSON(parsed: ParsedDocument): object {
  return {
    count: parsed.meta.facts.length,
    facts: parsed.meta.facts,
  };
}
