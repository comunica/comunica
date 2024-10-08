import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { int, timeTyped } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionSeconds } from '../lib';

describe('evaluation of \'SECONDS\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionSeconds(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'SECONDS',
    testTable: `
    '${timeTyped('11:28:01Z')}' = '${int('1')}'
    '${timeTyped('15:38:02-08:00')}' = '${int('2')}'
    '${timeTyped('23:59:00Z')}' = '${int('0')}'
    '${timeTyped('01:02:03')}' = '${int('3')}'
  `,
  });
});
