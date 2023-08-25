import { dateTimeTyped, error, merge, numeric, yearMonthDurationTyped } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

const config: ITestTableConfigBase = {
  arity: 2,
  operation: '-',
  aliases: merge(numeric, error),
  notation: Notation.Infix,
};

describe('evaluation of \'-\' like', () => {
  runTestTable({
    ...config,
    testTable: `
      0i 0i = 0i
      1i 0i = 1i
      2i 1i = 1i
    
      -0f  0f  =  0f
      -1f  1f  = -2f
      -6f -12f =  6f
      -6i -12f =  6f
    
      -3f 3i = -6f
    
       0i   INF = -INF
      -INF -12f = -INF
       3i  -INF =  INF
       INF -INF =  INF
      -INF  INF = -INF
    
      NaN    NaN    = NaN
      NaN    anyNum = NaN
      anyNum NaN    = NaN
      
      '${dateTimeTyped('2019-05-28T12:14:45Z')}' '${yearMonthDurationTyped('P1Y1M')}' = '${dateTimeTyped('2018-04-28T12:14:45Z')}'
    `,
    errorTable: `
      anyNum invalidDateTime  = 'Argument types not valid'
      invalidDateTime  anyNum = 'Argument types not valid'
      invalidDateTime  invalidDateTime  = 'Invalid lexical form'
    `,
  });
});
