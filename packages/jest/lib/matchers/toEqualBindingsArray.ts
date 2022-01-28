import { bindingsToString } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import toEqualBindings from './toEqualBindings';

function bindingsArrayToString(bindings: RDF.Bindings[]): string {
  return `[ ${bindings.map(term => bindingsToString(term)).join(', ')} ]`;
}

export default {
  toEqualBindingsArray(received: RDF.Bindings[], actual: RDF.Bindings[]) {
    if (received.length !== actual.length) {
      return {
        message: () => `expected ${bindingsArrayToString(received)} to equal ${bindingsArrayToString(actual)}`,
        pass: false,
      };
    }

    for (const [ i, element ] of received.entries()) {
      const sub = toEqualBindings.toEqualBindings(element, actual[i]);
      if (!sub.pass) {
        return {
          message: () => `expected ${bindingsArrayToString(received)} to equal ${bindingsArrayToString(actual)}\nIndex ${i} is different.`,
          pass: false,
        };
      }
    }

    return {
      message: () => `expected ${bindingsArrayToString(received)} not to equal ${bindingsArrayToString(actual)}`,
      pass: true,
    };
  },
};
