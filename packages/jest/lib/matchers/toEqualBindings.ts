import { bindingsToString } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';

function fail(received: RDF.Bindings, actual: RDF.Bindings): any {
  return {
    message: () => `expected ${bindingsToString(received)} and ${bindingsToString(actual)} to be equal`,
    pass: false,
  };
}

function succeed(received: RDF.Bindings, actual: RDF.Bindings): any {
  return {
    message: () => `expected ${bindingsToString(received)} and ${bindingsToString(actual)} not to be equal`,
    pass: true,
  };
}

export default {
  toEqualBindings(received: RDF.Bindings, actual: RDF.Bindings) {
    if (!received.equals(actual)) {
      return fail(received, actual);
    }

    return succeed(received, actual);
  },
};
