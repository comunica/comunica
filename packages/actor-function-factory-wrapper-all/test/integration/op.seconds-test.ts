import { int, timeTyped } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluation of \'SECONDS\'', () => {
  runFuncTestTable({
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
