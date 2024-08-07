import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorOptimizeQueryOperationFilterPushdown } from '../lib/ActorOptimizeQueryOperationFilterPushdown';

const AF = new Factory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationFilterPushdown', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationFilterPushdown instance', () => {
    let actor: ActorOptimizeQueryOperationFilterPushdown;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationFilterPushdown({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext(), operation: AF.createNop() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('for an operation without filter', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(operationIn);
      });

      it('for an operation with filter', async() => {
        const operationIn = AF.createFilter(
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s'), DF.variable('p') ],
          ),
          AF.createTermExpression(DF.variable('s')),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(AF.createProject(
          AF.createFilter(
            AF.createBgp([]),
            AF.createTermExpression(DF.variable('s')),
          ),
          [ DF.variable('s'), DF.variable('p') ],
        ));
      });
    });

    describe('getExpressionVariables', () => {
      it('returns undefined for aggregates', async() => {
        expect(() => actor.getExpressionVariables(
          AF.createAggregateExpression('sum', AF.createTermExpression(DF.namedNode('s')), true),
        )).toThrow(`Getting expression variables is not supported for aggregate`);
      });

      it('returns undefined for wildcard', async() => {
        expect(() => actor.getExpressionVariables(
          AF.createWildcardExpression(),
        )).toThrow(`Getting expression variables is not supported for wildcard`);
      });

      it('returns undefined for existence', async() => {
        expect(actor.getExpressionVariables(
          AF.createExistenceExpression(false, AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.variable('o'))),
        )).toEqual([
          DF.variable('p'),
          DF.variable('o'),
        ]);
      });

      it('returns empty array for a named expression', async() => {
        expect(actor.getExpressionVariables(
          AF.createNamedExpression(DF.namedNode('s'), []),
        )).toEqual([]);
      });

      it('returns a variable for a term expression with a variable', async() => {
        expect(actor.getExpressionVariables(
          AF.createTermExpression(DF.variable('s')),
        )).toEqual([ DF.variable('s') ]);
      });

      it('returns an empty array for a term expression with a named node', async() => {
        expect(actor.getExpressionVariables(
          AF.createTermExpression(DF.namedNode('s')),
        )).toEqual([]);
      });

      it('returns for an operator expression with variables', async() => {
        expect(actor.getExpressionVariables(
          AF.createOperatorExpression('+', [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('b')),
          ]),
        )).toEqual([ DF.variable('a'), DF.variable('b') ]);
      });

      it('returns for an operator expression with duplicate variables', async() => {
        expect(actor.getExpressionVariables(
          AF.createOperatorExpression('+', [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('a')),
          ]),
        )).toEqual([ DF.variable('a') ]);
      });

      it('returns for a nested operator expression with variables', async() => {
        expect(actor.getExpressionVariables(
          AF.createOperatorExpression('+', [
            AF.createTermExpression(DF.variable('a')),
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('b')),
              AF.createTermExpression(DF.variable('c')),
            ]),
          ]),
        )).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
      });

      it('returns for a nested operator expression with mixed terms', async() => {
        expect(actor.getExpressionVariables(
          AF.createOperatorExpression('+', [
            AF.createTermExpression(DF.blankNode('a')),
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.namedNode('b')),
              AF.createTermExpression(DF.variable('c')),
            ]),
          ]),
        )).toEqual([ DF.variable('c') ]);
      });
    });

    describe('filterPushdown', () => {
      function filterPushdown(
        expression: Algebra.Expression,
        operation: Algebra.Operation,
      ) {
        return actor.filterPushdown(
          expression,
          actor.getExpressionVariables(expression),
          operation,
          AF,
          new ActionContext(),
        );
      }

      describe('for an extend operation', () => {
        it('is pushed down when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.namedNode('s')),
            AF.createExtend(AF.createBgp([]), DF.variable('v'), AF.createTermExpression(DF.namedNode('o'))),
          )).toEqual(
            AF.createExtend(
              AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.namedNode('s'))),
              DF.variable('v'),
              AF.createTermExpression(DF.namedNode('o')),
            ),
          );
        });

        it('is not pushed down when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('v')),
            AF.createExtend(AF.createBgp([]), DF.variable('v'), AF.createTermExpression(DF.namedNode('o'))),
          )).toEqual(
            AF.createFilter(
              AF.createExtend(
                AF.createBgp([]),
                DF.variable('v'),
                AF.createTermExpression(DF.namedNode('o')),
              ),
              AF.createTermExpression(DF.variable('v')),
            ),
          );
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createExtend(AF.createBgp([]), DF.variable('v'), AF.createTermExpression(DF.namedNode('o'))),
          )).toEqual(
            AF.createUnion([]),
          );
        });
      });

      describe('for a filter operation', () => {
        it('is pushed down when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('b'))),
          )).toEqual(
            AF.createFilter(
              AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('a'))),
              AF.createTermExpression(DF.variable('b')),
            ),
          );
        });
        it('is pushed down when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createFilter(
              AF.createBgp([]),
              AF.createOperatorExpression('id', [ AF.createTermExpression(DF.variable('a')) ]),
            ),
          )).toEqual(
            AF.createFilter(
              AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('a'))),
              AF.createOperatorExpression('id', [ AF.createTermExpression(DF.variable('a')) ]),
            ),
          );
        });
        it('is replaced with a no-op  for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('b'))),
          )).toEqual(
            AF.createUnion([]),
          );
        });
      });

      describe('for a join operation', () => {
        it('is pushed down for fully-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createJoin([
              AF.createFilter(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createTermExpression(DF.variable('s')),
              ),
              AF.createFilter(
                AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
                AF.createTermExpression(DF.variable('s')),
              ),
            ]),
          );
        });

        it('is not pushed down for partially-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('s')),
              AF.createTermExpression(DF.variable('x')),
            ]),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createFilter(
              AF.createJoin([
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              ]),
              AF.createOperatorExpression('+', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.variable('x')),
              ]),
            ),
          );
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createUnion([]),
          );
        });

        it('is voided for non-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          );
        });

        it('is pushed down for fully-, partially-, and not-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('s')),
              AF.createTermExpression(DF.variable('x')),
            ]),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              AF.createPattern(DF.variable('s'), DF.variable('x'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('o1')),
            ]),
          )).toEqual(
            AF.createJoin([
              // Fully overlapping
              AF.createJoin([
                AF.createFilter(
                  AF.createPattern(DF.variable('s'), DF.variable('x'), DF.namedNode('o1')),
                  AF.createOperatorExpression('+', [
                    AF.createTermExpression(DF.variable('s')),
                    AF.createTermExpression(DF.variable('x')),
                  ]),
                ),
              ]),
              // Partially overlapping
              AF.createFilter(
                AF.createJoin([
                  AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                  AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
                ]),
                AF.createOperatorExpression('+', [
                  AF.createTermExpression(DF.variable('s')),
                  AF.createTermExpression(DF.variable('x')),
                ]),
              ),
              // Not overlapping
              AF.createJoin([
                AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('o1')),
              ]),
            ]),
          );
        });

        it('is not pushed down for for empty joins', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createJoin([]),
          )).toEqual(
            AF.createFilter(
              AF.createJoin([]),
              AF.createTermExpression(DF.variable('s')),
            ),
          );
        });
      });

      describe('for a nop operation', () => {
        it('is voided', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createNop(),
          )).toEqual(
            AF.createNop(),
          );
        });
      });

      describe('for a project operation', () => {
        it('is pushed down when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('s'), DF.variable('p') ],
            ),
          )).toEqual(
            AF.createProject(
              AF.createFilter(
                AF.createBgp([]),
                AF.createTermExpression(DF.variable('s')),
              ),
              [ DF.variable('s'), DF.variable('p') ],
            ),
          );
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('s'), DF.variable('p') ],
            ),
          )).toEqual(
            AF.createUnion([]),
          );
        });

        it('is voided when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('a') ],
            ),
          )).toEqual(
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('a') ],
            ),
          );
        });
      });

      describe('for a union operation', () => {
        it('is pushed down for fully-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createUnion([
              AF.createFilter(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createTermExpression(DF.variable('s')),
              ),
              AF.createFilter(
                AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
                AF.createTermExpression(DF.variable('s')),
              ),
            ]),
          );
        });

        it('is not pushed down for partially-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('s')),
              AF.createTermExpression(DF.variable('x')),
            ]),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createFilter(
              AF.createUnion([
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              ]),
              AF.createOperatorExpression('+', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.variable('x')),
              ]),
            ),
          );
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createUnion([]),
          );
        });

        it('is voided for non-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual(
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          );
        });

        it('is pushed down for fully-, partially-, and not-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('s')),
              AF.createTermExpression(DF.variable('x')),
            ]),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              AF.createPattern(DF.variable('s'), DF.variable('x'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('o1')),
            ]),
          )).toEqual(
            AF.createUnion([
              // Fully overlapping
              AF.createUnion([
                AF.createFilter(
                  AF.createPattern(DF.variable('s'), DF.variable('x'), DF.namedNode('o1')),
                  AF.createOperatorExpression('+', [
                    AF.createTermExpression(DF.variable('s')),
                    AF.createTermExpression(DF.variable('x')),
                  ]),
                ),
              ]),
              // Partially overlapping
              AF.createFilter(
                AF.createUnion([
                  AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                  AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
                ]),
                AF.createOperatorExpression('+', [
                  AF.createTermExpression(DF.variable('s')),
                  AF.createTermExpression(DF.variable('x')),
                ]),
              ),
              // Not overlapping
              AF.createUnion([
                AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('o1')),
              ]),
            ]),
          );
        });
      });

      describe('for a values operation', () => {
        it('is kept when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createValues(
              [ DF.variable('s'), DF.variable('p') ],
              [],
            ),
          )).toEqual(
            AF.createFilter(
              AF.createValues(
                [ DF.variable('s'), DF.variable('p') ],
                [],
              ),
              AF.createTermExpression(DF.variable('s')),
            ),
          );
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createValues(
              [ DF.variable('s'), DF.variable('p') ],
              [],
            ),
          )).toEqual(
            AF.createUnion([]),
          );
        });

        it('is voided when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createValues(
              [ DF.variable('a') ],
              [],
            ),
          )).toEqual(
            AF.createValues(
              [ DF.variable('a') ],
              [],
            ),
          );
        });
      });

      describe('for other operations', () => {
        it('is not pushed down', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createLeftJoin(
              AF.createNop(),
              AF.createNop(),
            ),
          )).toEqual(
            AF.createFilter(
              AF.createLeftJoin(
                AF.createNop(),
                AF.createNop(),
              ),
              AF.createTermExpression(DF.variable('s')),
            ),
          );
        });
      });
    });

    describe('variablesIntersect', () => {
      it('returns false for non-overlapping', async() => {
        expect(actor.variablesIntersect(
          [ DF.variable('a1') ],
          [ DF.variable('a2') ],
        )).toBeFalsy();
        expect(actor.variablesIntersect(
          [ DF.variable('a1'), DF.variable('b1') ],
          [ DF.variable('a2'), DF.variable('b2') ],
        )).toBeFalsy();
        expect(actor.variablesIntersect(
          [],
          [ DF.variable('a2'), DF.variable('b2') ],
        )).toBeFalsy();
        expect(actor.variablesIntersect(
          [ DF.variable('a1'), DF.variable('b1') ],
          [],
        )).toBeFalsy();
        expect(actor.variablesIntersect(
          [],
          [],
        )).toBeFalsy();
      });

      it('returns true for equality', async() => {
        expect(actor.variablesIntersect(
          [ DF.variable('a') ],
          [ DF.variable('a') ],
        )).toBeTruthy();
        expect(actor.variablesIntersect(
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('a'), DF.variable('b') ],
        )).toBeTruthy();
      });

      it('returns true for subsets', async() => {
        expect(actor.variablesIntersect(
          [ DF.variable('a') ],
          [ DF.variable('a'), DF.variable('b') ],
        )).toBeTruthy();
        expect(actor.variablesIntersect(
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('a'), DF.variable('c'), DF.variable('b') ],
        )).toBeTruthy();
      });

      it('returns true for one common element', async() => {
        expect(actor.variablesIntersect(
          [ DF.variable('a'), DF.variable('c') ],
          [ DF.variable('a'), DF.variable('b') ],
        )).toBeTruthy();
        expect(actor.variablesIntersect(
          [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
          [ DF.variable('d'), DF.variable('a'), DF.variable('f') ],
        )).toBeTruthy();
      });
    });

    describe('variablesSubSetOf', () => {
      it('returns false for non-overlapping', async() => {
        expect(actor.variablesSubSetOf(
          [ DF.variable('a1') ],
          [ DF.variable('a2') ],
        )).toBeFalsy();
        expect(actor.variablesSubSetOf(
          [ DF.variable('a1'), DF.variable('b1') ],
          [ DF.variable('a2'), DF.variable('b2') ],
        )).toBeFalsy();
        expect(actor.variablesSubSetOf(
          [ DF.variable('a1'), DF.variable('b1') ],
          [],
        )).toBeFalsy();
      });

      it('returns true for equality', async() => {
        expect(actor.variablesSubSetOf(
          [ DF.variable('a') ],
          [ DF.variable('a') ],
        )).toBeTruthy();
        expect(actor.variablesSubSetOf(
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('a'), DF.variable('b') ],
        )).toBeTruthy();
      });

      it('returns true for subsets', async() => {
        expect(actor.variablesSubSetOf(
          [ DF.variable('a') ],
          [ DF.variable('a'), DF.variable('b') ],
        )).toBeTruthy();
        expect(actor.variablesSubSetOf(
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('a'), DF.variable('c'), DF.variable('b') ],
        )).toBeTruthy();
        expect(actor.variablesSubSetOf(
          [],
          [ DF.variable('a2'), DF.variable('b2') ],
        )).toBeTruthy();
        expect(actor.variablesSubSetOf(
          [],
          [],
        )).toBeTruthy();
      });

      it('returns false for only one common element', async() => {
        expect(actor.variablesSubSetOf(
          [ DF.variable('a'), DF.variable('c') ],
          [ DF.variable('a'), DF.variable('b') ],
        )).toBeFalsy();
        expect(actor.variablesSubSetOf(
          [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
          [ DF.variable('d'), DF.variable('a'), DF.variable('f') ],
        )).toBeFalsy();
      });
    });
  });
});
