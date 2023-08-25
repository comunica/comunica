import { dateTyped, int } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'YEAR\'', () => {
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'YEAR',
    testTable: `
    '${dateTyped('2010-06-21Z')}' = '${int('2010')}'
    '${dateTyped('2010-12-21-08:00')}' = '${int('2010')}'
    '${dateTyped('2008-06-20Z')}' = '${int('2008')}'
    '${dateTyped('2011-02-01')}' = '${int('2011')}'
  `,
  });
});
