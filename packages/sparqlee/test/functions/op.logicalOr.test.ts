import { bool, error, merge, wrap } from '../util/Aliases';

import { Notation, testTable } from '../util/TruthTable';

const config = {
  op: '||',
  arity: 2,
  aliases: merge(bool, error),
  notation: Notation.Infix,
};

describe('evaluation of "||" like', () => {
  const table = `
  true  true  = true
  true  false = true
  false true  = true
  false false = false
  true  error = true
  error true  = true
  `;

  const errorTable = `
  false error = error
  error false = error
  error error = error
  `;

  testTable({ ...wrap(config), table, errorTable });
});
