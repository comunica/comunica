import type * as RDF from '@rdfjs/types';
/**
 * Maps short strings to longer RDF term-literals for easy use in making test tables.
 * Ex: { 'true': '"true"^^xsd:boolean' }
 */
export type AliasMap = Record<string, string>;
export declare function merge(...maps: AliasMap[]): AliasMap;
/**
 * A list of default prefixes that are used by stringToTermPrefix and template
 */
export declare const defaultPrefixes: Record<string, string>;
/**
 * Converts a string to a rdf term. The string can contain a prefix that'll be
 * resolved with defaultPrefixes of the provided prefixes.
 * @param str
 * @param additionalPrefixes
 */
export declare function stringToTermPrefix(str: string, additionalPrefixes?: Record<string, string>): RDF.Term;
export declare function template(expr: string, additionalPrefixes?: Record<string, string>): string;
/**
 * Transform an int to rdf int:
 * '2' => "2"^^xsd:integer
 * @param value string (representing an int)
 */
export declare function int(value: string): string;
/**
 * '2.0' => "2.0"^^${dataType}
 * @param value string (representing a decimal)
 */
export declare function decimal(value: string): string;
/**
 * '123.456' => "123.456"^^xsd:double
 * @param value string (representing a decimal)
 */
export declare function double(value: string): string;
/**
 * '2001-10-26T21:32:52' => "2001-10-26T21:32:52"^^xsd:dateTime
 * @param value string (representing a date)
 */
export declare function dateTimeTyped(value: string): string;
/**
 * ''02:12:59'' => "'02:12:59'"^^xsd:time
 * @param value string (representing a date)
 */
export declare function timeTyped(value: string): string;
/**
 * ''2010-06-21'' => "'2010-06-21'"^^xsd:date
 * @param value string (representing a date)
 */
export declare function dateTyped(value: string): string;
/**
 * 'P1Y' => "P1Y"^^xsd:duration
 * @param value string (representing a duration)
 */
export declare function durationTyped(value: string): string;
/**
 * '-PT10H' => "-PT10H"^^xsd:dateTime
 * @param value string (representing a dayTimeDuration)
 */
export declare function dayTimeDurationTyped(value: string): string;
/**
 * 'P1Y' => "P1Y"^^xsd:yearMonthDuration
 * @param value string (representing a yearMonthDuration)
 */
export declare function yearMonthDurationTyped(value: string): string;
export declare function compactTermString(value: string, dataType: string): string;
export declare const bool: AliasMap;
export declare const error: AliasMap;
export declare const numeric: AliasMap;
export declare const dateTime: AliasMap;
export declare const str: AliasMap;
