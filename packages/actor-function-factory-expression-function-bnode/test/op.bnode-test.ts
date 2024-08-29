import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../../bus-function-factory/test/util';
import { ActorFunctionFactoryExpressionFunctionBnode } from '../lib';

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
    ],
    operation: 'BNODE',
    arity: 1,
    notation: Notation.Function,
    errorTable: `
    1 = 'Argument types not valid for operator'
    `,
  });
});
