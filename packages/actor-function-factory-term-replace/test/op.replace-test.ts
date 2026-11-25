import {
  runFuncTestTable,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermReplace } from '../lib';
import { TermFunctionReplace } from '../lib/TermFunctionReplace';

describe('evaluation of \'replace\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermReplace(args),
    ],
    arity: 'vary',
    operation: 'replace',
    notation: Notation.Function,
    // Parts from: https://www.w3.org/TR/xpath-functions/#flags
    testTable: `
      "baaab" "a+" "c" = "bcb"
      "bAAAb" "a+" "c" = "bAAAb"
      "bAAAb" "a+" "c" "i" = "bcb"
      "baaab"@en "a+" "c" = "bcb"@en
      "bAAAb"@en "a+" "c" "i" = "bcb"@en
      "baaab"@en--ltr "a+" "c" = "bcb"@en--ltr
      "bAAAb"@en--rtl "a+" "c" "i" = "bcb"@en--rtl

      "apple" "apple" '"$0 $0"' = '"apple apple"'
      "abcde" "(a)(b)(c)?(d)(e)" '"$1$2$3$4$5"' = '"abcde"'
      "abde" "(a)(b)(c)?(d)(e)" '"$1$2$3$4$5"' = '"abde"'
      '"abc"' '"(a)(b)c"' '"$13"' = '"a3"'
      "abcdefghijklmno" "(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)(l)(m)(n)(o)" '"$1$2$3$4$5$6$7$8$9$10$11$12$13$14$15"' = '"abcdefghijklmno"'

      '"a\\\\b\\\\c"' '"\\\\"' '"\\\\\\\\"'  '"q"' = '"a\\\\b\\\\c"'
      '"a/b/c"' '"/"' '"$"' '"q"' = '"a$b$c"'
      '"(a/b)/c"' '"/"' '"$1"' '"q"' = '"(a$1b)$1c"'
      '"(a/b)/c"' '"/"' '"$0"' '"q"' = '"(a$0b)$0c"'
      '"helloworld"' '"hello world"' '"apple'" '"x"' = '"apple"'
      '"helloworld"' '"hello[ ]world"' '"apple"' '"x"' = '"helloworld"'
      '"hello world"' '"hello\\\\ sworld"' '"apple"' '"x"' = '"apple"'
      '"hello world"' '"hello world"' '"apple"' '"x"' = '"hello world"'
      `,
  });
});

// https://www.w3.org/TR/xpath-functions/#func-replace
describe('evaluation of \'replace\' replacement strings like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermReplace(args),
    ],
    arity: 'vary',
    operation: 'replace',
    notation: Notation.Function,
    // Arguments are in SPARQL syntax, so '\\' is a single backslash, but expected values are taken as-is.
    testArray: [
      // Escapes
      [ '"abc"', '"b"', String.raw`"\\$"`, '"a$c"' ],
      [ '"abc"', '"b"', String.raw`"\\\\"`, String.raw`"a\c"` ],
      [ '"abc"', '"(b)"', String.raw`"\\$$1"`, '"a$bc"' ],
      [ '"abc"', '"(b)"', String.raw`"\\\\$1"`, String.raw`"a\bc"` ],
      [ '"abc"', '"b"', String.raw`"\\$0"`, '"a$0c"' ],
      // Group references
      [ '"abc"', '"(b)"', '"[$1]"', '"a[b]c"' ],
      [ '"abc"', '"b"', '"[$0]"', '"a[b]c"' ],
      [ '"abc"', '"(b)"', '"$10"', '"ab0c"' ],
      [ '"abc"', '"(b)"', '"$01"', '"abc"' ],
      [ '"a"', '"(a)|(b)"', '"[$2]"', '"[]"' ],
      [ '"abc"', '"b"', '"$2"', '"ac"' ],
      [ '"abc"', '"(a)(b)c"', '"$3"', '""' ],
      [ '"abc"', '"(a)(b)c"', '"$83"', '"3"' ],
      // Literal digits after a group must not extend the reference, also with 10 or more groups
      [ '"abcdefghij"', '"(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)"', '"$110|$105|$1$0"', '"a10|j5|aabcdefghij"' ],
      // Characters that are special in JS replacement strings are literal
      [ '"abc"', '"(?<x>b)"', String.raw`"[$1\\$<x>]"`, '"a[b$<x>]c"' ],
      [ '"abc"', '"b"', '"\\\\$&\\\\$\'\\\\$`"', '"a$&$\'$`c"' ],
      [ '"a/b"', '"/"', '"$&"', '"q"', '"a$&b"' ],
      [ '"a/b"', '"/"', String.raw`"\\"`, '"q"', String.raw`"a\b"` ],
    ],
    errorArray: [
      [ '"abc"', '"b"', '"$"', 'Invalid replacement string \'$\': \'$\' must be followed by a digit' ],
      [ '"abc"', '"b"', '"a$b"', 'Invalid replacement string \'a$b\': \'$\' must be followed by a digit' ],
      [ '"abc"', '"x"', '"$"', 'Invalid replacement string \'$\': \'$\' must be followed by a digit' ],
      [ '"abc"', '"b"', String.raw`"\\"`, 'must be followed by \'\\\' or \'$\'' ],
      [ '"abc"', '"b"', String.raw`"\\a"`, 'must be followed by \'\\\' or \'$\'' ],
    ],
  });
});

describe('TermFunctionReplace', () => {
  describe('createReplace', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('only recompiles when the pattern, replacement, or flags change', () => {
      const compile = jest.spyOn(TermFunctionReplace, 'compile');
      const replace = TermFunctionReplace.createReplace();
      expect(replace('abc', 'b', '[$0]')).toBe('a[b]c');
      expect(replace('bcd', 'b', '[$0]')).toBe('[b]cd');
      expect(compile).toHaveBeenCalledTimes(1);
      expect(replace('abc', 'c', '[$0]')).toBe('ab[c]');
      expect(compile).toHaveBeenCalledTimes(2);
      expect(replace('abc', 'c', '<$0>')).toBe('ab<c>');
      expect(compile).toHaveBeenCalledTimes(3);
      expect(replace('abC', 'c', '<$0>', 'i')).toBe('ab<C>');
      expect(replace('aCC', 'c', '<$0>', 'i')).toBe('a<C><C>');
      expect(compile).toHaveBeenCalledTimes(4);
    });

    it('keeps the previous compilation after an invalid replacement', () => {
      const replace = TermFunctionReplace.createReplace();
      expect(replace('abc', 'b', '[$0]')).toBe('a[b]c');
      expect(() => replace('abc', 'b', '$')).toThrow('\'$\' must be followed by a digit');
      expect(replace('abc', 'b', '[$0]')).toBe('a[b]c');
    });

    it('refers to groups beyond the 99th', () => {
      const input = 'x'.repeat(100);
      const pattern = `${'(x)'.repeat(100)}(y)?`;
      expect(TermFunctionReplace.createReplace()(input, pattern, '[$0|$1|$100|$101|$1010]'))
        .toBe(`[${input}|x|x||0]`);
    });
  });

  describe('resolveGroupReference', () => {
    it.each([
      [ '0', 0, [ 0, '' ]],
      [ '0', 3, [ 0, '' ]],
      [ '00', 3, [ 0, '' ]],
      [ '1', 1, [ 1, '' ]],
      [ '1', 0, [ -1, '' ]],
      [ '9', 3, [ -1, '' ]],
      [ '10', 1, [ 1, '0' ]],
      [ '10', 10, [ 10, '' ]],
      [ '13', 2, [ 1, '3' ]],
      [ '83', 2, [ -1, '3' ]],
      [ '123', 1, [ 1, '23' ]],
      [ '123', 12, [ 12, '3' ]],
      [ '010', 1, [ 1, '0' ]],
    ])('resolves $%s with %d groups', (digits, groupCount, expected) => {
      expect(TermFunctionReplace.resolveGroupReference(digits, groupCount)).toEqual(expected);
    });
  });

  describe('countGroups', () => {
    it.each([
      'a',
      '(a)',
      '(a)(b)',
      '((a)|(b))*',
      '(?:a)(b)',
      '(?<n>a)(b)',
      '(?<a>(?<b>x))\\k<a>',
      '(?<=a)(b)',
      '(?<!a)(b)',
      '(?=a)(b)',
      '(?!a)(b)',
      '\\(a\\)',
      '\\\\(a)',
      '[(]',
      '[(?<x>)](a)',
      '[\\]()](a)',
      '[a\\[](b)',
      '[]()',
      '[^](a)',
      'a{2}(b)',
      '\\u{1F600}(a)',
      '\\p{L}(x)',
    ])('counts the groups of %s', (pattern) => {
      const expected = new RegExp(`${pattern}|`, 'u').exec('')!.length - 1;
      expect(TermFunctionReplace.countGroups(pattern)).toBe(expected);
    });
  });
});
