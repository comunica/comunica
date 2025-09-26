import type { FragmentSelectorShape } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { doesShapeAcceptOperation } from '../lib/FragmentSelectorShapes';

const AF = new Factory();

// Shape for QuerySourceSparql
const SHAPE_SPARQL_1_1: FragmentSelectorShape = {
  type: 'conjunction',
  children: [
    {
      type: 'disjunction',
      children: [
        {
          type: 'operation',
          operation: { operationType: 'wildcard' },
          joinBindings: true,
        },
      ],
    },
    {
      type: 'negation',
      child: {
        type: 'operation',
        operation: { operationType: 'type', type: Algebra.types.DISTINCT },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.CONSTRUCT },
          },
        ],
      },
    },
  ],
};

describe('FragmentSelectorShapes', () => {
  describe('#doesShapeAcceptOperation', () => {
    it('should accept equal operations with pattern type', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'pattern',
          pattern: AF.createNop(),
        },
      }, AF.createNop())).toBeTruthy();
    });

    it('should not accept unequal operations with pattern type', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'pattern',
          pattern: AF.createNop(),
        },
      }, AF.createUnion([]))).toBeFalsy();
    });

    it('should accept equal operations with type type', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.NOP,
        },
      }, AF.createNop())).toBeTruthy();
    });

    it('should not accept equal operations with type type and unequal children', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: { operationType: 'type', type: Algebra.types.DISTINCT },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.CONSTRUCT },
          },
        ],
      }, AF.createDistinct(AF.createProject(AF.createNop(), [])))).toBeFalsy();
    });

    it('should accept equal operations with type type and children', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: { operationType: 'type', type: Algebra.types.DISTINCT },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.CONSTRUCT },
          },
        ],
      }, AF.createDistinct(AF.createConstruct(AF.createNop(), [])))).toBeTruthy();
    });

    it('should accept all operations with type wildcard', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'wildcard',
        },
      }, AF.createNop())).toBeTruthy();
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'wildcard',
        },
      }, AF.createBgp([]))).toBeTruthy();
    });

    it('should not accept unequal operations with type type', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.NOP,
        },
      }, AF.createUnion([]))).toBeFalsy();
    });

    it('should accept valid conjunction', () => {
      expect(doesShapeAcceptOperation({
        type: 'conjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
        ],
      }, AF.createNop())).toBeTruthy();
    });

    it('should not accept invalid conjunction', () => {
      expect(doesShapeAcceptOperation({
        type: 'conjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.UNION,
            },
          },
        ],
      }, AF.createUnion([]))).toBeFalsy();
    });

    it('should accept valid disjunction', () => {
      expect(doesShapeAcceptOperation({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
        ],
      }, AF.createNop())).toBeTruthy();
      expect(doesShapeAcceptOperation({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.UNION,
            },
          },
        ],
      }, AF.createUnion([]))).toBeTruthy();
    });

    it('should not accept invalid disjunction', () => {
      expect(doesShapeAcceptOperation({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.BGP,
            },
          },
        ],
      }, AF.createUnion([]))).toBeFalsy();
    });

    it('should accept valid negation', () => {
      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.NOP,
          },
        },
      }, AF.createUnion([]))).toBeTruthy();

      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: { operationType: 'type', type: Algebra.types.DISTINCT },
          children: [
            {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.CONSTRUCT },
            },
          ],
        },
      }, AF.createDistinct(AF.createProject(AF.createNop(), [])))).toBeTruthy();
    });

    it('should not accept invalid negation', () => {
      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.NOP,
          },
        },
      }, AF.createNop())).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: { operationType: 'type', type: Algebra.types.DISTINCT },
          children: [
            {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.CONSTRUCT },
            },
          ],
        },
      }, AF.createDistinct(AF.createConstruct(AF.createNop(), [])))).toBeFalsy();
    });

    it('should accept valid arity', () => {
      expect(doesShapeAcceptOperation({
        type: 'arity',
        child: {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.NOP,
          },
        },
      }, AF.createNop())).toBeTruthy();
    });

    it('should not accept invalid arity', () => {
      expect(doesShapeAcceptOperation({
        type: 'arity',
        child: {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.NOP,
          },
        },
      }, AF.createUnion([]))).toBeFalsy();
    });

    it('should accept valid joinBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        joinBindings: true,
        operation: {
          operationType: 'type',
          type: Algebra.types.NOP,
        },
      }, AF.createNop(), { joinBindings: true })).toBeTruthy();
    });

    it('should not accept invalid joinBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.NOP,
        },
      }, AF.createNop(), { joinBindings: true })).toBeFalsy();
    });

    it('should accept valid filterBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        filterBindings: true,
        operation: {
          operationType: 'type',
          type: Algebra.types.NOP,
        },
      }, AF.createNop(), { filterBindings: true })).toBeTruthy();
    });

    it('should not accept invalid filterBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.NOP,
        },
      }, AF.createNop(), { filterBindings: true })).toBeFalsy();
    });

    it('should not accept shapes with unsupported sub-operations', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.BGP,
        },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.NOP },
          },
        ],
      }, AF.createBgp([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.JOIN,
        },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.NOP },
          },
        ],
      }, AF.createJoin([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.FILTER,
        },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.NOP },
          },
        ],
      }, AF.createFilter(
        AF.createPattern(undefined!, undefined!, undefined!),
        undefined!,
      ))).toBeFalsy();

      expect(doesShapeAcceptOperation(
        SHAPE_SPARQL_1_1,
        AF.createDistinct(AF.createConstruct(AF.createNop(), [])),
      )).toBeFalsy();
    });

    it('should accept shapes with supported sub-operations', () => {
      expect(doesShapeAcceptOperation({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.BGP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.PATTERN,
            },
          },
        ],
      }, AF.createBgp([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeTruthy();

      expect(doesShapeAcceptOperation({
        // Shape for QuerySourceSparql
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.JOIN,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.PATTERN,
            },
          },
        ],
      }, AF.createJoin([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeTruthy();

      expect(doesShapeAcceptOperation({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.FILTER,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.PATTERN,
            },
          },
        ],
      }, AF.createFilter(
        AF.createPattern(undefined!, undefined!, undefined!),
        undefined!,
      ))).toBeTruthy();

      expect(doesShapeAcceptOperation(
        SHAPE_SPARQL_1_1,
        AF.createDistinct(AF.createProject(AF.createNop(), [])),
      )).toBeTruthy();

      expect(doesShapeAcceptOperation(
        SHAPE_SPARQL_1_1,
        AF.createProject(AF.createBgp([ <any>AF.createNop() ]), []),
      )).toBeTruthy();
    });

    describe('with extension function operations', () => {
      let extensionFunctionExpression: Algebra.NamedExpression;
      let operationWithextensionFunctionExpression: Algebra.Join;

      beforeAll(() => {
        extensionFunctionExpression = {
          expressionType: Algebra.expressionTypes.NAMED,
          name: <RDF.NamedNode> { value: 'mock1' },
          args: [],
          type: Algebra.types.EXPRESSION,
        };
        operationWithextensionFunctionExpression = AF.createJoin([
          AF.createNop(),
          extensionFunctionExpression,
        ]);
      });

      it('operation type with a compatible extension function operation should accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.EXPRESSION,
            extensionFunctions: [ 'mock1' ],
          },
          joinBindings: true,
        }, extensionFunctionExpression)).toBeTruthy();
      });

      it('operation type with a non-compatible extension function operation should not accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.EXPRESSION,
            extensionFunctions: [ 'mock2' ],
          },
          joinBindings: true,
        }, extensionFunctionExpression)).toBeFalsy();
      });

      it('operation type with a non-compatible extension function operation child should not accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.EXPRESSION,
            extensionFunctions: [ 'mock2' ],
          },
          joinBindings: true,
        }, operationWithextensionFunctionExpression)).toBeFalsy();
      });

      it(`disjunction with a non-compatible extension function operation not should accept`, () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: { operationType: 'wildcard' },
            },
          ],
        }, extensionFunctionExpression)).toBeFalsy();
      });

      it(`disjunction with a non-compatible extension function operation child should not accept`, () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: { operationType: 'wildcard' },
            },
          ],
        }, operationWithextensionFunctionExpression)).toBeFalsy();
      });

      it(`disjunction with a non-compatible extension function operation should accept if wildcardAcceptAllExtensionFunctions`, () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: { operationType: 'wildcard' },
            },
          ],
        }, extensionFunctionExpression, { wildcardAcceptAllExtensionFunctions: true })).toBeTruthy();
      });

      it(`disjunction with a non-compatible extension function operation child should accept if wildcardAcceptAllExtensionFunctions`, () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: { operationType: 'wildcard' },
            },
          ],
        }, operationWithextensionFunctionExpression, { wildcardAcceptAllExtensionFunctions: true })).toBeTruthy();
      });

      it('operation type with a NOP operation should not accept, but also not throw an error', () => {
        expect(doesShapeAcceptOperation({
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.EXPRESSION,
            extensionFunctions: [ 'mock1' ],
          },
          joinBindings: true,
        }, AF.createNop())).toBeFalsy();
      });

      it('operation type with a wildcard operation should should not accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'operation',
          operation: { operationType: 'wildcard' },
          joinBindings: true,
        }, extensionFunctionExpression)).toBeFalsy();
      });

      it('should accept when the expression is contained within a different expression and it\'s compatible', () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock1' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.FILTER,
              },
            },
          ],
        }, <Algebra.Filter> {
          expression: extensionFunctionExpression,
          type: Algebra.types.FILTER,
        })).toBeTruthy();
      });

      // eslint-disable-next-line max-len
      it('should not accept when the expression is contained within a different expression and it\'s not compatible', () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.FILTER,
              },
            },
          ],
        }, <Algebra.Filter> {
          expression: extensionFunctionExpression,
          type: Algebra.types.FILTER,
        })).toBeFalsy();
      });

      // eslint-disable-next-line max-len
      it('conjunction type with two extension function operations, of which one is compatible, should should not accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'conjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock1' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
          ],
        }, extensionFunctionExpression)).toBeFalsy();
      });

      // eslint-disable-next-line max-len
      it('disjunction type with two extension function operations, of which one is compatible, should should accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock1' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
          ],
        }, extensionFunctionExpression)).toBeTruthy();
      });

      it('arity type with a compatible extension function operation should should accept', () => {
        expect(doesShapeAcceptOperation({
          type: 'arity',
          child: {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.types.EXPRESSION,
              extensionFunctions: [ 'mock1' ],
            },
            joinBindings: true,
          },
        }, extensionFunctionExpression)).toBeTruthy();
      });
    });
  });
});
