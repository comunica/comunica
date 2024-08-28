import { dateTyped, int } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../../../bus-function-factory/test/util';

describe('evaluation of \'DAY\'', () => {
  runFuncTestTable({
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
