import { dateTyped, timeTyped } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'TZ\'', () => {
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'TZ',
    testTable: `
    '${dateTyped('2010-06-21Z')}' = "Z"
    '${dateTyped('2010-12-21-08:00')}' = "-08:00"
    '${dateTyped('2008-06-20Z')}' = "Z"
    '${dateTyped('2011-02-01')}' = ""
    
    '${timeTyped('11:28:01Z')}' = "Z"
    '${timeTyped('15:38:02-08:00')}' = "-08:00"
    '${timeTyped('23:59:00Z')}' = "Z"
    '${timeTyped('01:02:03')}' = ""
  `,
  });
});
