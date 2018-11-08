import { error, merge, numeric, wrap } from '../util/Aliases';
import { Notation, testTable } from '../util/TruthTable';

const config = {
  arity: 2,
  op: '+',
  aliases: merge(numeric),
  notation: Notation.Infix,
};

describe('evaluation of \'+\' like', () => {
  const table = `
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
  `;

  testTable({ ...wrap(config), table });
});
