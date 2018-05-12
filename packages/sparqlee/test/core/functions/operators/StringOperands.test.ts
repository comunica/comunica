import * as RDFDM from 'rdf-data-model';

import * as C from '../../../../lib/util/Consts';
import { testTable, Notation } from '../../../util/TruthTable';

const CT = C.commonTerms;

const aliasMap = {
  true: C.TRUE_STR,
  false: C.FALSE_STR,
  error: C.EVB_ERR_STR,
  gener: '"generic-string"^^xsd:string',
  empty: '""^^xsd:string',
  aaa: '"aaa"^^xsd:string',
  bbb: '"bbb"^^xsd:string',
};

const resultMap = {
  true: CT.true,
  false: CT.false,
};

const errorTable = `
gener error = error
error gener = error
error error = error
`;

const _default = {aliasMap, errorTable,resultMap, arity: 2, notation: Notation.Infix};
function _testTable(op: string, table: string) {
  testTable({..._default, op, table});
}

// TODO: Decent collation testing
// https://www.w3.org/TR/xpath-functions/#collations
// https://www.w3.org/TR/xpath-functions/#func-compare
describe('the evaluation of overloaded boolean operators', () => {
  describe('with string operands', () => {
    describe('like "=" receiving', () => {
      const table = `
      empty empty = true
      empty aaa   = false
      aaa   aaa   = true
      aaa   bbb   = false
      `;
      _testTable('=', table);
    });

    describe('like "!=" receiving', () => {
      const table = `
      empty empty = false
      empty aaa   = true
      aaa   aaa   = false
      aaa   bbb   = true
      `;
      _testTable('!=', table);
    });

    describe('like "<" receiving', () => {
      const table = `
      empty empty = false
      empty aaa   = true
      aaa   empty = false
      aaa   aaa   = false
      aaa   bbb   = true
      bbb   aaa   = false
      `;
      _testTable('<', table);
    });

    describe('like ">" receiving', () => {
      const table = `
      empty empty = false
      empty aaa   = false
      aaa   empty = true
      aaa   aaa   = false
      aaa   bbb   = false
      bbb   aaa   = true
      `;
      _testTable('>', table);
    });

    describe('like <= receiving', () => {
      const table = `
      empty empty = true
      empty aaa   = true
      aaa   empty = false
      aaa   aaa   = true
      aaa   bbb   = true
      bbb   aaa   = false
      `;
      _testTable('<=', table);
    });

    describe('like >= receiving', () => {
      const table = `
      empty empty = true
      empty aaa   = false
      aaa   empty = true
      aaa   aaa   = true
      aaa   bbb   = false
      bbb   aaa   = true
      `;
      _testTable('>=', table);
    });
  });
});
