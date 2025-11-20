import { QuerySourceSparql } from '@comunica/actor-query-source-identify-hypermedia-sparql';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource, getExpressionVariables } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationFilterPushdown } from '../lib/ActorOptimizeQueryOperationFilterPushdown';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationFilterPushdown', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationFilterPushdown instance', () => {
    let actor: ActorOptimizeQueryOperationFilterPushdown;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationFilterPushdown({
        name: 'actor',
        bus,
        aggressivePushdown: true,
        maxIterations: 10,
        splitConjunctive: true,
        mergeConjunctive: true,
        pushIntoLeftJoins: false,
        pushEqualityIntoPatterns: true,
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext(), operation: AF.createNop() })).resolves.toPassTestVoid();
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

      it('for an operation with filter with aggressivePushdown false', async() => {
        actor = new ActorOptimizeQueryOperationFilterPushdown({
          name: 'actor',
          bus,
          aggressivePushdown: false,
          maxIterations: 10,
          splitConjunctive: true,
          mergeConjunctive: true,
          pushIntoLeftJoins: false,
          pushEqualityIntoPatterns: true,
        });

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
        expect(operationOut).toEqual(operationIn);
      });

      it('for an operation with filter with source annotation without context', async() => {
        const src1 = <any> {
          source: {
            getSelectorShape() {
              return {};
            },
          },
        };
        const operationIn = AF.createFilter(
          AF.createProject(
            AF.createBgp([
              assignOperationSource(AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')), src1),
            ]),
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
            AF.createBgp([
              assignOperationSource(AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')), src1),
            ]),
            AF.createTermExpression(DF.variable('s')),
          ),
          [ DF.variable('s'), DF.variable('p') ],
        ));
      });

      it('for an operation with filter with source annotation with context', async() => {
        const src1 = <any> {
          source: {
            getSelectorShape() {
              return {};
            },
          },
          context: new ActionContext({ a: 'b' }),
        };
        const operationIn = AF.createFilter(
          AF.createProject(
            AF.createBgp([
              assignOperationSource(AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')), src1),
            ]),
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
            AF.createBgp([
              assignOperationSource(AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')), src1),
            ]),
            AF.createTermExpression(DF.variable('s')),
          ),
          [ DF.variable('s'), DF.variable('p') ],
        ));
      });

      it('for an operation with conjunctive filter', async() => {
        const operationIn = AF.createFilter(
          AF.createJoin([
            AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
            AF.createPattern(DF.variable('s2'), DF.namedNode('p'), DF.namedNode('o')),
          ]),
          AF.createOperatorExpression(
            '&&',
            [
              AF.createTermExpression(DF.variable('s1')),
              AF.createTermExpression(DF.variable('s2')),
            ],
          ),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(AF.createJoin([
          AF.createFilter(
            AF.createPattern(DF.variable('s2'), DF.namedNode('p'), DF.namedNode('o')),
            AF.createTermExpression(DF.variable('s2')),
          ),
          AF.createFilter(
            AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
            AF.createTermExpression(DF.variable('s1')),
          ),
        ]));
      });

      it('for an operation with conjunctive filter with splitConjunctive false', async() => {
        actor = new ActorOptimizeQueryOperationFilterPushdown({
          name: 'actor',
          bus,
          aggressivePushdown: true,
          maxIterations: 10,
          splitConjunctive: false,
          mergeConjunctive: true,
          pushIntoLeftJoins: false,
          pushEqualityIntoPatterns: true,
        });

        const operationIn = AF.createFilter(
          AF.createJoin([
            AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
            AF.createPattern(DF.variable('s2'), DF.namedNode('p'), DF.namedNode('o')),
          ]),
          AF.createOperatorExpression(
            '&&',
            [
              AF.createTermExpression(DF.variable('s1')),
              AF.createTermExpression(DF.variable('s2')),
            ],
          ),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(operationIn);
      });

      it('for an operation with nested filters', async() => {
        const operationIn = AF.createFilter(
          AF.createFilter(
            AF.createFilter(
              AF.createPattern(DF.variable('s1'), DF.variable('s2'), DF.variable('s3')),
              AF.createTermExpression(DF.variable('s3')),
            ),
            AF.createTermExpression(DF.variable('s2')),
          ),
          AF.createTermExpression(DF.variable('s1')),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(AF.createFilter(
          AF.createPattern(DF.variable('s1'), DF.variable('s2'), DF.variable('s3')),
          AF.createOperatorExpression('&&', [
            AF.createTermExpression(DF.variable('s3')),
            AF.createOperatorExpression('&&', [
              AF.createTermExpression(DF.variable('s2')),
              AF.createTermExpression(DF.variable('s1')),
            ]),
          ]),
        ));
      });

      it('for an operation with nested filters with mergeConjunctive false', async() => {
        actor = new ActorOptimizeQueryOperationFilterPushdown({
          name: 'actor',
          bus,
          aggressivePushdown: true,
          maxIterations: 10,
          splitConjunctive: true,
          mergeConjunctive: false,
          pushIntoLeftJoins: false,
          pushEqualityIntoPatterns: true,
        });

        const operationIn = AF.createFilter(
          AF.createFilter(
            AF.createFilter(
              AF.createPattern(DF.variable('s1'), DF.variable('s2'), DF.variable('s3')),
              AF.createTermExpression(DF.variable('s3')),
            ),
            AF.createTermExpression(DF.variable('s2')),
          ),
          AF.createTermExpression(DF.variable('s1')),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(AF.createFilter(
          AF.createFilter(
            AF.createFilter(
              AF.createPattern(DF.variable('s1'), DF.variable('s2'), DF.variable('s3')),
              AF.createTermExpression(DF.variable('s1')),
            ),
            AF.createTermExpression(DF.variable('s2')),
          ),
          AF.createTermExpression(DF.variable('s3')),
        ));
      });
    });

    describe('shouldAttemptPushDown', () => {
      beforeEach(() => {
        actor = new ActorOptimizeQueryOperationFilterPushdown({
          name: 'actor',
          bus,
          aggressivePushdown: false,
          maxIterations: 10,
          splitConjunctive: true,
          mergeConjunctive: true,
          pushIntoLeftJoins: true,
          pushEqualityIntoPatterns: true,
        });
      });

      it('returns true if aggressivePushdown is true', () => {
        actor = new ActorOptimizeQueryOperationFilterPushdown({
          name: 'actor',
          bus,
          aggressivePushdown: true,
          maxIterations: 10,
          splitConjunctive: true,
          mergeConjunctive: true,
          pushIntoLeftJoins: true,
          pushEqualityIntoPatterns: true,
        });
        const op = AF.createFilter(null!, null!);
        expect(actor.shouldAttemptPushDown(op, [], new Map())).toBeTruthy();
      });

      it('returns true if the filter is extremely selective (1)', () => {
        const op = AF.createFilter(AF.createNop(), AF.createOperatorExpression(
          '=',
          [
            AF.createTermExpression(DF.variable('s')),
            AF.createTermExpression(DF.namedNode('iri')),
          ],
        ));
        expect(actor.shouldAttemptPushDown(op, [], new Map())).toBeTruthy();
      });

      it('returns true if the filter is extremely selective (2)', () => {
        const op = AF.createFilter(AF.createNop(), AF.createOperatorExpression(
          '=',
          [
            AF.createTermExpression(DF.namedNode('iri')),
            AF.createTermExpression(DF.variable('s')),
          ],
        ));
        expect(actor.shouldAttemptPushDown(op, [], new Map())).toBeTruthy();
      });

      it('returns false if comunica supports the extensionFunction, but a source doesnt', async() => {
        const op = AF.createFilter(
          AF.createNop(),
          AF.createNamedExpression(DF.namedNode('https://example.com/functions#mock'), [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('b')),
          ]),
        );
        const src = <any> {};
        const shapes = new Map();
        shapes.set(src, {
          type: 'operation',
          operation: { operationType: 'wildcard' },
          joinBindings: true,
        });
        const extensionFunctions = {
          'https://example.com/functions#mock': async(args: any) => args[0],
        };
        expect(actor.shouldAttemptPushDown(op, [ src ], shapes, extensionFunctions)).toBeFalsy();
      });

      it('returns true if both comunica and all sources support the extensionFunction', async() => {
        const op = AF.createFilter(
          AF.createNop(),
          AF.createNamedExpression(DF.namedNode('https://example.com/functions#mock'), [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('b')),
          ]),
        );
        const src: IQuerySourceWrapper = {
          source: new QuerySourceSparql(
            'https://example.com/src',
            'https://example.com/src',
            new ActionContext(),
            <any> {},
            <any> {},
            'values',
            <any> {},
            <any> {},
            <any> {},
            false,
            64,
            10,
            true,
            true,
            0,
            false,
            { extensionFunctions: [ 'https://example.com/functions#mock' ]},
          ),
        };
        const extensionFunctions = {
          'https://example.com/functions#mock': async(args: any) => args[0],
        };
        const context = new ActionContext().set(KeysInitQuery.extensionFunctions, extensionFunctions);
        const shapes = new Map();
        shapes.set(src, await src.source.getSelectorShape(context));
        expect(actor.shouldAttemptPushDown(op, [ src ], shapes, extensionFunctions)).toBeTruthy();
      });

      it('returns true if comunica and some sources support the extensionFunction, but not all sources', async() => {
        const op = AF.createFilter(
          AF.createNop(),
          AF.createNamedExpression(DF.namedNode('https://example.com/functions#mock'), [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('b')),
          ]),
        );
        const src1: IQuerySourceWrapper = {
          source: new QuerySourceSparql(
            'https://example.com/src',
            'https://example.com/src',
            new ActionContext(),
            <any> {},
            <any> {},
            'values',
            <any> {},
            <any> {},
            <any> {},
            false,
            64,
            10,
            true,
            true,
            0,
            false,
            { extensionFunctions: [ 'https://example.com/functions#mock' ]},
          ),
        };
        const src2 = <any> {};
        const extensionFunctions = {
          'https://example.com/functions#mock': async(args: any) => args[0],
        };
        const context = new ActionContext().set(KeysInitQuery.extensionFunctions, extensionFunctions);
        const shapes = new Map();
        shapes.set(src1, await src1.source.getSelectorShape(context));
        shapes.set(src2, {
          type: 'operation',
          operation: { operationType: 'wildcard' },
          joinBindings: true,
        });
        expect(actor.shouldAttemptPushDown(op, [ src1, src2 ], shapes, extensionFunctions)).toBeTruthy();
      });

      it('returns true if federated with filter support for one', () => {
        const src1 = <any> {};
        const src2 = <any> {};
        const op = AF.createFilter(
          AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
              src1,
            ),
            assignOperationSource(
              AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
              src2,
            ),
          ]),
          AF.createTermExpression(DF.variable('v')),
        );
        const shapes = new Map();
        shapes.set(src1, {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.Types.NOP,
          },
        });
        shapes.set(src2, {
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
        });
        expect(actor.shouldAttemptPushDown(op, [ src1, src2 ], shapes)).toBeTruthy();
      });

      it('returns false if federated with filter support for none', () => {
        const src1 = <any> {};
        const src2 = <any> {};
        const op = AF.createFilter(
          AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
              src1,
            ),
            assignOperationSource(
              AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
              src2,
            ),
          ]),
          AF.createTermExpression(DF.variable('v')),
        );
        const shapes = new Map();
        shapes.set(src1, {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.Types.NOP,
          },
        });
        shapes.set(src2, {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.Types.NOP,
          },
        });
        expect(actor.shouldAttemptPushDown(op, [ src1, src2 ], shapes)).toBeFalsy();
      });

      it('returns false otherwise', () => {
        const src1 = <any> {};
        const op = AF.createFilter(
          AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.variable('s1'), DF.namedNode('p'), DF.namedNode('o')),
              src1,
            ),
            assignOperationSource(
              AF.createPattern(DF.variable('s2'), DF.namedNode('p'), DF.namedNode('o')),
              src1,
            ),
          ]),
          AF.createTermExpression(DF.variable('v')),
        );
        const shapes = new Map();
        shapes.set(src1, {
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.Types.PATTERN,
          },
        });
        expect(actor.shouldAttemptPushDown(op, [], shapes)).toBeFalsy();
      });
    });

    describe('getExpressionVariables', () => {
      it('returns undefined for aggregates', async() => {
        expect(() => getExpressionVariables(
          AF.createAggregateExpression('sum', AF.createTermExpression(DF.namedNode('s')), true),
        )).toThrow(`Getting expression variables is not supported for aggregate`);
      });

      it('returns undefined for wildcard', async() => {
        expect(() => getExpressionVariables(
          AF.createWildcardExpression(),
        )).toThrow(`Getting expression variables is not supported for wildcard`);
      });

      it('returns undefined for existence', async() => {
        expect(getExpressionVariables(
          AF.createExistenceExpression(false, AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.variable('o'))),
        )).toEqual([
          DF.variable('p'),
          DF.variable('o'),
        ]);
      });

      it('returns empty array for a named expression', async() => {
        expect(getExpressionVariables(
          AF.createNamedExpression(DF.namedNode('s'), []),
        )).toEqual([]);
      });

      it('returns a variable for a term expression with a variable', async() => {
        expect(getExpressionVariables(
          AF.createTermExpression(DF.variable('s')),
        )).toEqual([ DF.variable('s') ]);
      });

      it('returns an empty array for a term expression with a named node', async() => {
        expect(getExpressionVariables(
          AF.createTermExpression(DF.namedNode('s')),
        )).toEqual([]);
      });

      it('returns for an operator expression with variables', async() => {
        expect(getExpressionVariables(
          AF.createOperatorExpression('+', [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('b')),
          ]),
        )).toEqual([ DF.variable('a'), DF.variable('b') ]);
      });

      it('returns for an operator expression with duplicate variables', async() => {
        expect(getExpressionVariables(
          AF.createOperatorExpression('+', [
            AF.createTermExpression(DF.variable('a')),
            AF.createTermExpression(DF.variable('a')),
          ]),
        )).toEqual([ DF.variable('a') ]);
      });

      it('returns for a nested operator expression with variables', async() => {
        expect(getExpressionVariables(
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
        expect(getExpressionVariables(
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
          getExpressionVariables(expression),
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
          )).toEqual([ true, AF.createExtend(
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.namedNode('s'))),
            DF.variable('v'),
            AF.createTermExpression(DF.namedNode('o')),
          ) ]);
        });

        it('is not pushed down when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('v')),
            AF.createExtend(AF.createBgp([]), DF.variable('v'), AF.createTermExpression(DF.namedNode('o'))),
          )).toEqual([ false, AF.createFilter(
            AF.createExtend(
              AF.createBgp([]),
              DF.variable('v'),
              AF.createTermExpression(DF.namedNode('o')),
            ),
            AF.createTermExpression(DF.variable('v')),
          ) ]);
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createExtend(AF.createBgp([]), DF.variable('v'), AF.createTermExpression(DF.namedNode('o'))),
          )).toEqual([ true, AF.createUnion([]) ]);
        });
      });

      describe('for a filter operation', () => {
        it('is not pushed down when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('b'))),
          )).toEqual([ false, AF.createFilter(
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('a'))),
            AF.createTermExpression(DF.variable('b')),
          ) ]);
        });

        it('is pushed down without going deeper when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createFilter(
              AF.createBgp([]),
              AF.createOperatorExpression('id', [ AF.createTermExpression(DF.variable('a')) ]),
            ),
          )).toEqual([ false, AF.createFilter(
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('a'))),
            AF.createOperatorExpression('id', [ AF.createTermExpression(DF.variable('a')) ]),
          ) ]);
        });

        it('is pushed down deeper when variables overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createFilter(
              AF.createJoin([
                AF.createPattern(DF.variable('a'), DF.variable('a'), DF.variable('a')),
                AF.createPattern(DF.variable('b'), DF.variable('b'), DF.variable('b')),
              ]),
              AF.createOperatorExpression('id', [ AF.createTermExpression(DF.variable('a')) ]),
            ),
          )).toEqual([ true, AF.createFilter(
            AF.createJoin([
              AF.createFilter(
                AF.createPattern(DF.variable('a'), DF.variable('a'), DF.variable('a')),
                AF.createTermExpression(DF.variable('a')),
              ),
              AF.createPattern(DF.variable('b'), DF.variable('b'), DF.variable('b')),
            ]),
            AF.createOperatorExpression('id', [ AF.createTermExpression(DF.variable('a')) ]),
          ) ]);
        });

        it('is replaced with a no-op  for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createFilter(AF.createBgp([]), AF.createTermExpression(DF.variable('b'))),
          )).toEqual([ true, AF.createUnion([]) ]);
        });

        it('is not pushed down for existence expressions', async() => {
          expect(filterPushdown(
            AF.createExistenceExpression(false, AF.createNop()),
            AF.createJoin([
              AF.createPattern(DF.variable('a'), DF.variable('a'), DF.variable('a')),
              AF.createPattern(DF.variable('b'), DF.variable('b'), DF.variable('b')),
            ]),
          )).toEqual([ false, AF.createFilter(
            AF.createJoin([
              AF.createPattern(DF.variable('a'), DF.variable('a'), DF.variable('a')),
              AF.createPattern(DF.variable('b'), DF.variable('b'), DF.variable('b')),
            ]),
            AF.createExistenceExpression(false, AF.createNop()),
          ) ]);
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
          )).toEqual([ true, AF.createJoin([
            AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createTermExpression(DF.variable('s')),
            ),
            AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              AF.createTermExpression(DF.variable('s')),
            ),
          ]) ]);
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
          )).toEqual([ false, AF.createFilter(
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('s')),
              AF.createTermExpression(DF.variable('x')),
            ]),
          ) ]);
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual([ true, AF.createUnion([]) ]);
        });

        it('is voided for non-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual([ true, AF.createJoin([
            AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
            AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
          ]) ]);
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
          )).toEqual([ true, AF.createJoin([
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
          ]) ]);
        });

        it('is not pushed down for for empty joins', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createJoin([]),
          )).toEqual([ false, AF.createFilter(
            AF.createJoin([]),
            AF.createTermExpression(DF.variable('s')),
          ) ]);
        });
      });

      describe('for a nop operation', () => {
        it('is voided', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createNop(),
          )).toEqual([ true, AF.createNop() ]);
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
          )).toEqual([ true, AF.createProject(
            AF.createFilter(
              AF.createBgp([]),
              AF.createTermExpression(DF.variable('s')),
            ),
            [ DF.variable('s'), DF.variable('p') ],
          ) ]);
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('s'), DF.variable('p') ],
            ),
          )).toEqual([ true, AF.createUnion([]) ]);
        });

        it('is voided when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('a') ],
            ),
          )).toEqual([ true, AF.createProject(
            AF.createBgp([]),
            [ DF.variable('a') ],
          ) ]);
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
          )).toEqual([ true, AF.createUnion([
            AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createTermExpression(DF.variable('s')),
            ),
            AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              AF.createTermExpression(DF.variable('s')),
            ),
          ]) ]);
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
          )).toEqual([ false, AF.createFilter(
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
            AF.createOperatorExpression('+', [
              AF.createTermExpression(DF.variable('s')),
              AF.createTermExpression(DF.variable('x')),
            ]),
          ) ]);
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual([ true, AF.createUnion([]) ]);
        });

        it('is voided for non-overlapping variables', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('a')),
            AF.createUnion([
              AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
              AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          )).toEqual([ true, AF.createUnion([
            AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1')),
            AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
          ]) ]);
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
          )).toEqual([ true, AF.createUnion([
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
          ]) ]);
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
          )).toEqual([ false, AF.createFilter(
            AF.createValues(
              [ DF.variable('s'), DF.variable('p') ],
              [],
            ),
            AF.createTermExpression(DF.variable('s')),
          ) ]);
        });

        it('is replaced with a no-op for FILTER(false)', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.literal('false')),
            AF.createValues(
              [ DF.variable('s'), DF.variable('p') ],
              [],
            ),
          )).toEqual([ true, AF.createUnion([]) ]);
        });

        it('is voided when variables do not overlap', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createValues(
              [ DF.variable('a') ],
              [],
            ),
          )).toEqual([ true, AF.createValues(
            [ DF.variable('a') ],
            [],
          ) ]);
        });
      });

      describe('for a left-join operation', () => {
        describe('with pushIntoLeftJoins false', () => {
          it('is not pushed down', async() => {
            expect(filterPushdown(
              AF.createTermExpression(DF.variable('s')),
              AF.createLeftJoin(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('so'), DF.namedNode('p2'), DF.namedNode('o2')),
              ),
            )).toEqual([ false, AF.createFilter(
              AF.createLeftJoin(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('so'), DF.namedNode('p2'), DF.namedNode('o2')),
              ),
              AF.createTermExpression(DF.variable('s')),
            ) ]);
          });
        });

        describe('with pushIntoLeftJoins true', () => {
          beforeEach(() => {
            actor = new ActorOptimizeQueryOperationFilterPushdown({
              name: 'actor',
              bus,
              aggressivePushdown: true,
              maxIterations: 10,
              splitConjunctive: true,
              mergeConjunctive: true,
              pushIntoLeftJoins: true,
              pushEqualityIntoPatterns: true,
            });
          });

          it('is pushed down when right variables do no intersect', async() => {
            expect(filterPushdown(
              AF.createTermExpression(DF.variable('s')),
              AF.createLeftJoin(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('so'), DF.namedNode('p2'), DF.namedNode('o2')),
              ),
            )).toEqual([ true, AF.createLeftJoin(
              AF.createFilter(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createTermExpression(DF.variable('s')),
              ),
              AF.createPattern(DF.variable('so'), DF.namedNode('p2'), DF.namedNode('o2')),
            ) ]);
          });

          it('is not pushed down when right variables intersect', async() => {
            expect(filterPushdown(
              AF.createTermExpression(DF.variable('s')),
              AF.createLeftJoin(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              ),
            )).toEqual([ false, AF.createFilter(
              AF.createLeftJoin(
                AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
                AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.namedNode('o2')),
              ),
              AF.createTermExpression(DF.variable('s')),
            ) ]);
          });
        });
      });

      describe('for a pattern operation', () => {
        describe('with pushEqualityIntoPatterns true', () => {
          it('is pushed down for ?s=<s>', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
            )).toEqual([ true, AF.createJoin([
              AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: DF.namedNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for ?s=<s>, and keeps source annotations', async() => {
            const src1 = <any> {};
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
              assignOperationSource(AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')), src1),
            )).toEqual([ true, AF.createJoin([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o1')), src1),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: DF.namedNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for ?s=<s> into quoted triple', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
              AF.createPattern(
                DF.quad(DF.variable('s'), DF.variable('s'), DF.variable('s')),
                DF.variable('p'),
                DF.namedNode('o1'),
              ),
            )).toEqual([ true, AF.createJoin([
              AF.createPattern(
                DF.quad(DF.namedNode('s'), DF.namedNode('s'), DF.namedNode('s')),
                DF.variable('p'),
                DF.namedNode('o1'),
              ),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: DF.namedNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for <s>=?s', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.namedNode('s')),
                AF.createTermExpression(DF.variable('s')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
            )).toEqual([ true, AF.createJoin([
              AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: DF.namedNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for ?s=_:s', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.blankNode('s')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
            )).toEqual([ true, AF.createJoin([
              AF.createPattern(DF.blankNode('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: <any> DF.blankNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for ?o="o"', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createTermExpression(DF.literal('o')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            )).toEqual([ true, AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.literal('o')),
              AF.createValues(
                [ DF.variable('o') ],
                [{ o: DF.literal('o') }],
              ),
            ]) ]);
          });

          it('is pushed down for "o"=?o', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.literal('o')),
                AF.createTermExpression(DF.variable('o')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            )).toEqual([ true, AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.literal('o')),
              AF.createValues(
                [ DF.variable('o') ],
                [{ o: DF.literal('o') }],
              ),
            ]) ]);
          });

          it('is not pushed down for ?sother=<sother>', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('sother')),
                AF.createTermExpression(DF.namedNode('sother')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
            )).toEqual([ false, AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('sother')),
                AF.createTermExpression(DF.namedNode('sother')),
              ]),
            ) ]);
          });

          it('is not pushed down for ?o="01"^xsd:number', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createTermExpression(DF.literal('o', DF.namedNode('http://www.w3.org/2001/XMLSchema#number'))),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            )).toEqual([ false, AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createTermExpression(DF.literal('o', DF.namedNode('http://www.w3.org/2001/XMLSchema#number'))),
              ]),
            ) ]);
          });

          it('is not pushed down for "01"^xsd:number=?o', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.literal('o', DF.namedNode('http://www.w3.org/2001/XMLSchema#number'))),
                AF.createTermExpression(DF.variable('o')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            )).toEqual([ false, AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.literal('o', DF.namedNode('http://www.w3.org/2001/XMLSchema#number'))),
                AF.createTermExpression(DF.variable('o')),
              ]),
            ) ]);
          });

          it('is not pushed down for ?o=("a" + "b")', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createOperatorExpression('+', [
                  AF.createTermExpression(DF.literal('a')),
                  AF.createTermExpression(DF.literal('b')),
                ]),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            )).toEqual([ false, AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createOperatorExpression('+', [
                  AF.createTermExpression(DF.literal('a')),
                  AF.createTermExpression(DF.literal('b')),
                ]),
              ]),
            ) ]);
          });

          it('is not pushed down for ("a" + "b")=?o', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createOperatorExpression('+', [
                  AF.createTermExpression(DF.literal('a')),
                  AF.createTermExpression(DF.literal('b')),
                ]),
                AF.createTermExpression(DF.variable('o')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            )).toEqual([ false, AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
              AF.createOperatorExpression('=', [
                AF.createOperatorExpression('+', [
                  AF.createTermExpression(DF.literal('a')),
                  AF.createTermExpression(DF.literal('b')),
                ]),
                AF.createTermExpression(DF.variable('o')),
              ]),
            ) ]);
          });
        });

        describe('with pushEqualityIntoPatterns false', () => {
          beforeEach(() => {
            actor = new ActorOptimizeQueryOperationFilterPushdown({
              name: 'actor',
              bus,
              aggressivePushdown: true,
              maxIterations: 10,
              splitConjunctive: true,
              mergeConjunctive: true,
              pushIntoLeftJoins: true,
              pushEqualityIntoPatterns: false,
            });
          });

          it('is pushed down for ?s=<s>', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
            )).toEqual([ false, AF.createFilter(
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o1')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
            ) ]);
          });
        });
      });

      describe('for a path operation', () => {
        describe('with pushEqualityIntoPatterns true', () => {
          it('is pushed down for ?s=<s>', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.namedNode('o1')),
            )).toEqual([ true, AF.createJoin([
              AF.createPath(DF.namedNode('s'), AF.createNps([]), DF.namedNode('o1')),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: DF.namedNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for <s>=?s', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.namedNode('s')),
                AF.createTermExpression(DF.variable('s')),
              ]),
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.namedNode('o1')),
            )).toEqual([ true, AF.createJoin([
              AF.createPath(DF.namedNode('s'), AF.createNps([]), DF.namedNode('o1')),
              AF.createValues(
                [ DF.variable('s') ],
                [{ s: DF.namedNode('s') }],
              ),
            ]) ]);
          });

          it('is pushed down for ?o="o"', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createTermExpression(DF.literal('o')),
              ]),
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.variable('o')),
            )).toEqual([ true, AF.createJoin([
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.literal('o')),
              AF.createValues(
                [ DF.variable('o') ],
                [{ o: DF.literal('o') }],
              ),
            ]) ]);
          });

          it('is pushed down for "o"=?o', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.literal('o')),
                AF.createTermExpression(DF.variable('o')),
              ]),
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.variable('o')),
            )).toEqual([ true, AF.createJoin([
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.literal('o')),
              AF.createValues(
                [ DF.variable('o') ],
                [{ o: DF.literal('o') }],
              ),
            ]) ]);
          });

          it('is not pushed down for ?o="01"^xsd:number', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createTermExpression(DF.literal('o', DF.namedNode('http://www.w3.org/2001/XMLSchema#number'))),
              ]),
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.variable('o')),
            )).toEqual([ false, AF.createFilter(
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.variable('o')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('o')),
                AF.createTermExpression(DF.literal('o', DF.namedNode('http://www.w3.org/2001/XMLSchema#number'))),
              ]),
            ) ]);
          });
        });

        describe('with pushEqualityIntoPatterns false', () => {
          beforeEach(() => {
            actor = new ActorOptimizeQueryOperationFilterPushdown({
              name: 'actor',
              bus,
              aggressivePushdown: true,
              maxIterations: 10,
              splitConjunctive: true,
              mergeConjunctive: true,
              pushIntoLeftJoins: true,
              pushEqualityIntoPatterns: false,
            });
          });

          it('is not pushed down for ?s=<s>', async() => {
            expect(filterPushdown(
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.namedNode('o1')),
            )).toEqual([ false, AF.createFilter(
              AF.createPath(DF.variable('s'), AF.createNps([]), DF.namedNode('o1')),
              AF.createOperatorExpression('=', [
                AF.createTermExpression(DF.variable('s')),
                AF.createTermExpression(DF.namedNode('s')),
              ]),
            ) ]);
          });
        });
      });

      describe('for other operations', () => {
        it('is not pushed down', async() => {
          expect(filterPushdown(
            AF.createTermExpression(DF.variable('s')),
            AF.createMinus(
              AF.createNop(),
              AF.createNop(),
            ),
          )).toEqual([ false, AF.createFilter(
            AF.createMinus(
              AF.createNop(),
              AF.createNop(),
            ),
            AF.createTermExpression(DF.variable('s')),
          ) ]);
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
