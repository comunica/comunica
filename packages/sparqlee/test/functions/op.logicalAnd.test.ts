import { bool, error, merge, wrap } from '../util/Aliases';

import { Notation, testTable } from '../util/TruthTable';

const config = {
  op: '&&',
  arity: 2,
  aliases: merge(bool, error),
  notation: Notation.Infix,
};

describe('evaluation of "&&" like', () => {
  const table = `
  true  true  = true
  true  false = false
  false true  = false
  false false = false
  false error = false
  error false = false
  `;

  const errorTable = `
  true  error = error
  error true  = error
  error error = error
  `;

  testTable({ ...wrap(config), table, errorTable });
});
