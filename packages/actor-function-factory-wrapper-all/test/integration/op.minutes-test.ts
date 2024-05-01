import { int, timeTyped } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluation of \'MINUTES\'', () => {
  runFuncTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'MINUTES',
    testTable: `
    '${timeTyped('11:28:01Z')}' = '${int('28')}'
    '${timeTyped('15:38:02-08:00')}' = '${int('38')}'
    '${timeTyped('23:59:00Z')}' = '${int('59')}'
    '${timeTyped('01:02:03')}' = '${int('2')}'
  `,
  });
});
