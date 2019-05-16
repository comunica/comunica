import * as RDF from 'rdf-js';
import { stringToTerm } from 'rdf-string';

import { EvaluationConfig, Notation } from './TruthTable';

export type StringMap = { [key: string]: string };
export type TermMap = { [key: string]: RDF.Term };

export function merge(...maps: StringMap[]): StringMap {
  return Object.assign({}, ...maps);
}

export interface NewEvaluationConfig {
  op: string;
  arity: number;
  aliases: StringMap;
  notation: Notation;
}

// Temp function, should remove later
// TODO
export function wrap(conf: NewEvaluationConfig): EvaluationConfig {
  const { op, arity, aliases, notation } = conf;
  const aliasMap = aliases;
  const resultMap = mapToTerm(aliases);
  return { op, arity, aliasMap, resultMap, notation };
}

function mapToTerm(map: StringMap): TermMap {
  return Object
    .keys(map)
    .reduce((p, k) => ({ ...p, [k]: stringToTermPrefix(map[k]) }), {});
}

export const prefixes: { [key: string]: string } = {
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
};

// tslint:disable-next-line: no-shadowed-variable
export function stringToTermPrefix(str: string): RDF.Term {
  const term = stringToTerm(str) as RDF.Literal;
  if (term.termType !== 'Literal') { return term; }
  if (!term.datatype) { return term; }

  const url = term.datatype.value;
  try {
    const prefix = url.match(/.*:/g)[0].slice(0, -1);
    term.datatype.value = url.replace(prefix + ':', prefixes[prefix]);
    return term;
  } catch (e) {
    return term;
  }
}

export const bool = {
  true: '"true"^^xsd:boolean',
  false: '"false"^^xsd:boolean',
  anyBool: '"true"^^xsd:boolean',
};

export const error = {
  error: '"not a dateTime"^^xsd:dateTime',
};

export const numeric = {
  'anyNum': '"14"^^xsd:integer',
  '0i': '"0"^^xsd:integer',
  '1i': '"1"^^xsd:integer',
  '2i': '"2"^^xsd:integer',
  '3i': '"3"^^xsd:integer',
  '4i': '"4"^^xsd:integer',
  '6i': '"6"^^xsd:integer',
  '12i': '"12"^^xsd:integer',
  '-5i': '"-5"^^xsd:integer',

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
  '-5f': '"-5"^^xsd:float',
  '-6f': '"-6"^^xsd:float',
  '-12f': '"-12"^^xsd:float',
  'NaN': '"NaN"^^xsd:float',
  'INF': '"INF"^^xsd:float',
  '-INF': '"-INF"^^xsd:float',

  '0d': '"0"^^xsd:decimal',
  '1d': '"1"^^xsd:decimal',
  '2d': '"2"^^xsd:decimal',
  '3d': '"3"^^xsd:decimal',
  '-5d': '"-5"^^xsd:decimal',
};

export const dateTime = {
  anyDate: '"2001-10-26T21:32:52"^^xsd:dateTime',
  earlyN: '"1999-03-17T06:00:00Z"^^xsd:dateTime',
  earlyZ: '"1999-03-17T10:00:00+04:00"^^xsd:dateTime',
  lateN: '"2002-04-02T17:00:00Z"^^xsd:dateTime',
  lateZ: '"2002-04-02T16:00:00-01:00"^^xsd:dateTime',
  edge1: '"1999-12-31T24:00:00"^^xsd:dateTime',
  edge2: '"2000-01-01T00:00:00"^^xsd:dateTime',
};

export const str = {
  anyStr: '"generic-string"^^xsd:string',
  empty: '""^^xsd:string',
  aaa: '"aaa"^^xsd:string',
  bbb: '"bbb"^^xsd:string',
};

export const strTemp = {
  simple: '"simple"',
  lang: '"lang"@en',
  string: '"string"^^xsd:string',
  number: '"3"^^xsd:integer',
  badlex: '"badlex"^^xsd:integer',
  uri: '<http://dbpedia.org/resource/Adventist_Heritage>',
  emptyString: '',

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

  xsdString: 'http://www.w3.org/2001/XMLSchema#string',
  xsdInt: 'http://www.w3.org/2001/XMLSchema#integer',
};

export const ebvCoercionTemp = {
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

export const langMatchesTemp = {
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
