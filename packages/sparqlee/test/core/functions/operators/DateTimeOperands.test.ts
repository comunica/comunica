import * as RDFDM from 'rdf-data-model';

import * as C from '../../../../lib/util/Consts';
import { Notation, testTable } from '../../../util/TruthTable';

const CT = C.commonTerms;

const aliasMap = {
  true: C.TRUE_STR,
  false: C.FALSE_STR,
  error: C.EVB_ERR_STR,
  gener: '"2001-10-26T21:32:52"^^xsd:dateTime',
  earlyN: '"1999-03-17T06:00:00Z"^^xsd:dateTime',
  earlyZ: '"1999-03-17T10:00:00+04:00"^^xsd:dateTime',
  lateN: '"2002-04-02T17:00:00Z"^^xsd:dateTime',
  lateZ: '"2002-04-02T16:00:00-01:00"^^xsd:dateTime',
  edge1: '"1999-12-31T24:00:00"^^xsd:dateTime',
  edge2: '"2000-01-01T00:00:00"^^xsd:dateTime',
};
const resultMap = {
  true: CT.true,
  false: CT.false,
};

// Default error handling for boolean operators
const errorTable = `
gener error = error
error gener = error
error error = error
`;

const _default = { aliasMap, resultMap, errorTable, notation: Notation.Infix, arity: 2 };
function _testTable(op: string, table: string) {
  testTable({ ..._default, op, table });
}

// TODO: Decent collation testing
// https://www.w3.org/TR/xpath-functions/#collations
// https://www.w3.org/TR/xpath-functions/#func-compare
describe('the evaluation of overloaded boolean operators', () => {
  describe('with datetime operands', () => {
    describe('like "=" receiving', () => {
      const table = `
      earlyN earlyZ = true
      earlyN earlyN = true
      earlyZ earlyZ = true

      earlyN lateN  = false
      earlyN lateZ  = false
      earlyZ lateZ  = false
      earlyZ lateN  = false

      edge1 edge2   = true
      `;
      _testTable('=', table);
    });

    describe('like "!=" receiving', () => {
      const table = `
      earlyN earlyZ = false
      earlyN earlyN = false
      earlyZ earlyZ = false

      earlyN lateN  = true
      earlyN lateZ  = true
      earlyZ lateZ  = true
      earlyZ lateN  = true

      edge1 edge2   = false
      `;
      _testTable('!=', table);
    });

    describe('like "<" receiving', () => {
      const table = `
      earlyN earlyZ = false
      earlyN earlyN = false
      earlyZ earlyZ = false

      earlyN lateN  = true
      earlyN lateZ  = true
      earlyZ lateZ  = true
      earlyZ lateN  = true

      lateN earlyN  = false
      lateN earlyZ  = false
      lateZ earlyN  = false
      lateZ earlyZ  = false

      edge1 edge2   = false
      `;
      _testTable('<', table);
    });

    describe('like ">" receiving', () => {
      const table = `
      earlyN earlyZ = false
      earlyN earlyN = false
      earlyZ earlyZ = false

      earlyN lateN  = false
      earlyN lateZ  = false
      earlyZ lateZ  = false
      earlyZ lateN  = false

      lateN earlyN  = true
      lateN earlyZ  = true
      lateZ earlyN  = true
      lateZ earlyZ  = true

      edge1 edge2   = false
      `;
      _testTable('>', table);
    });

    describe('like <= receiving', () => {
      const table = `
      earlyN earlyZ = true
      earlyN earlyN = true
      earlyZ earlyZ = true

      earlyN lateN  = true
      earlyN lateZ  = true
      earlyZ lateZ  = true
      earlyZ lateN  = true

      lateN earlyN  = false
      lateN earlyZ  = false
      lateZ earlyN  = false
      lateZ earlyZ  = false

      edge1 edge2   = true
      `;
      _testTable('<=', table);
    });

    describe('like >= receiving', () => {
      const table = `
      earlyN earlyZ = true
      earlyN earlyN = true
      earlyZ earlyZ = true

      earlyN lateN  = false
      earlyN lateZ  = false
      earlyZ lateZ  = false
      earlyZ lateN  = false

      lateN earlyN  = true
      lateN earlyZ  = true
      lateZ earlyN  = true
      lateZ earlyZ  = true

      edge1 edge2   = true
      `;
      _testTable('>=', table);
    });
  });
});
