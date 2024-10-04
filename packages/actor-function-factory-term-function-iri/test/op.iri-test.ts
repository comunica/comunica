import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionIri } from '../lib';

describe('like \'iri\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIri(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'iri',
    testTable: `
      <http://example.com> = http://example.com
      "http://example.com" = http://example.com
      `,
    errorTable: `
        "foo" = 'Found invalid relative IRI'
        1 = 'Argument types not valid for operator'
      `,
  });
});

describe('like \'uri\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIri(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'uri',
    testTable: `
      <http://example.com> = http://example.com
      "http://example.com" = http://example.com
      `,
    errorTable: `
        "foo" = 'Found invalid relative IRI'
        1 = 'Argument types not valid for operator'
      `,
  });
});
