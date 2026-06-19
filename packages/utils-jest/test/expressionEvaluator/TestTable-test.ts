import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { generalErrorEvaluation } from '../../lib/expressionEvaluator/generalEvaluation';
import { BinaryTable, Notation, UnaryTable, VariableTable } from '../../lib/expressionEvaluator/TestTable';
import { runTestTable } from '../../lib/expressionEvaluator/utils';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

/**
 * Returns a fixed algebra that always evaluates to "1"^^xsd:integer,
 * regardless of the query string passed.
 */
function constantAlgebraParser(_query: string): Algebra.Operation {
  return AF.createProject(
    AF.createFilter(
      AF.createBgp([]),
      AF.createTermExpression(DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'))),
    ),
    [],
  );
}

describe('TestTable', () => {
  describe('VariableTable', () => {
    it('throws when format is called with a non-Function notation', () => {
      const table = new VariableTable({
        operation: 'op',
        arity: 'vary',
        notation: Notation.Prefix,
        testTable: '"1"^^xsd:integer = "1"^^xsd:integer',
      });
      expect(() => table.test()).toThrow('Variable argument count only supported with function notation.');
    });

    describe('with Function notation', () => {
      runTestTable({
        operation: '',
        arity: 'vary',
        notation: Notation.Function,
        testTable: `
          "1"^^xsd:integer = "1"^^xsd:integer
        `,
        toAlgebraParse: constantAlgebraParser,
      });
    });

    describe('with errorTable', () => {
      runTestTable({
        operation: '',
        arity: 'vary',
        notation: Notation.Function,
        errorTable: `
          "notAnInt"^^xsd:integer = ''
        `,
        toAlgebraParse: (_query: string): Algebra.Operation => AF.createProject(
          AF.createFilter(
            AF.createBgp([]),
            AF.createTermExpression(DF.variable('unbound')),
          ),
          [],
        ),
      });
    });
  });

  describe('UnaryTable', () => {
    it('throws when format is called with Infix notation', () => {
      const table = new UnaryTable({
        operation: 'op',
        arity: 1,
        notation: Notation.Infix,
        testTable: '"1"^^xsd:integer = "1"^^xsd:integer',
      });
      expect(() => table.test()).toThrow('Cant format a unary operator as infix.');
    });

    it('throws when format is called with an unrecognized notation (default case)', () => {
      const table = new UnaryTable({
        operation: 'op',
        arity: 1,
        notation: <Notation> <unknown> 99,
        testTable: '"1"^^xsd:integer = "1"^^xsd:integer',
      });
      expect(() => table.test()).toThrow('Unreachable');
    });

    describe('with Prefix notation', () => {
      runTestTable({
        operation: '',
        arity: 1,
        notation: Notation.Prefix,
        testTable: `
          "1"^^xsd:integer = "1"^^xsd:integer
        `,
        toAlgebraParse: constantAlgebraParser,
      });
    });
  });

  describe('BinaryTable', () => {
    it('throws when format is called with an unrecognized notation (default case)', () => {
      const table = new BinaryTable({
        operation: 'op',
        arity: 2,
        notation: <Notation> <unknown> 99,
        testTable: '"1"^^xsd:integer "2"^^xsd:integer = "1"^^xsd:integer',
      });
      expect(() => table.test()).toThrow('Unreachable');
    });

    describe('with Prefix notation', () => {
      runTestTable({
        operation: 'op',
        arity: 2,
        notation: Notation.Prefix,
        testTable: `
          "1"^^xsd:integer "2"^^xsd:integer = "1"^^xsd:integer
        `,
        toAlgebraParse: constantAlgebraParser,
      });
    });

    describe('with errorTable and Prefix notation', () => {
      runTestTable({
        operation: 'op',
        arity: 2,
        notation: Notation.Prefix,
        errorTable: `
          "1"^^xsd:integer "2"^^xsd:integer = ''
        `,
        toAlgebraParse: (_query: string): Algebra.Operation => AF.createProject(
          AF.createFilter(
            AF.createBgp([]),
            AF.createTermExpression(DF.variable('unbound')),
          ),
          [],
        ),
      });
    });
  });

  describe('ArrayTable', () => {
    describe('with Prefix notation', () => {
      runTestTable({
        operation: 'op',
        arity: 2,
        notation: Notation.Prefix,
        testArray: [
          [ '"1"^^xsd:integer', '"2"^^xsd:integer', '"1"^^xsd:integer' ],
        ],
        toAlgebraParse: constantAlgebraParser,
      });
    });

    describe('with errorArray and Prefix notation', () => {
      runTestTable({
        operation: 'op',
        arity: 2,
        notation: Notation.Prefix,
        errorArray: [
          [ '"1"^^xsd:integer', '"2"^^xsd:integer', '' ],
        ],
        toAlgebraParse: (_query: string): Algebra.Operation => AF.createProject(
          AF.createFilter(
            AF.createBgp([]),
            AF.createTermExpression(DF.variable('unbound')),
          ),
          [],
        ),
      });
    });
  });

  describe('runTestTable', () => {
    it('throws when no table is provided', () => {
      expect(() => runTestTable({
        operation: 'op',
        arity: 2,
        notation: Notation.Infix,
      })).toThrow('Can not test if no testTable, testArray, or errorTable is provided');
    });

    it('throws when VariableTableParser receives an unparseable row', () => {
      expect(() => runTestTable({
        operation: 'op',
        arity: 'vary',
        notation: Notation.Function,
        testTable: '  ',
      })).toThrow('Could not parse row:');
    });

    it('throws when BinaryTableParser receives an unparseable row', () => {
      expect(() => runTestTable({
        operation: 'op',
        arity: 2,
        notation: Notation.Infix,
        testTable: '  ',
      })).toThrow('Could not parse row:');
    });

    it('throws when UnaryTableParser receives an unparseable row', () => {
      expect(() => runTestTable({
        operation: 'op',
        arity: 1,
        notation: Notation.Prefix,
        testTable: '  ',
      })).toThrow('Could not parse row:');
    });
  });

  describe('generalErrorEvaluation', () => {
    it('returns undefined when the expression does not throw', async() => {
      const result = await generalErrorEvaluation({
        expression: 'anything',
        toAlgebraParse: constantAlgebraParser,
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined when the expression does not throw (with bindings provided)', async() => {
      const result = await generalErrorEvaluation({
        bindings: BF.bindings(),
        expression: 'anything',
        toAlgebraParse: constantAlgebraParser,
      });
      expect(result).toBeUndefined();
    });
  });
});
