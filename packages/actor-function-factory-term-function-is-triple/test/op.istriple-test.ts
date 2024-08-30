import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionIsTriple } from '../lib';

describe('evaluation of \'ISTRIPLE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIsTriple(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'ISTRIPLE',
    testArray: [
      [ '<< <ex:a> <ex:b> <ex:c> >>', '"true"^^xsd:boolean' ],
      [ '"123"', '"false"^^xsd:boolean' ],
      [ '<ex:abc>', '"false"^^xsd:boolean' ],
    ],
  });
});
