import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { FragmentSelectorShape, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory, TypesComunica } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import {
  containsCallerResolvedExistence,
  doesShapeAcceptOperation,
  markExistenceWithinService,
  passFullOperationToSource,
} from '../lib/FragmentSelectorShapes';

const AF = new AlgebraFactory();

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
        operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
            children: [
              {
                type: 'operation',
                operation: { operationType: 'wildcard' },
                joinBindings: true,
              },
            ],
          },
        ],
      },
    },
  ],
};

// Shape for QuerySourceRdfJs (with all disjunctions enabled: indexNodes=true, indexDistinctTerms=true)
const SHAPE_RDFJS: FragmentSelectorShape = {
  type: 'disjunction',
  children: [
    {
      type: 'operation',
      operation: {
        operationType: 'pattern',
        pattern: AF.createPattern(
          AF.dataFactory.variable!('s'),
          AF.dataFactory.variable!('p'),
          AF.dataFactory.variable!('o'),
        ),
      },
      variablesOptional: [
        AF.dataFactory.variable!('s'),
        AF.dataFactory.variable!('p'),
        AF.dataFactory.variable!('o'),
      ],
    },
    {
      type: 'operation',
      operation: { operationType: 'type', type: TypesComunica.NODES },
    },
    {
      type: 'operation',
      operation: { operationType: 'type', type: TypesComunica.DISTINCT_TERMS },
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
          type: Algebra.Types.NOP,
        },
      }, AF.createNop())).toBeTruthy();
    });

    it('should not accept equal operations with type type and unequal children', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
          },
        ],
      }, AF.createDistinct(AF.createProject(AF.createNop(), [])))).toBeFalsy();
    });

    it('should accept equal operations with type type and children', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
            children: [
              {
                type: 'operation',
                operation: { operationType: 'wildcard' },
                joinBindings: true,
              },
            ],
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

    describe('for operations that Comunica defines for internal use', () => {
      const wildcard: FragmentSelectorShape = { type: 'operation', operation: { operationType: 'wildcard' }};
      const nodes = AF.createNodes(AF.dataFactory.variable!('g'), AF.dataFactory.variable!('s'));
      const distinctTerms = AF.createDistinctTerms([ AF.dataFactory.variable!('s') ], { s: 'subject' });

      it('should not accept them with type wildcard', () => {
        expect(doesShapeAcceptOperation(wildcard, nodes)).toBeFalsy();
        expect(doesShapeAcceptOperation(wildcard, distinctTerms)).toBeFalsy();
        expect(doesShapeAcceptOperation(wildcard, distinctTerms, { wildcardAcceptAllExtensionFunctions: true }))
          .toBeFalsy();
        expect(doesShapeAcceptOperation(SHAPE_SPARQL_1_1, distinctTerms)).toBeFalsy();
      });

      it('should not accept operations containing them with type wildcard', () => {
        expect(doesShapeAcceptOperation(wildcard, AF.createJoin([ AF.createNop(), nodes ]))).toBeFalsy();
        expect(doesShapeAcceptOperation(wildcard, AF.createDistinct(distinctTerms))).toBeFalsy();
      });

      it('should accept them when listed by their type next to a wildcard', () => {
        expect(doesShapeAcceptOperation({
          type: 'disjunction',
          children: [
            wildcard,
            { type: 'operation', operation: { operationType: 'type', type: TypesComunica.DISTINCT_TERMS }},
          ],
        }, distinctTerms)).toBeTruthy();
      });
    });

    it('should not accept unequal operations with type type', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.NOP,
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
              type: Algebra.Types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.NOP,
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
              type: Algebra.Types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.UNION,
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
              type: Algebra.Types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.NOP,
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
              type: Algebra.Types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.UNION,
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
              type: Algebra.Types.NOP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.BGP,
            },
          },
        ],
      }, AF.createUnion([]))).toBeFalsy();
    });

    describe('for a large disjunction', () => {
      const shape: FragmentSelectorShape = {
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.PROJECT },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.PATTERN },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.SLICE },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.BGP },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.JOIN },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.EXTEND },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.UNION },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.VALUES },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.FILTER },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.LEFT_JOIN },
          },
        ],
      };

      it('should not accept property paths', () => {
        expect(doesShapeAcceptOperation(shape, AF.createPath(
          <any> undefined,
          <any> undefined,
          <any> undefined,
        ))).toBeFalsy();
      });

      it('should not accept property paths in a join', () => {
        expect(doesShapeAcceptOperation(shape, AF.createJoin([
          AF.createPath(
            <any> undefined,
            <any> undefined,
            <any> undefined,
          ),
          AF.createPath(
            <any> undefined,
            <any> undefined,
            <any> undefined,
          ),
        ]))).toBeFalsy();
      });

      it('should not accept property paths in a join in a projection', () => {
        expect(doesShapeAcceptOperation(shape, AF.createProject(
          AF.createJoin([
            AF.createPath(
              <any> undefined,
              <any> undefined,
              <any> undefined,
            ),
            AF.createPath(
              <any> undefined,
              <any> undefined,
              <any> undefined,
            ),
          ]),
          [],
        ))).toBeFalsy();
      });

      it('should accept property paths', () => {
        expect(doesShapeAcceptOperation(shape, AF.createPattern(
          <any> undefined,
          <any> undefined,
          <any> undefined,
        ))).toBeTruthy();
      });

      it('should accept property paths in a join', () => {
        expect(doesShapeAcceptOperation(shape, AF.createJoin([
          AF.createPattern(
            <any> undefined,
            <any> undefined,
            <any> undefined,
          ),
          AF.createPattern(
            <any> undefined,
            <any> undefined,
            <any> undefined,
          ),
        ]))).toBeTruthy();
      });
    });

    it('should accept valid negation', () => {
      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.Types.NOP,
          },
        },
      }, AF.createUnion([]))).toBeTruthy();

      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
          children: [
            {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
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
            type: Algebra.Types.NOP,
          },
        },
      }, AF.createNop())).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'negation',
        child: {
          type: 'operation',
          operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
          children: [
            {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
              children: [
                {
                  type: 'operation',
                  operation: { operationType: 'wildcard' },
                  joinBindings: true,
                },
              ],
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
            type: Algebra.Types.NOP,
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
            type: Algebra.Types.NOP,
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
          type: Algebra.Types.NOP,
        },
      }, AF.createNop(), { joinBindings: true })).toBeTruthy();
    });

    it('should not accept invalid joinBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.NOP,
        },
      }, AF.createNop(), { joinBindings: true })).toBeFalsy();
    });

    it('should accept valid filterBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        filterBindings: true,
        operation: {
          operationType: 'type',
          type: Algebra.Types.NOP,
        },
      }, AF.createNop(), { filterBindings: true })).toBeTruthy();
    });

    it('should not accept invalid filterBindings', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.NOP,
        },
      }, AF.createNop(), { filterBindings: true })).toBeFalsy();
    });

    it('should not accept shapes with unsupported sub-operations', () => {
      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.BGP,
        },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.NOP },
          },
        ],
      }, AF.createBgp([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.JOIN,
        },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.NOP },
          },
        ],
      }, AF.createJoin([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.FILTER,
        },
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.NOP },
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
              type: Algebra.Types.BGP,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.PATTERN,
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
              type: Algebra.Types.JOIN,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.PATTERN,
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
              type: Algebra.Types.FILTER,
            },
          },
          {
            type: 'operation',
            operation: {
              operationType: 'type',
              type: Algebra.Types.PATTERN,
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
        extensionFunctionExpression = AF.createNamedExpression(<RDF.NamedNode> { value: 'mock1' }, []);
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
            type: Algebra.Types.EXPRESSION,
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
            type: Algebra.Types.EXPRESSION,
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
            type: Algebra.Types.EXPRESSION,
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
                type: Algebra.Types.EXPRESSION,
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
                type: Algebra.Types.EXPRESSION,
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
                type: Algebra.Types.EXPRESSION,
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
                type: Algebra.Types.EXPRESSION,
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
            type: Algebra.Types.EXPRESSION,
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
                type: Algebra.Types.EXPRESSION,
                extensionFunctions: [ 'mock1' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.FILTER,
              },
            },
          ],
        }, <Algebra.Filter> <any> {
          expression: extensionFunctionExpression,
          type: Algebra.Types.FILTER,
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
                type: Algebra.Types.EXPRESSION,
                extensionFunctions: [ 'mock2' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.FILTER,
              },
            },
          ],
        }, <Algebra.Filter> <any> {
          expression: extensionFunctionExpression,
          type: Algebra.Types.FILTER,
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
                type: Algebra.Types.EXPRESSION,
                extensionFunctions: [ 'mock1' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.EXPRESSION,
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
                type: Algebra.Types.EXPRESSION,
                extensionFunctions: [ 'mock1' ],
              },
              joinBindings: true,
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.EXPRESSION,
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
              type: Algebra.Types.EXPRESSION,
              extensionFunctions: [ 'mock1' ],
            },
            joinBindings: true,
          },
        }, extensionFunctionExpression)).toBeTruthy();
      });
    });

    describe('for QuerySourceRdfJs shape (all disjunctions enabled)', () => {
      it('should not accept a complex CONSTRUCT query', () => {
        const DF = AF.dataFactory;

        // Variables
        const vS = DF.variable!('s');
        const vP = DF.variable!('p');
        const vO = DF.variable!('o');
        const vDataset = DF.variable!('dataset');
        const vPublisher = DF.variable!('publisher');
        const vLic = DF.variable!('lic');
        const vLicense = DF.variable!('license');
        const vFoafType = DF.variable!('foafType');
        const vPublisherName = DF.variable!('publisher_name');
        const vN1 = DF.variable!('n1');
        const vN2 = DF.variable!('n2');
        const vN3 = DF.variable!('n3');
        const vCreator = DF.variable!('creator');
        const vCreatorName = DF.variable!('creator_name');
        const vAr = DF.variable!('ar');
        const vAccessRights = DF.variable!('accessRights');
        const vAp = DF.variable!('ap');
        const vThemeDefault = DF.variable!('themeDefault');
        const vUnbound = DF.variable!('unbound');

        // Named nodes (prefixes: dcat, dct, foaf, ex)
        const RDF_TYPE = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const DCAT_DATASET = DF.namedNode('http://www.w3.org/ns/dcat#Dataset');
        const DCT_PUBLISHER = DF.namedNode('http://purl.org/dc/terms/publisher');
        const DCT_LICENSE = DF.namedNode('http://purl.org/dc/terms/license');
        const FOAF_NAME = DF.namedNode('http://xmlns.com/foaf/0.1/name');
        const FOAF_NICK = DF.namedNode('http://xmlns.com/foaf/0.1/nick');
        const DCT_IDENTIFIER = DF.namedNode('http://purl.org/dc/terms/identifier');
        const DCT_DESCRIPTION = DF.namedNode('http://purl.org/dc/terms/description');
        const FOAF_ORGANIZATION = DF.namedNode('http://xmlns.com/foaf/0.1/Organization');
        const FOAF_PERSON = DF.namedNode('http://xmlns.com/foaf/0.1/Person');
        const DCT_ACCESS_RIGHTS = DF.namedNode('http://purl.org/dc/terms/accessRights');
        const DCT_ACCRUAL_PERIODICITY = DF.namedNode('http://purl.org/dc/terms/accrualPeriodicity');
        const EX_PUBLIC = DF.namedNode('http://example.com/public');
        const EX_THEME = DF.namedNode('http://example.com/theme');

        /**
         * Algebra for:
         *   PREFIX dcat: <http://www.w3.org/ns/dcat#>
         *   PREFIX dct:  <http://purl.org/dc/terms/>
         *   PREFIX foaf: <http://xmlns.com/foaf/0.1/>
         *
         *   CONSTRUCT { ?s ?p ?o } WHERE {
         *     SELECT * WHERE {
         *       {
         *         ?dataset a dcat:Dataset ;
         *           dct:publisher ?publisher .
         *
         *         OPTIONAL { ?dataset dct:license ?lic }
         *         BIND(COALESCE(?lic, ?unbound) AS ?license)
         *
         *         ?publisher a ?foafType ;
         *           foaf:name ?publisher_name .
         *         OPTIONAL { ?publisher foaf:nick       ?n1 }
         *         OPTIONAL { ?publisher dct:identifier  ?n2 }
         *         OPTIONAL { ?publisher dct:description ?n3 }
         *
         *         OPTIONAL {
         *           ?creator a ?foafType ;
         *             foaf:name ?creator_name .
         *         }
         *
         *         VALUES ?foafType { foaf:Organization foaf:Person }
         *
         *         OPTIONAL { ?dataset dct:accessRights ?ar }
         *         BIND(COALESCE(?ar, <http://example.com/public>) AS ?accessRights)
         *         OPTIONAL { ?dataset dct:accrualPeriodicity ?ap }
         *         BIND(<http://example.com/theme> AS ?themeDefault)
         *       }
         *     }
         *     LIMIT 1
         *   }
         */

        // Step 1: ?dataset a dcat:Dataset ; dct:publisher ?publisher .
        const step1 = AF.createBgp([
          AF.createPattern(vDataset, RDF_TYPE, DCAT_DATASET),
          AF.createPattern(vDataset, DCT_PUBLISHER, vPublisher),
        ]);

        // Step 2: OPTIONAL { ?dataset dct:license ?lic }
        const step2 = AF.createLeftJoin(
          step1,
          AF.createBgp([ AF.createPattern(vDataset, DCT_LICENSE, vLic) ]),
        );

        // Step 3: BIND(COALESCE(?lic, ?unbound) AS ?license)
        const step3 = AF.createExtend(
          step2,
          vLicense,
          AF.createOperatorExpression('coalesce', [
            AF.createTermExpression(vLic),
            AF.createTermExpression(vUnbound),
          ]),
        );

        // Step 4: ?publisher a ?foafType ; foaf:name ?publisher_name .
        const step4 = AF.createJoin([
          step3,
          AF.createBgp([
            AF.createPattern(vPublisher, RDF_TYPE, vFoafType),
            AF.createPattern(vPublisher, FOAF_NAME, vPublisherName),
          ]),
        ]);

        // Step 5: OPTIONAL { ?publisher foaf:nick ?n1 }
        const step5 = AF.createLeftJoin(
          step4,
          AF.createBgp([ AF.createPattern(vPublisher, FOAF_NICK, vN1) ]),
        );

        // Step 6: OPTIONAL { ?publisher dct:identifier ?n2 }
        const step6 = AF.createLeftJoin(
          step5,
          AF.createBgp([ AF.createPattern(vPublisher, DCT_IDENTIFIER, vN2) ]),
        );

        // Step 7: OPTIONAL { ?publisher dct:description ?n3 }
        const step7 = AF.createLeftJoin(
          step6,
          AF.createBgp([ AF.createPattern(vPublisher, DCT_DESCRIPTION, vN3) ]),
        );

        // Step 8: OPTIONAL { ?creator a ?foafType ; foaf:name ?creator_name . }
        const step8 = AF.createLeftJoin(
          step7,
          AF.createBgp([
            AF.createPattern(vCreator, RDF_TYPE, vFoafType),
            AF.createPattern(vCreator, FOAF_NAME, vCreatorName),
          ]),
        );

        // Step 9: VALUES ?foafType { foaf:Organization foaf:Person }
        const step9 = AF.createJoin([
          step8,
          AF.createValues(
            [ vFoafType ],
            [{ foafType: FOAF_ORGANIZATION }, { foafType: FOAF_PERSON }],
          ),
        ]);

        // Step 10: OPTIONAL { ?dataset dct:accessRights ?ar }
        const step10 = AF.createLeftJoin(
          step9,
          AF.createBgp([ AF.createPattern(vDataset, DCT_ACCESS_RIGHTS, vAr) ]),
        );

        // Step 11: BIND(COALESCE(?ar, <http://example.com/public>) AS ?accessRights)
        const step11 = AF.createExtend(
          step10,
          vAccessRights,
          AF.createOperatorExpression('coalesce', [
            AF.createTermExpression(vAr),
            AF.createTermExpression(EX_PUBLIC),
          ]),
        );

        // Step 12: OPTIONAL { ?dataset dct:accrualPeriodicity ?ap }
        const step12 = AF.createLeftJoin(
          step11,
          AF.createBgp([ AF.createPattern(vDataset, DCT_ACCRUAL_PERIODICITY, vAp) ]),
        );

        // Step 13: BIND(<http://example.com/theme> AS ?themeDefault)
        const step13 = AF.createExtend(
          step12,
          vThemeDefault,
          AF.createTermExpression(EX_THEME),
        );

        // SELECT * WHERE { ... } LIMIT 1
        const innerSelect = AF.createSlice(
          AF.createProject(step13, [
            vDataset,
            vPublisher,
            vLic,
            vLicense,
            vFoafType,
            vPublisherName,
            vN1,
            vN2,
            vN3,
            vCreator,
            vCreatorName,
            vAr,
            vAccessRights,
            vAp,
            vThemeDefault,
          ]),
          0,
          1,
        );

        // CONSTRUCT { ?s ?p ?o } WHERE { SELECT * ... LIMIT 1 }
        const construct = AF.createConstruct(
          innerSelect,
          [ AF.createPattern(vS, vP, vO) ],
        );

        expect(doesShapeAcceptOperation(SHAPE_RDFJS, construct)).toBeFalsy();
      });
    });
  });

  describe('#containsCallerResolvedExistence', () => {
    const pattern = AF.createPattern(
      AF.dataFactory.variable!('s'),
      AF.dataFactory.namedNode('ex:p'),
      AF.dataFactory.variable!('o'),
    );
    const existenceFilter = AF.createFilter(
      pattern,
      AF.createExistenceExpression(false, pattern),
    );

    it('returns false without an existence resolver in the context', () => {
      expect(containsCallerResolvedExistence(existenceFilter, new ActionContext())).toBeFalsy();
    });

    it('returns false for an operation without existence expressions', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const filter = AF.createFilter(
        pattern,
        AF.createTermExpression(AF.dataFactory.variable!('o')),
      );
      expect(containsCallerResolvedExistence(filter, context)).toBeFalsy();
      expect(containsCallerResolvedExistence(pattern, context)).toBeFalsy();
    });

    it('returns true for an operation containing an existence expression', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      expect(containsCallerResolvedExistence(existenceFilter, context)).toBeTruthy();
      expect(containsCallerResolvedExistence(AF.createProject(existenceFilter, []), context)).toBeTruthy();
    });

    it('returns true for an existence expression in any expression of an operation', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const existence = AF.createExistenceExpression(true, pattern);
      const variable = AF.dataFactory.variable!('v');
      const operations = [
        AF.createExtend(pattern, variable, existence),
        AF.createOrderBy(pattern, [ existence ]),
        AF.createLeftJoin(pattern, pattern, existence),
        AF.createGroup(pattern, [], [ AF.createBoundAggregate(variable, 'sum', AF.createOperatorExpression('if', [
          existence,
          AF.createTermExpression(AF.dataFactory.literal('1')),
          AF.createTermExpression(AF.dataFactory.literal('0')),
        ]), false) ]),
        AF.createFilter(pattern, AF.createOperatorExpression('!', [ existence ])),
        AF.createFilter(pattern, AF.createOperatorExpression('||', [
          AF.createTermExpression(AF.dataFactory.variable!('o')),
          existence,
        ])),
      ];
      for (const operation of operations) {
        expect(containsCallerResolvedExistence(operation, context)).toBeTruthy();
      }
    });

    it('returns false for an existence expression in the body of a SERVICE clause', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const service = AF.createService(existenceFilter, AF.dataFactory.namedNode('ex:service'));
      expect(containsCallerResolvedExistence(service, context)).toBeFalsy();
      expect(containsCallerResolvedExistence(AF.createJoin([ pattern, service ]), context)).toBeFalsy();
      const filter = AF.createFilter(service, AF.createExistenceExpression(false, pattern));
      expect(containsCallerResolvedExistence(filter, context)).toBeTruthy();
    });

    it('returns false for an existence expression marked as from the body of a SERVICE clause', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const marked = markExistenceWithinService(AF.createExistenceExpression(false, existenceFilter));
      expect(containsCallerResolvedExistence(AF.createFilter(pattern, marked), context)).toBeFalsy();
      expect(containsCallerResolvedExistence(AF.createFilter(existenceFilter, marked), context)).toBeTruthy();
    });
  });

  describe('#markExistenceWithinService', () => {
    it('marks a copy of the expression', () => {
      const pattern = AF.createPattern(
        AF.dataFactory.variable!('s'),
        AF.dataFactory.namedNode('ex:p'),
        AF.dataFactory.variable!('o'),
      );
      const expression = Object.assign(AF.createExistenceExpression(true, pattern), { metadata: { other: true }});
      expect(markExistenceWithinService(expression)).toEqual({
        ...expression,
        metadata: { other: true, withinService: true },
      });
      expect(expression.metadata).toEqual({ other: true });
    });
  });

  describe('#passFullOperationToSource', () => {
    const pattern = AF.createPattern(
      AF.dataFactory.variable!('s'),
      AF.dataFactory.namedNode('ex:p'),
      AF.dataFactory.variable!('o'),
    );
    let source: IQuerySourceWrapper;

    beforeEach(() => {
      source = <any> { source: { getSelectorShape: () => SHAPE_SPARQL_1_1 }};
    });

    it('passes an accepted operation to a single source', async() => {
      await expect(passFullOperationToSource(pattern, [ source ], new ActionContext())).resolves.toBeTruthy();
    });

    it('does not pass to multiple sources', async() => {
      await expect(passFullOperationToSource(pattern, [ source, source ], new ActionContext()))
        .resolves.toBeFalsy();
    });

    it('does not pass an operation with an existence expression when a resolver is set', async() => {
      const filter = AF.createFilter(pattern, AF.createExistenceExpression(false, pattern));
      await expect(passFullOperationToSource(filter, [ source ], new ActionContext()))
        .resolves.toBeTruthy();
      await expect(passFullOperationToSource(filter, [ source ], new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      }))).resolves.toBeFalsy();
    });

    it('passes an operation with an existence expression in a SERVICE clause when a resolver is set', async() => {
      const filter = AF.createFilter(pattern, AF.createExistenceExpression(false, pattern));
      const service = AF.createService(filter, AF.dataFactory.namedNode('ex:service'));
      await expect(passFullOperationToSource(AF.createJoin([ pattern, service ]), [ source ], new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      }))).resolves.toBeTruthy();
    });
  });
});
