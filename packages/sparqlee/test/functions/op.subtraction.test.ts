import { error, merge, numeric, wrap } from '../util/Aliases';
import { Notation, testTable } from '../util/TruthTable';

const config = {
  arity: 2,
  op: '-',
  aliases: merge(numeric, error),
  notation: Notation.Infix,
};

describe('evaluation of \'-\' like', () => {
  const table = `
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
  `;

  const errorTable = `
  anyNum error  = error
  error  anyNum = error
  error  error  = error
  `;

  testTable({ ...wrap(config), table, errorTable });
});
