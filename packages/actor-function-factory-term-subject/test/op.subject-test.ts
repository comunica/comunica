import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermSubject } from '../lib';
import {ActorFunctionFactoryTermTriple} from "@comunica/actor-function-factory-term-triple";

describe('evaluation of \'SUBJECT\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermSubject(args),
      args => new ActorFunctionFactoryTermTriple(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'SUBJECT',
    testArray: [
      [ '<<( <ex:a> <ex:b> <ex:c> )>>', 'ex:a' ],
      [ '<<( <ex:a2> <ex:b2> "123" )>>', 'ex:a2' ],
    ],
  });
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermSubject(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'SUBJECT',
    errorArray: [
      [ '<ex:a>', `Argument types not valid for operator: '"subject"' with '[{"expressionType":"term","value":"ex:a","termType":"namedNode"}]` ],
    ],
  });
});
