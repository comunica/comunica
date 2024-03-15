import type * as RDF from '@rdfjs/types';
import { stringToTerm } from 'rdf-string';

/**
 * Maps short strings to longer RDF term-literals for easy use in making test tables.
 * Ex: { 'true': '"true"^^xsd:boolean' }
  */
export type AliasMap = Record<string, string>;

export function merge(...maps: AliasMap[]): AliasMap {
  return Object.assign({}, ...maps);
}

/**
 * A list of default prefixes that are used by stringToTermPrefix and template
 */
export const defaultPrefixes: Record<string, string> = {
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
  fn: 'https://www.w3.org/TR/xpath-functions#',
  er: 'http://www.w3.org/2005/xqt-errors#',
  example: 'https://example.org/',
};

/**
 * Converts a string to a rdf term. The string can contain a prefix that'll be
 * resolved with defaultPrefixes of the provided prefixes.
 * @param str
 * @param additionalPrefixes
 */
export function stringToTermPrefix(str: string, additionalPrefixes?: Record<string, string>): RDF.Term {
  const term = <RDF.Literal> stringToTerm(str);
  if (term.termType !== 'Literal') { return term; }
  if (!term.datatype) { return term; }

  const url = term.datatype.value;
  try {
    const matched = url.match(/.*:/ug);
    const prefix = matched ? matched[0].slice(0, -1) : '';
    const prefixes: Record<string, string> = additionalPrefixes ?
      { ...defaultPrefixes, ...additionalPrefixes } :
      defaultPrefixes;
    if (prefixes[prefix]) {
      term.datatype.value = url.replace(`${prefix}:`, prefixes[prefix]);
    }
    return term;
  } catch {
    return term;
  }
}

export function template(expr: string, additionalPrefixes?: Record<string, string>) {
  const prefixRecord = additionalPrefixes ? { ...defaultPrefixes, ...additionalPrefixes } : defaultPrefixes;
  const prefix = Object.entries(prefixRecord).map(([ pref, full ]) =>
    `PREFIX ${pref.endsWith(':') ? pref : `${pref}:`} <${full}>`).join('\n');
  return `
${prefix}

SELECT * WHERE { ?s ?p ?o FILTER (${expr})}
`;
}

/**
 * Transform an int to rdf int:
 * '2' => "2"^^xsd:integer
 * @param value string (representing an int)
 */
export function int(value: string): string {
  return compactTermString(value, 'xsd:integer');
}

/**
 * '2.0' => "2.0"^^${dataType}
 * @param value string (representing a decimal)
 */
export function decimal(value: string): string {
  return compactTermString(value, 'xsd:decimal');
}

/**
 * '123.456' => "123.456"^^xsd:double
 * @param value string (representing a decimal)
 */
export function double(value: string): string {
  return compactTermString(value, 'xsd:double');
}

/**
 * '2001-10-26T21:32:52' => "2001-10-26T21:32:52"^^xsd:dateTime
 * @param value string (representing a date)
 */
export function dateTimeTyped(value: string): string {
  return compactTermString(value, 'xsd:dateTime');
}

/**
 * ''02:12:59'' => "'02:12:59'"^^xsd:time
 * @param value string (representing a date)
 */
export function timeTyped(value: string): string {
  return compactTermString(value, 'xsd:time');
}

/**
 * ''2010-06-21'' => "'2010-06-21'"^^xsd:date
 * @param value string (representing a date)
 */
export function dateTyped(value: string): string {
  return compactTermString(value, 'xsd:date');
}

/**
 * 'P1Y' => "P1Y"^^xsd:duration
 * @param value string (representing a duration)
 */
export function durationTyped(value: string): string {
  return compactTermString(value, 'xsd:duration');
}

/**
 * '-PT10H' => "-PT10H"^^xsd:dateTime
 * @param value string (representing a dayTimeDuration)
 */
export function dayTimeDurationTyped(value: string): string {
  return compactTermString(value, 'xsd:dayTimeDuration');
}

/**
 * 'P1Y' => "P1Y"^^xsd:yearMonthDuration
 * @param value string (representing a yearMonthDuration)
 */
export function yearMonthDurationTyped(value: string): string {
  return compactTermString(value, 'xsd:yearMonthDuration');
}

export function compactTermString(value: string, dataType: string): string {
  return `"${value}"^^${dataType}`;
}

export const bool: AliasMap = {
  true: '"true"^^xsd:boolean',
  false: '"false"^^xsd:boolean',
  anyBool: '"true"^^xsd:boolean',
};

export const error: AliasMap = {
  invalidDateTime: '"not a dateTime"^^xsd:dateTime',
  invalidBool: '"not a boolean"^^xsd:boolean',
  invalidInt: '"not an integer"^^xsd:integer',
  invalidShort: '"not a short"^^xsd:short',
};

export const numeric: AliasMap = {
  anyNum: '"14"^^xsd:integer',
  '0i': '"0"^^xsd:integer',
  '1i': '"1"^^xsd:integer',
  '2i': '"2"^^xsd:integer',
  '3i': '"3"^^xsd:integer',
  '4i': '"4"^^xsd:integer',
  '6i': '"6"^^xsd:integer',
  '-6i': '"-6"^^xsd:integer',
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
  NaN: '"NaN"^^xsd:float',
  INF: '"INF"^^xsd:float',
  NaNd: '"NaN"^^xsd:double',
  '-INF': '"-INF"^^xsd:float',

  '0d': '"0"^^xsd:decimal',
  '1d': '"1"^^xsd:decimal',
  '2d': '"2"^^xsd:decimal',
  '3d': '"3"^^xsd:decimal',
  '-5d': '"-5"^^xsd:decimal',
};

export const dateTime: AliasMap = {
  anyDate: '"2001-10-26T21:32:52"^^xsd:dateTime',
  earlyN: '"1999-03-17T06:00:00Z"^^xsd:dateTime',
  earlyZ: '"1999-03-17T10:00:00+04:00"^^xsd:dateTime',
  lateN: '"2002-04-02T17:00:00Z"^^xsd:dateTime',
  lateZ: '"2002-04-02T16:00:00-01:00"^^xsd:dateTime',
  edge1: '"1999-12-31T24:00:00"^^xsd:dateTime',
  edge2: '"2000-01-01T00:00:00"^^xsd:dateTime',
};

export const str: AliasMap = {
  anyStr: '"generic-string"^^xsd:string',
  empty: '""^^xsd:string',
  aaa: '"aaa"^^xsd:string',
  bbb: '"bbb"^^xsd:string',
};
