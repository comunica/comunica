import { UnimplementedError } from '../../util/Errors';
import * as E from '../Expressions';

// ----------------------------------------------------------------------------
// Arithmetic
// ----------------------------------------------------------------------------

export function numericMultiply(left: number, right: number) {
  return left * right;
}

export function numericDivide(left: number, right: number) {
  return left / right;
}

export function numericAdd(left: number, right: number) {
  return left + right;
}

export function numericSubtract(left: number, right: number) {
  return left - right;
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

// Equal ---------------------------------------------------------------------

export function numericEqual(left: number, right: number) {
  return left === right;
}

export function booleanEqual(left: boolean, right: boolean) {
  return left === right;
}

export function dateTimeEqual(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}

// Less Than ------------------------------------------------------------------

export function numericLessThan(left: number, right: number) {
  return left < right;
}

export function booleanLessThan(left: boolean, right: boolean) {
  return left < right;
}

export function dateTimeLessThan(left: Date, right: Date): boolean {
  return left.getTime() < right.getTime();
}

// Greater Than

export function numericGreaterThan(left: number, right: number) {
  return left > right;
}

export function booleanGreaterThan(left: boolean, right: boolean) {
  return left > right;
}

export function dateTimeGreaterThan(left: Date, right: Date): boolean {
  return left.getTime() > right.getTime();
}

// ----------------------------------------------------------------------------
// On Strings
// ----------------------------------------------------------------------------
export function stringLength(val: string): number {
  return val.length;
}

export function matches(text: string, pattern: string, flags?: string): boolean {
  // TODO
  return !!text.match(pattern);
}

// TODO: Not an XPath function
// https://www.ietf.org/rfc/rfc4647.txt
// https://www.w3.org/TR/sparql11-query/#func-langMatches
export function langMatches(tag: string, range: string): boolean {
  const langTags = tag.split('-');
  const rangeTags = range.split('-');

  if (!_matchLangTag(rangeTags[0], langTags[0])
    && !_isWildCard(langTags[0])) { return false; }

  let lI = 1;
  let rI = 1;
  while (rI < rangeTags.length) {
    if (_isWildCard(rangeTags[rI])) { rI++; continue; }
    if (lI === langTags.length) { return false; }
    if (_matchLangTag(rangeTags[rI], langTags[lI])) { lI++; rI++; continue; }
    if (langTags[lI].length === 1) { return false; }
    lI++;
  }
  return true;
}

function _isWildCard(tag: string): boolean {
  return tag === '*';
}

function _matchLangTag(left: string, right: string): boolean {
  const matchInitial = new RegExp(`/${left}/`, 'i');
  return matchInitial.test(`/${right}/`);
}

// ----------------------------------------------------------------------------
// Varia
// ----------------------------------------------------------------------------

export function compare(left: string, right: string) {
  return left.localeCompare(right);
}

export function str<T>(lit: E.Literal<T>) {
  return lit.strValue || lit.typedValue.toString();
}
