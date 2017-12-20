import { EVB_ERR_STR, FALSE_STR, TRUE_STR } from '../../util/Consts';
import { testBinOp, testUnOp } from '../util/Operators';

// Some aliases that can be used in the truth tables
const argMapping = {
  true: TRUE_STR,
  false: FALSE_STR,
  error: EVB_ERR_STR,
  gener: '"generic-string"^^xsd:string',
  empty: '""^^xsd:string',
  aaa: '"aaa"^^xsd:string',
  bbb: '"bbb"^^xsd:string',
};
const resultMapping = {
  true: true,
  false: false,
};

// Default error handling for boolean operators
const errorTable = `
gener error = error
error gener = error
error error = error
`;
const errorTableUnary = `
error = error
`;

// Friendlier aliases for operation tests
function test(
  op: string,
  table: string,
  errTable: string = errorTable,
  argMap: {} = argMapping,
) {
  testBinOp(op, table, errTable, argMap, resultMapping);
}
function testUnary(
  op: string,
  table: string,
  errTable: string = errorTableUnary,
  argMap: {} = argMapping,
) {
  testUnOp(op, table, errTable, argMap, resultMapping);
}

// TODO: Decent collation testing
// https://www.w3.org/TR/xpath-functions/#collations
// https://www.w3.org/TR/xpath-functions/#func-compare
describe('the evaluation of simple numeric boolean expressions', () => {
  describe('like string literals › like', () => {
    const table = `
    empty = false
    gener = true
    `;
    testUnary('', table);
  });

  describe('like string operations', () => {
    describe('like "=" receiving', () => {
      const table = `
      empty empty = true
      empty aaa   = false
      aaa   aaa   = true
      aaa   bbb   = false
      `;
      test('=', table);
    });

    describe('like "!=" receiving', () => {
      const table = `
      empty empty = false
      empty aaa   = true
      aaa   aaa   = false
      aaa   bbb   = true
      `;
      test('!=', table);
    });

    describe('like "<" receiving', () => {
      const table = `
      empty empty = false
      empty aaa   = true
      aaa   empty = false
      aaa   aaa   = false
      aaa   bbb   = true
      bbb   aaa   = false
      `;
      test('<', table);
    });

    describe('like ">" receiving', () => {
      const table = `
      empty empty = false
      empty aaa   = false
      aaa   empty = true
      aaa   aaa   = false
      aaa   bbb   = false
      bbb   aaa   = true
      `;
      test('>', table);
    });

    describe('like <= receiving', () => {
      const table = `
      empty empty = true
      empty aaa   = true
      aaa   empty = false
      aaa   aaa   = true
      aaa   bbb   = true
      bbb   aaa   = false
      `;
      test('<=', table);
    });

    describe('like >= receiving', () => {
      const table = `
      empty empty = true
      empty aaa   = false
      aaa   empty = true
      aaa   aaa   = true
      aaa   bbb   = false
      bbb   aaa   = true
      `;
      test('>=', table);
    });
  });
});
