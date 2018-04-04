import * as RDFDM from 'rdf-data-model';

import * as C from '../../../lib/util/Consts';
import { testTable } from '../../util/TruthTable';

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

function _testTable(op: string, table: string, errorTable: string) {
  testTable({ operator: op, table, errorTable, aliasMap, resultMap }, 2);
}

// TODO: Test use of EVB
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

    const errTable = `
    false error = error
    error false = error
    error error = error
    `;

    _testTable('||', table, errTable);
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

    const errTable = `
    true  error = error
    error true  = error
    error error = error
    `;

    _testTable('&&', table, errTable);
  });
});
