import { error, merge, numeric, wrap } from '../util/Aliases';
import { Notation, testTable } from '../util/TruthTable';

const config = {
  arity: 2,
  op: '/',
  aliases: merge(numeric, error),
  notation: Notation.Infix,
};

describe('evaluation of \'/\' like', () => {
  const table = `
  0i   1i  = 0d
  2i   1i  = 2d
  12i  6i  = 2d
  6i   INF = 0f
  6i  -INF = 0f

  -0f  -0f =  NaN
   1f  -1f = -1f
   12f  6f =  2f
  -3f   0f = -INF
   3f   0f =  INF

  INF -INF = NaN
  INF  0f  = INF
  0f  -INF = 0f

  NaN    NaN    = NaN
  NaN    anyNum = NaN
  anyNum NaN    = NaN
  `;

  const errorTable = `
  0i 0i = error
  3i 0i = error
  `;

  testTable({ ...wrap(config), table, errorTable });
});
