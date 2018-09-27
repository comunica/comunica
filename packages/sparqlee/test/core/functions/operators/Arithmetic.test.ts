import * as RDFDM from '@rdfjs/data-model';

import * as C from '../../../../lib/util/Consts';
import { AliasMap, Notation, testTable } from '../../../util/TruthTable';

const CT = C.commonTerms;
const D = C.DataType;

const aliasMap = {
  'error': C.EVB_ERR_STR,
  'gener': '"14"^^xsd:integer',
  '0i': '"0"^^xsd:integer',
  '1i': '"1"^^xsd:integer',
  '2i': '"2"^^xsd:integer',
  '3i': '"3"^^xsd:integer',
  '4i': '"4"^^xsd:integer',
  '6i': '"6"^^xsd:integer',
  '12i': '"12"^^xsd:integer',
  '0f': '"0"^^xsd:float',
  '1f': '"1"^^xsd:float',
  '2f': '"2"^^xsd:float',
  '3f': '"3"^^xsd:float',
  '4f': '"4"^^xsd:float',
  '6f': '"6"^^xsd:float',
  '12f': '"12"^^xsd:float',
  '-0f': '"-0"^^xsd:float',
  '-1f': '"-1"^^xsd:float',
  '-2f': '"-2"^^xsd:float',
  '-3f': '"-3"^^xsd:float',
  '-4f': '"-4"^^xsd:float',
  '-6f': '"-6"^^xsd:float',
  '-12f': '"-12"^^xsd:float',
  'NaN': '"NaN"^^xsd:float',
  'INF': '"INF"^^xsd:float',
  '-INF': '"-INF"^^xsd:float',
};

const resultMap = {
  '0i': RDFDM.literal('0', C.make(D.XSD_INTEGER)),
  '1i': RDFDM.literal('1', C.make(D.XSD_INTEGER)),
  '2i': RDFDM.literal('2', C.make(D.XSD_INTEGER)),
  '3i': RDFDM.literal('3', C.make(D.XSD_INTEGER)),
  '4i': RDFDM.literal('4', C.make(D.XSD_INTEGER)),
  '6i': RDFDM.literal('6', C.make(D.XSD_INTEGER)),
  '12i': RDFDM.literal('12', C.make(D.XSD_INTEGER)),
  '0f': RDFDM.literal('0', C.make(D.XSD_FLOAT)),
  '1f': RDFDM.literal('1', C.make(D.XSD_FLOAT)),
  '2f': RDFDM.literal('2', C.make(D.XSD_FLOAT)),
  '3f': RDFDM.literal('3', C.make(D.XSD_FLOAT)),
  '4f': RDFDM.literal('4', C.make(D.XSD_FLOAT)),
  '6f': RDFDM.literal('6', C.make(D.XSD_FLOAT)),
  '12f': RDFDM.literal('12', C.make(D.XSD_FLOAT)),
  '-0f': RDFDM.literal('-0', C.make(D.XSD_FLOAT)),
  '-1f': RDFDM.literal('-1', C.make(D.XSD_FLOAT)),
  '-2f': RDFDM.literal('-2', C.make(D.XSD_FLOAT)),
  '-3f': RDFDM.literal('-3', C.make(D.XSD_FLOAT)),
  '-4f': RDFDM.literal('-4', C.make(D.XSD_FLOAT)),
  '-6f': RDFDM.literal('-6', C.make(D.XSD_FLOAT)),
  '-12f': RDFDM.literal('-12', C.make(D.XSD_FLOAT)),
  'NaN': RDFDM.literal('NaN', C.make(D.XSD_FLOAT)),
  'INF': RDFDM.literal('INF', C.make(D.XSD_FLOAT)),
  '-INF': RDFDM.literal('-INF', C.make(D.XSD_FLOAT)),
  '0d': RDFDM.literal('0', C.make(D.XSD_DECIMAL)),
  '1d': RDFDM.literal('1', C.make(D.XSD_DECIMAL)),
  '2d': RDFDM.literal('2', C.make(D.XSD_DECIMAL)),
};

const errorTable = `
gener error = error
error gener = error
error error = error
`;

const common = `
NaN   NaN   = NaN
NaN   gener = NaN
gener NaN   = NaN
`;

const _default = { aliasMap, errorTable, resultMap, arity: 2, notation: Notation.Infix };
function _testTable(op: string, table: string, errTable: string = errorTable) {
  testTable({ ..._default, op, table: table.concat(common), errorTable: errTable });
}

// TODO Add tests for derivative types
describe('evaluation of arithmetic operators', () => {
  describe('like \'*\' receiving', () => {
    const table = `
    0i 0i = 0i
    0i 1i = 0i
    1i 2i = 2i
    3i 4i = 12i

    -0f -0f = 0f
    -0f -1f = 0f
    -1f -2f = 2f
    -3f 4f = -12f
    2f 6f = 12f

    0f INF = NaN
    -INF 0i = NaN
    INF -INF = -INF
    3i INF = INF
    -INF 6f = -INF
    -INF -3f = INF
    `;
    _testTable('*', table);
  });

  describe('like \'/\' receiving', () => {
    const table = `
    0i 1i = 0d
    2i 1i = 2d
    12i 6i = 2d
    6i INF = 0f
    6i -INF = 0f

    -0f -0f = NaN
    1f -1f = -1f
    12f 6f = 2f
    -3f 0f = -INF
    3f 0f = INF

    INF -INF = NaN
    INF 0f = INF
    0f -INF = 0f
    `;

    const errTable = `
    0i 0i = error
    3i 0i = error
    `;
    _testTable('/', table, errorTable.concat(errTable));
  });

  describe('like \'+\' receiving', () => {
    const table = `
    0i 0i = 0i
    0i 1i = 1i
    1i 2i = 3i

    -0f -0f = 0f
    -0f -1f = -1f
    -1f -2f = -3f

    2i -1f = 1f

    -12f INF = INF
    -INF -12f = -INF
    -INF -INF = -INF
    INF INF = INF
    INF -INF = NaN
    `;
    _testTable('+', table);
  });

  describe('like \'-\' receiving', () => {
    const table = `
    0i 0i = 0i
    1i 0i = 1i
    2i 1i = 1i

    -0f 0f = 0f
    -1f 1f = -2f
    -6f -12f = 6f

    -3f 3i = -6f

    0i INF = -INF
    -INF -12f = -INF
    3i -INF = INF
    INF -INF = INF
    -INF INF = -INF
    `;
    _testTable('-', table);
  });

});
