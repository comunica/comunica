import type { FragmentSelectorShape } from '@comunica/types';
import { Algebra, Factory } from 'sparqlalgebrajs';
import {
  doesShapeAcceptOperation,
} from '../lib/FragmentSelectorShapes';

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
  });
});
