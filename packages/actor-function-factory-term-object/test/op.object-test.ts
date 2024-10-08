import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionObject } from '../lib';

describe('evaluation of \'OBJECT\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionObject(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'OBJECT',
    testArray: [
      [ '<< <ex:a> <ex:b> <ex:c> >>', 'ex:c' ],
      [ '<< <ex:a2> <ex:b2> "123" >>', '"123"' ],
    ],
  });
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionObject(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'OBJECT',
    errorArray: [
      [ '<ex:a>', `Argument types not valid for operator: '"object"' with '[{"expressionType":"term","value":"ex:a","termType":"namedNode"}]` ],
    ],
  });
});
