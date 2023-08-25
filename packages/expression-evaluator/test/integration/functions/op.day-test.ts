import { dateTyped, int } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'DAY\'', () => {
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'DAY',
    testTable: `
    '${dateTyped('2010-06-21Z')}' = '${int('21')}'
    '${dateTyped('2010-12-21-08:00')}' = '${int('21')}'
    '${dateTyped('2008-06-20Z')}' = '${int('20')}'
    '${dateTyped('2011-02-01')}' = '${int('1')}'
  `,
  });
});
