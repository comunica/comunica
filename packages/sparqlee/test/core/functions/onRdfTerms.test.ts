import * as RDFDM from '@rdfjs/data-model';

import * as C from '../../../lib/util/Consts';
import { Notation, testTable } from '../../util/TruthTable';

const CT = C.commonTerms;

const aliasMap = {
  simple: '"simple"',
  lang: '"lang"@en',
  string: '"string"^^xsd:string',
  number: '"3"^^xsd:integer',
  badlex: '"badlex"^^xsd:integer',
  uri: '<http://dbpedia.org/resource/Adventist_Heritage>',
};
const resultMap = {
  simple: RDFDM.literal('simple'),
  lang: RDFDM.literal('lang'),
  number: RDFDM.literal('3'),
  string: RDFDM.literal('string'),
  badlex: RDFDM.literal('badlex'),
  en: RDFDM.literal('en'),
  xsdInt: RDFDM.literal(C.TypeURL.XSD_INTEGER),
  xsdString: RDFDM.literal(C.TypeURL.XSD_STRING),
  emptyString: RDFDM.literal(''),
  uri: RDFDM.literal('http://dbpedia.org/resource/Adventist_Heritage'),
};

const _default = { aliasMap, resultMap, arity: 1, notation: Notation.Function };
function _testTable(op: string, table: string) {
  testTable({ ..._default, op, table });
}

describe('the evaluation of functions on RDF terms', () => {
  describe('like \'str\' receiving', () => {
    const table = `
    simple = simple
    lang = lang
    number = number
    badlex = badlex
    string = string
    uri = uri
    `;
    _testTable('str', table);
  });

  describe('like \'lang\' receiving', () => {
    const table = `
    lang = en
    simple = emptyString
    `;
    _testTable('lang', table);
  });
  describe('like \'datatype\' receiving', () => {
    const table = `
    number = xsdInt
    string = xsdString
    `;
    _testTable('datatype', table);
  });
});

// https://www.w3.org/TR/sparql11-query/#ebv
describe('the coercion of RDF terms to it\'s EBV', () => {
  const results = { true: CT.true, false: CT.false };
  const aliases = {
    true: C.TRUE_STR,
    false: C.FALSE_STR,

    nonLexicalBool: '"notABool"^^xsd:boolean',
    nonLexicalInt: '"notAnInt"^^xsd:integer',
    boolFalse: '"false"^^xsd:boolean',
    boolTrue: '"true"^^xsd:boolean',

    zeroSimple: '""',
    zeroLang: '""@en',
    zeroStr: '""^^xsd:string',
    nonZeroSimple: '"a simple literal"',
    nonZeroLang: '"a language literal"@en',
    nonZeroStr: '"a string with datatype"^^xsd:string',

    zeroInt: '"0"^^xsd:integer',
    zeroDouble: '"0.0"^^xsd:double',
    zeroDerived: '"0"^^xsd:unsignedInt',
    nonZeroInt: '"3"^^xsd:integer',
    nonZeroDouble: '"0.01667"^^xsd:double',
    nonZeroDerived: '"1"^^xsd:unsignedInt',
    infPos: '"INF"^^xsd:double',
    infNeg: '"-INF"^^xsd:float',
    NaN: '"NaN"^^xsd:float',

    date: '"2001-10-26T21:32:52+02:00"^^xsd:dateTime',
    unbound: '?a',
    uri: '<http://dbpedia.org/resource/Adventist_Heritage>',
  };
  describe('like', () => {
    // Using && as utility to force EBV
    const table = `
    nonLexicalBool true = false
    nonLexicalInt true = false

    boolFalse true = false
    boolTrue true = true

    zeroSimple true = false
    zeroLang true = false
    zeroStr true = false
    nonZeroSimple true = true
    nonZeroLang true = true

    zeroInt true = false
    zeroDouble true = false
    zeroDerived true = false
    nonZeroInt true = true
    nonZeroDouble true = true
    nonZeroDerived true = true
    infPos true = true
    infNeg true = true
    NaN true = false
    `;
    const errorTable = `
    unbound true = error
    date true = error
    uri true = error
    `;
    testTable({
      ..._default,
      op: '&&',
      arity: 2,
      table,
      errorTable,
      resultMap: results,
      aliasMap: aliases,
      notation: Notation.Infix,
    });
  });
});
