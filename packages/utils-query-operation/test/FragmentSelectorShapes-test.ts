import { Algebra, Factory } from '@traqula/algebra-transformations-1-2';
import {
  doesShapeAcceptOperation,
} from '../lib/FragmentSelectorShapes';

const AF = new Factory();

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
      }, AF.createBgp([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.JOIN,
        },
      }, AF.createJoin([
        AF.createPattern(undefined!, undefined!, undefined!),
      ]))).toBeFalsy();

      expect(doesShapeAcceptOperation({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.FILTER,
        },
      }, AF.createFilter(
        AF.createPattern(undefined!, undefined!, undefined!),
        undefined!,
      ))).toBeFalsy();
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
    });
  });
});
