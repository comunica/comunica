import type * as RDF from '@rdfjs/types';
import { quadToStringQuad } from 'rdf-string';
import toEqualRdfQuad from './toEqualRdfQuad';

function quadArrayToString(quads: RDF.BaseQuad[]): string {
  return `[ ${quads.map(quad => JSON.stringify(quadToStringQuad(quad))).join(', ')} ]`;
}

export default {
  toEqualRdfQuadArray(received: RDF.BaseQuad[], actual: RDF.BaseQuad[]) {
    if (received.length !== actual.length) {
      return {
        message: () => `expected ${quadArrayToString(received)} to equal ${quadArrayToString(actual)}`,
        pass: false,
      };
    }

    for (const [ i, element ] of received.entries()) {
      const sub = toEqualRdfQuad.toEqualRdfQuad(element, actual[i]);
      if (!sub.pass) {
        return sub;
      }
    }

    return {
      message: () => `expected ${quadArrayToString(received)} not to equal ${quadArrayToString(actual)}`,
      pass: true,
    };
  },
};
