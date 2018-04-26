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
};
const resultMap = {
  simple: RDFDM.literal('simple'),
  lang: RDFDM.literal('lang'),
  number: RDFDM.literal('3'),
  string: RDFDM.literal('string'),
  badlex: RDFDM.literal('badlex'),
  en: RDFDM.literal('en'),
  xsdInt: RDFDM.literal(C.DataType.XSD_INTEGER),
  xsdString: RDFDM.literal(C.DataType.XSD_STRING),
};

const errorTable = ``;

function _testTable(op: string, table: string, notation: Notation = 'function') {
  testTable({ op, table, errorTable, aliasMap, resultMap, notation }, 1);
}

describe('the evaluation of functions on RDF terms', () => {
  describe('like \'str\' receiving', () => {
    const table = `
    simple = simple
    lang = lang
    number = number
    badlex = badlex
    string = string
    `;
    _testTable('str', table);
  });

  describe('like \'lang\' receiving', () => {
    const table = `
    lang = en
    `
    _testTable('lang', table);
  });
  describe('like \' datatype\' receiving', () => {
    const table = `
    number = xsdInt
    string = xsdString
    `
    _testTable('datatype', table);
  });
});
