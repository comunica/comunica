import { EVB_ERR_STR, FALSE_STR, TRUE_STR } from '../../util/Consts';
import { testBinOp, testUnOp } from '../util/Operators';

// Some aliases that can be used in the truth tables
const argMapping = {
  true: TRUE_STR,
  false: FALSE_STR,
  error: EVB_ERR_STR,
  gener: '"2001-10-26T21:32:52"^^xsd:dateTime',
  earlyN: '"1999-12-31T06:00:00"^^xsd:dateTime',
  earlyZ: '"1999-12-31T10:00:00+04:00"^^xsd:dateTime',
  lateN: '"2002-04-02T17:00:00"^^xsd:dateTime',
  lateZ: '"2002-04-02T16:00:00-01:00"^^xsd:dateTime',
  edge1: '"1999-12-31T24:00:00"^^xsd:dateTime',
  edge2: '"2000-01-01T00:00:00"^^xsd:dateTime',
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

// TODO: Better timezone testing whit out explicit timezone
// When no dateTime is present, an implicit datetime is assumed (here always +0)
// (Search for `order relation on date`)
// https://www.w3.org/TR/xpath-functions/#xmlschema-2
describe('the evaluation of simple datetime expressions', () => {
  describe('like datetime literals › like', () => {
    const table = `
    gener = error
    `;
    testUnary('', table);
  });

  describe('like datetime operations', () => {
    describe('like "=" receiving', () => {
      const table = `
      earlyN earlyZ = true
      earlyN earlyN = true
      earlyZ earlyZ = true

      earlyN lateN  = false
      earlyN lateZ  = false
      earlyZ lateZ  = false
      earlyZ lateN  = false

      edge1 edge2   = true
      `;
      test('=', table);
    });

    describe('like "!=" receiving', () => {
      const table = `
      earlyN earlyZ = false
      earlyN earlyN = false
      earlyZ earlyZ = false

      earlyN lateN  = true
      earlyN lateZ  = true
      earlyZ lateZ  = true
      earlyZ lateN  = true

      edge1 edge2   = false
      `;
      test('!=', table);
    });

    describe('like "<" receiving', () => {
      const table = `
      earlyN earlyZ = false
      earlyN earlyN = false
      earlyZ earlyZ = false

      earlyN lateN  = true
      earlyN lateZ  = true
      earlyZ lateZ  = true
      earlyZ lateN  = true

      lateN earlyN  = false
      lateN earlyZ  = false
      lateZ earlyN  = false
      lateZ earlyZ  = false

      edge1 edge2   = false
      `;
      test('<', table);
    });

    describe('like ">" receiving', () => {
      const table = `
      earlyN earlyZ = false
      earlyN earlyN = false
      earlyZ earlyZ = false

      earlyN lateN  = false
      earlyN lateZ  = false
      earlyZ lateZ  = false
      earlyZ lateN  = false

      lateN earlyN  = true
      lateN earlyZ  = true
      lateZ earlyN  = true
      lateZ earlyZ  = true

      edge1 edge2   = false
      `;
      test('>', table);
    });

    describe('like <= receiving', () => {
      const table = `
      earlyN earlyZ = true
      earlyN earlyN = true
      earlyZ earlyZ = true

      earlyN lateN  = true
      earlyN lateZ  = true
      earlyZ lateZ  = true
      earlyZ lateN  = true

      lateN earlyN  = false
      lateN earlyZ  = false
      lateZ earlyN  = false
      lateZ earlyZ  = false

      edge1 edge2   = true
      `;
      test('<=', table);
    });

    describe('like >= receiving', () => {
      const table = `
      earlyN earlyZ = true
      earlyN earlyN = true
      earlyZ earlyZ = true

      earlyN lateN  = false
      earlyN lateZ  = false
      earlyZ lateZ  = false
      earlyZ lateN  = false

      lateN earlyN  = true
      lateN earlyZ  = true
      lateZ earlyN  = true
      lateZ earlyZ  = true

      edge1 edge2   = true
      `;
      test('>=', table);
    });
  });
});
