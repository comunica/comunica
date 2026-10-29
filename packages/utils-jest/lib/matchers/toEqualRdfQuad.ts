import type * as RDF from '@rdfjs/types';
import { quadToStringQuad } from 'rdf-string';
import toEqualRdfTerm from './toEqualRdfTerm';

export default {
  toEqualRdfQuad(received: RDF.BaseQuad, actual: RDF.BaseQuad) {
    for (const component of <const> [ 'subject', 'predicate', 'object', 'graph' ]) {
      const sub = toEqualRdfTerm.toEqualRdfTerm(received[component], actual[component]);
      if (!sub.pass) {
        return sub;
      }
    }

    return {
      message: () => `expected
  ${JSON.stringify(quadToStringQuad(received))}
not to equal
  ${JSON.stringify(quadToStringQuad(actual))}`,
      pass: true,
    };
  },
};
