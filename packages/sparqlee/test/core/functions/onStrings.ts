import * as RDFDM from 'rdf-data-model';

import * as C from '../../../lib/util/Consts';
import { testTable, Notation } from '../../util/TruthTable';

const CT = C.commonTerms;

const aliasMap = {
  simple: '"simple"',
  lang: '"lang"@en',
  string: '"string"^^xsd:string',
  number: '"3"^^xsd:integer',
  badlex: '"badlex"^^xsd:integer',
  error: C.EVB_ERR_STR,
};
const resultMap = {
  true: CT.true,
  false: CT.false,

  simple: RDFDM.literal('simple'),
  lang: RDFDM.literal('lang'),
  string: RDFDM.literal('string'),
  number: RDFDM.literal('3'),
  badlex: RDFDM.literal('badlex'),
  en: RDFDM.literal('en'),

  '4': RDFDM.literal('4', C.DataType.XSD_INTEGER),
  '5': RDFDM.literal('5', C.DataType.XSD_INTEGER),
  '6': RDFDM.literal('6', C.DataType.XSD_INTEGER),
  int: RDFDM.literal(C.DataType.XSD_INTEGER)
};


function _testTable(op: string, table: string, arity: number, notation: Notation = 'function') {
  if (arity === 1) {
    const errorTable = `
    error = error
    `;
    testTable({ op, table, errorTable, aliasMap, resultMap, notation }, arity);
  }
  if (arity === 2) {
    const errorTable = `
    error string = error
    string error = error
    error error = error
    `;
    testTable({ op, table, errorTable, aliasMap, resultMap, notation }, arity);
  }
}

describe('the evaluation of functions on strings', () => {
  describe('like \'strlen\' receiving', () => {
    const table = `
    simple = 6
    lang = 4
    string = 6
    `;
    _testTable('strlen', table, 1);
  });

  describe('like \'regex\' receiving', () => {
    const table = `
    simple simple = true
    string simple = false
    `
    _testTable('regex', table, 2);
  });
});
