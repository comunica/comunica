import { bindingsToCompactString, bindingsToString } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import toEqualBindings from './toEqualBindings';

function bindingsArrayToString(bindings: RDF.Bindings[]): string {
  return `[ ${bindings.map(term => bindingsToString(term)).join(', ')} ]`;
}

export default {
  toEqualBindingsArray(received: RDF.Bindings[], actual: RDF.Bindings[], ignoreOrder = false) {
    if (received.length !== actual.length) {
      return {
        message: () => `expected ${bindingsArrayToString(received)} to equal ${bindingsArrayToString(actual)}`,
        pass: false,
      };
    }

    // Sort both streams if order should be ignored
    if (ignoreOrder) {
      const comparatorVariables = (left: RDF.Variable, right: RDF.Variable): number =>
        left.value.localeCompare(right.value);
      const comparatorBindings = (left: RDF.Bindings, right: RDF.Bindings): number =>
        bindingsToCompactString(left, [ ...left.keys() ].sort(comparatorVariables))
          .localeCompare(bindingsToCompactString(right, [ ...right.keys() ].sort(comparatorVariables)));
      received.sort(comparatorBindings);
      actual.sort(comparatorBindings);
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
