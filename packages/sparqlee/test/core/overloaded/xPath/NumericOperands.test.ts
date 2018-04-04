import * as RDFDM from 'rdf-data-model';

import * as C from '../../../../lib/util/Consts';
import { IAliasMap, testTable } from '../../../util/TruthTable';

const CT = C.commonTerms;

const aliasMap = {
  'error': C.EVB_ERR_STR,
  'gener': '"13"^^xsd:integer',
  '3i': '"3"^^xsd:integer',
  '3d': '"3.0000"^^xsd:decimal',
  '3f': '"3.0"^^xsd:float',
  '-5i': '"-5"^^xsd:integer',
  '-5d': '"-5"^^xsd:decimal',
  '-5f': '"-1.25e2"^^xsd:float',
  'INF': '"INF"^^xsd:float',
  '-INF': '"-INF"^^xsd:float',
  'NaN': '"NaN"^^xsd:float',
  '-0f': '"-0"^^xsd:float',
  '0f': '"0"^^xsd:float',
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

const common = `
NaN   NaN   = false
NaN   gener = false
gener NaN   = false
`;

function _testTable(op: string, table: string) {
  testTable({ operator: op, table: table.concat(common), errorTable, aliasMap, resultMap }, 2);
}

describe('the evaluation of overloaded boolean operators', () => {
  describe('with numeric operands', () => {
    // INF, -INF, and NaN are valid float and double values

    // NaN = NaN according to https://www.w3.org/TR/xmlschema-2/#built-in-primitive-datatypes
    // But not according to https://www.w3.org/TR/xpath-functions/#func-numeric-equal
    describe('like "=" receiving', () => {
      const table = `
      3i 3i = true
      3d 3d = true
      3f 3f = true

      3i -5i = false
      3d -5d = false
      3f -5f = false

      3i 3f = true
      3i 3d = true
      3d 3f = true
      -0f 0f = true

      INF INF = true
      -INF -INF = true
      INF 3f = false
      3f INF = false
      INF NaN = false
      NaN NaN = false
      NaN 3f = false
      3f NaN = false
      `;
      _testTable('=', table);
    });

    describe.skip('like "!=" receiving', () => {
      const table = `
      3i 3i = false
      3d 3d = false
      3f 3f = false

      3i -5i = true
      3d -5d = true
      3f -5f = true

      3i 3f = false
      3i 3d = false
      3d 3f = false
      -0f 0f = false

      INF INF = false
      -INF -INF = false
      INF 3f = true
      3f INF = true
      INF NaN = true
      NaN NaN = true
      NaN 3f = true
      3f NaN = true
      `;
      _testTable('!=', table);
    });

    describe('like "<" receiving', () => {
      const table = `
      -5i 3i = true
      -5f 3f = true
      -5d 3d = true
      -5f 3i = true
      -5f 3d = true

      3i 3i = false
      3d 3d = false
      3f 3f = false

      3i -5i = false
      3d -5d = false
      3f -5f = false
      3i -5f = false
      3d -5f = false

      3i 3f = false
      3i 3d = false
      3d 3f = false
      -0f 0f = false

      INF INF = false
      -INF -INF = false
      INF 3f = false
      3f INF = true
      -INF 3f = true
      3f -INF = false

      INF NaN = false
      NaN NaN = false
      NaN 3f = false
      3f NaN = false
      `;
      _testTable('<', table);
    });

    describe('like ">" receiving', () => {
      const table = `
      -5i 3i = false
      -5f 3f = false
      -5d 3d = false
      -5f 3i = false
      -5f 3i = false

      3i 3i = false
      3d 3d = false
      3f 3f = false

      3i -5i = true
      3d -5d = true
      3f -5f = true
      3i -5f = true
      3d -5f = true

      3i 3f = false
      3i 3d = false
      3d 3f = false
      -0f 0f = false

      INF INF = false
      -INF -INF = false
      INF 3f = true
      3f INF = false
      -INF 3f = false
      3f -INF = true

      INF NaN = false
      NaN NaN = false
      NaN 3f = false
      3f NaN = false
      `;
      _testTable('>', table);
    });

    describe('like <= receiving', () => {
      const table = `
      -5i 3i = true
      -5f 3f = true
      -5d 3d = true
      -5f 3i = true
      -5f 3i = true

      3i 3i = true
      3d 3d = true
      3f 3f = true

      3i -5i = false
      3d -5d = false
      3f -5f = false
      3i -5f = false
      3d -5f = false

      3i 3f = true
      3i 3d = true
      3d 3f = true
      -0f 0f = true

      INF INF = true
      -INF -INF = true
      INF 3f = false
      3f INF = true
      -INF 3f = true
      3f -INF = false
      `;
      _testTable('<=', table);
    });

    describe('like >= receiving', () => {
      const table = `
      -5i 3i = false
      -5f 3f = false
      -5d 3d = false
      -5f 3i = false
      -5f 3i = false

      3i 3i = true
      3d 3d = true
      3f 3f = true

      3i -5i = true
      3d -5d = true
      3f -5f = true
      3i -5f = true
      3d -5f = true

      3i 3f = true
      3i 3d = true
      3d 3f = true
      -0f 0f = true

      INF INF = true
      -INF -INF = true
      INF 3f = true
      3f INF = false
      -INF 3f = false
      3f -INF = true
      `;
      _testTable('>=', table);
    });
  });
});
