/**
 * refracted_meta — read document metadata and role table from frontmatter.
 */

import type { ParsedDocument } from '../types.js';

export function handleMeta(parsed: ParsedDocument): string {
  const meta = parsed.meta;

  if (!parsed.frontmatterRaw) {
    return 'No frontmatter found in this document.';
  }

  const parts: string[] = [];

  // Document metadata
  parts.push('## Document Metadata\n');
  if (meta.type) parts.push(`Type: ${meta.type}`);
  if (meta.version) parts.push(`Version: ${meta.version}`);
  if (meta.created) parts.push(`Created: ${meta.created}`);
  if (meta.modified) parts.push(`Modified: ${meta.modified}`);

  // Extra keys
  const extraKeys = Object.keys(meta.extra);
  if (extraKeys.length > 0) {
    for (const key of extraKeys) {
      parts.push(`${key}: ${JSON.stringify(meta.extra[key])}`);
    }
  }

  // Role table
  const roleKeys = Object.keys(meta.roles);
  if (roleKeys.length > 0) {
    parts.push('\n## Role Table\n');
    for (const role of roleKeys) {
      parts.push(`- ${role}: [${meta.roles[role].join(', ')}]`);
    }
  } else {
    parts.push('\n## Role Table\n');
    parts.push('No roles defined.');
  }

  // Facts summary
  if (meta.facts.length > 0) {
    parts.push(`\n## Facts\n`);
    parts.push(`${meta.facts.length} fact(s) defined. Use refracted_facts for details.`);
  }

  return parts.join('\n');
}

/**
 * Return metadata as structured JSON.
 */
export function handleMetaJSON(parsed: ParsedDocument): object {
  return {
    type: parsed.meta.type ?? null,
    version: parsed.meta.version ?? null,
    created: parsed.meta.created ?? null,
    modified: parsed.meta.modified ?? null,
    roles: parsed.meta.roles,
    factsCount: parsed.meta.facts.length,
    extra: parsed.meta.extra,
  };
}
