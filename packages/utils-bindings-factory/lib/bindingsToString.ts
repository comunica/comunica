import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';

/**
 * Convert a bindings object to a human-readable string.
 * @param bindings A bindings object.
 */
export function bindingsToString(bindings: RDF.Bindings): string {
  const raw: Record<string, string> = {};
  for (const key of bindings.keys()) {
    raw[key.value] = termToString(bindings.get(key))!;
  }
  return JSON.stringify(raw, null, '  ');
}

/**
 * Convert a bindings object to a compact string.
 * This is mainly useful for internal indexing purposes.
 *
 * This function is guaranteed to not produce clashing bindings for unequal terms.
 *
 * This function will not sort the variables and expects them to be in the same order for every call.
 *
 * @param bindings A bindings object.
 * @param variables The variables to consider when converting the bindings to a string.
 */
export function bindingsToCompactString(bindings: RDF.Bindings, variables: RDF.Variable[]): string {
  return variables
    .map((variable) => {
      const term = bindings.get(variable);
      if (term) {
        return termToString(term);
      }
      return '';
    })
    .join('');
}
