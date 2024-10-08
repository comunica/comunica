import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { int, timeTyped } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermHours } from '../lib';

describe('evaluation of \'HOURS\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermHours(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'HOURS',
    testTable: `
    '${timeTyped('11:28:01Z')}' = '${int('11')}'
    '${timeTyped('15:38:02-08:00')}' = '${int('15')}'
    '${timeTyped('23:59:00Z')}' = '${int('23')}'
    '${timeTyped('01:02:03')}' = '${int('1')}'
  `,
  });
});
