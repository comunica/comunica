import * as RDFDM from 'rdf-data-model';

import * as C from '../../../../lib/util/Consts';
import { testTable, Notation } from '../../../util/TruthTable';

const CT = C.commonTerms;

const aliasMap = {
  true: C.TRUE_STR,
  false: C.FALSE_STR,
  error: C.EVB_ERR_STR,
};

const resultMap = {
  true: CT.true,
  false: CT.false,
};

const _default = { arity: 2, aliasMap, resultMap, notation: Notation.Infix };

describe('evaluation of logical connectives', () => {
  describe('like "||" receiving', () => {
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
    testTable({op: '||', ..._default, table, errorTable});
  });

  describe('like "&&" receiving', () => {
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
    testTable({op: '&&', ..._default, table, errorTable});
  });
});
