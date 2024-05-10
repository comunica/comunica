import { dateTimeTyped, dateTyped, int } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluation of \'YEAR\'', () => {
  runFuncTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'YEAR',
    testTable: `
    '${dateTyped('2010-06-21Z')}' = '${int('2010')}'
    '${dateTyped('2010-12-21-08:00')}' = '${int('2010')}'
    '${dateTyped('2008-06-20Z')}' = '${int('2008')}'
    '${dateTyped('2011-02-01')}' = '${int('2011')}'
    '${dateTimeTyped('1954-01-01T00:00:00Z')}' = '${int('1954')}'
  `,
  });
});
