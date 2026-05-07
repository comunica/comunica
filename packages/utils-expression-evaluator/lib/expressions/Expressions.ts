import type { TermType } from '@comunica/types';

/**
 * Attempts to cast a string to a TermType if it matches a known RDF term type.
 * @param type The string to check.
 * @return The string as a TermType if valid, or undefined otherwise.
 */
export function asTermType(type: string): TermType | undefined {
  if (type === 'namedNode' || type === 'literal' || type === 'blankNode' || type === 'quad') {
    return type;
  }
  return undefined;
}
