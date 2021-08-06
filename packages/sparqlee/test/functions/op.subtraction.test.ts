import { error, merge, numeric } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import type { ITestTableConfigBase } from '../util/utils';
import { runTestTable } from '../util/utils';

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
    
      -3f 3i = -6f
    
       0i   INF = -INF
      -INF -12f = -INF
       3i  -INF =  INF
       INF -INF =  INF
      -INF  INF = -INF
    
      NaN    NaN    = NaN
      NaN    anyNum = NaN
      anyNum NaN    = NaN
    `,
    errorTable: `
      anyNum error  = ''
      error  anyNum = ''
      error  error  = 'Argument types not valid'
    `,
  });
});
