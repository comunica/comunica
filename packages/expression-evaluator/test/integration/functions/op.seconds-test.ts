import { int, timeTyped } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'SECONDS\'', () => {
  runTestTable({
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
