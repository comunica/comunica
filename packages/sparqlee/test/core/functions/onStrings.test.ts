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

  4: RDFDM.literal('4', C.DataType.XSD_INTEGER),
  5: RDFDM.literal('5', C.DataType.XSD_INTEGER),
  6: RDFDM.literal('6', C.DataType.XSD_INTEGER),
  int: RDFDM.literal(C.DataType.XSD_INTEGER),
};

const _default = { aliasMap, resultMap, arity: 2, notation: Notation.Function };
function _testTable(op: string, table: string, arity: number) {
  const errorTable = (arity === 1)
    ? 'error = error'
    : `
      error string = error
      string error = error
      error error = error`;
  testTable({ ..._default, op, table, errorTable, arity });
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

  // TODO: Add errors for when non BCP47 strings are passed
  describe('like \'langMatches\' receiving', () => {
    const aliases = {
      'range': '"de-*-DE"',

      'de-DE': '"de-DE"',
      'de-de': '"de-de"',
      'de-Latn-DE': '"de-Latn-DE"',
      'de-Latf-DE': '"de-Latf-DE"',
      'de-DE-x-goethe': '"de-DE-x-goethe"',
      'de-Latn-DE-1996': '"de-Latn-DE-1996"',
      'de-Deva-DE': '"de-Deva-DE"',

      'de': '"de"',
      'de-X-DE': '"de-X-DE"',
      'de-Deva': '"de-Deva"',
    };
    const table = `
    de-DE range = true
    de-de range = true
    de-Latn-DE range = true
    de-Latf-DE range = true
    de-DE-x-goethe range = true
    de-Latn-DE-1996 range = true
    de-Deva-DE range = true

    de range = false
    de-X-DE range = false
    de-Deva range = false
    `;
    testTable({ ..._default, op: 'langmatches', aliasMap: aliases, table });
  });

  describe('like \'regex\' receiving', () => {
    const table = `
    simple simple = true
    string simple = false
    `;
    _testTable('regex', table, 2);
  });
});
