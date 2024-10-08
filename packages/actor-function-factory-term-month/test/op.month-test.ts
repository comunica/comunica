import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { dateTyped, int } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermMonth } from '../lib';

describe('evaluation of \'MONTH\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermMonth(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'MONTH',
    testTable: `
    '${dateTyped('2010-06-21Z')}' = '${int('6')}'
    '${dateTyped('2010-12-21-08:00')}' = '${int('12')}'
    '${dateTyped('2008-06-20Z')}' = '${int('6')}'
    '${dateTyped('2011-02-01')}' = '${int('2')}'
  `,
  });
});
