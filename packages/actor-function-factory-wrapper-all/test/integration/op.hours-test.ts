import { int, timeTyped } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../../../bus-function-factory/test/util';

describe('evaluation of \'HOURS\'', () => {
  runFuncTestTable({
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
