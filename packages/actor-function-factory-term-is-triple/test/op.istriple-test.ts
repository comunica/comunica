import { ActorFunctionFactoryTermTriple } from '@comunica/actor-function-factory-term-triple';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermIsTriple } from '../lib';

describe('evaluation of \'ISTRIPLE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermIsTriple(args),
      args => new ActorFunctionFactoryTermTriple(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'ISTRIPLE',
    testArray: [
      [ '<<( <ex:a> <ex:b> <ex:c> )>>', '"true"^^xsd:boolean' ],
      [ '"123"', '"false"^^xsd:boolean' ],
      [ '<ex:abc>', '"false"^^xsd:boolean' ],
    ],
  });
});
