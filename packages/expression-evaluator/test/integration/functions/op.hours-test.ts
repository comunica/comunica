import { int, timeTyped } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'HOURS\'', () => {
  runTestTable({
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
