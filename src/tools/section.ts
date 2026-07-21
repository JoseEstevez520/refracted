/**
 * refracted_section — read a specific section, optionally filtered by role.
 */

import type { ParsedDocument } from '../types.js';
import { findSection, estimateTokens } from '../parser.js';

export function handleSection(
  parsed: ParsedDocument,
  heading: string,
  role?: string,
): string {
  // If a role is specified, check it exists
  if (role && !parsed.meta.roles[role]) {
    return `Role "${role}" is not defined in this document.\nAvailable roles: ${Object.keys(parsed.meta.roles).join(', ') || '(none)'}`;
  }

  const result = findSection(parsed, heading, role);

  if (!result) {
    if (role) {
      return `No section matching "${heading}" found for role "${role}". The section may not exist or the role may not have access.`;
    }
    return `No section matching "${heading}" found.`;
  }

  const tokens = estimateTokens(result.content);
  const fullTokens = estimateTokens(parsed.fullText);

  const headerParts = [
    `Section: ${result.node.title} (level ${result.node.level})`,
    `Lines: ${result.node.lineStart + 1}-${result.node.lineEnd + 1}`,
  ];

  if (role) {
    headerParts.push(`Role: ${role}`);
  }

  headerParts.push(
    `Section tokens: ~${tokens} | Full file: ~${fullTokens} | Savings: ~${Math.round((1 - tokens / fullTokens) * 100)}%`,
    '',
  );

  return headerParts.join('\n') + result.content;
}
