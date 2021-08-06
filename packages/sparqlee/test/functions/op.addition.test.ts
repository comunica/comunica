import { numeric } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';

describe('evaluation of \'+\' like', () => {
  runTestTable({
    arity: 2,
    operation: '+',
    aliases: numeric,
    notation: Notation.Infix,
    testTable: `
      0i 0i = 0i
      0i 1i = 1i
      1i 2i = 3i
    
      -0f -0f =  0f
      -0f -1f = -1f
      -1f -2f = -3f
    
       2i -1f = 1f
    
      -12f  INF =  INF
      -INF -12f = -INF
      -INF -INF = -INF
       INF  INF =  INF
       INF -INF =  NaN
    
      NaN    NaN    = NaN
      NaN    anyNum = NaN
      anyNum NaN    = NaN
    `,
  });
});
