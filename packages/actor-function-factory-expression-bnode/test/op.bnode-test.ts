import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryExpressionBnode } from '../lib';

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionBnode(args),
    ],
    operation: 'BNODE',
    arity: 1,
    notation: Notation.Function,
    errorTable: `
    1 = 'Argument types not valid for operator'
    `,
  });
});
