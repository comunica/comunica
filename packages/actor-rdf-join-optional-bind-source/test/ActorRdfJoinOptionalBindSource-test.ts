import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinOptionalBindSource } from '../lib/ActorRdfJoinOptionalBindSource';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

function meta(cardinality: number, variables: string[], requestTime?: number): any {
  return {
    state: new MetadataValidationState(),
    cardinality: { type: 'estimate', value: cardinality },
    requestTime,
    pageSize: requestTime === undefined ? undefined : 100,
    variables: variables.map(variable => ({ variable: DF.variable(variable), canBeUndef: false })),
  };
}

describe('ActorRdfJoinOptionalBindSource', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
  let actor: ActorRdfJoinOptionalBindSource;
  let calls: { operation: Algebra.Operation; bindings: RDF.Bindings[]; context: IActionContext }[];
  let source: IQuerySourceWrapper;
  let sourceTriplePattern: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = <any> { mediate: async() => ({ selectivity: 0.8 }) };
    actor = new ActorRdfJoinOptionalBindSource({
      name: 'actor',
      bus,
      selectivityModifier: 0.000_001,
      blockSize: 2,
      mediatorJoinSelectivity,
    });
    calls = [];
    // A source with a match for ex:a1 and two matches for ex:a2, as a SPARQL endpoint joins VALUES
    const data: Record<string, string[]> = { 'ex:a1': [ 'ex:b1' ], 'ex:a2': [ 'ex:b2', 'ex:b3' ]};
    source = <any> {
      source: {
        getSelectorShape: async() => ({
          type: 'operation',
          operation: { operationType: 'wildcard' },
          joinBindings: true,
        }),
        queryBindings(operation: Algebra.Operation, ctx: IActionContext, options: any) {
          const results = options.joinBindings.bindings.toArray().then((bindings: RDF.Bindings[]) => {
            calls.push({ operation, bindings, context: ctx });
            return bindings.flatMap(binding => (data[binding.get(DF.variable('a'))?.value ?? ''] ?? [])
              .map(value => binding.set(DF.variable('b'), DF.namedNode(value))));
          });
          return <any> { toArray: () => results };
        },
      },
    };
    sourceTriplePattern = <any> {
      source: {
        getSelectorShape: async() => ({
          type: 'operation',
          operation: { operationType: 'type', type: Algebra.Types.PATTERN },
          joinBindings: true,
        }),
      },
    };
  });

  function getAction(
    left: RDF.Bindings[],
    rightSource: IQuerySourceWrapper | undefined,
    expression?: Algebra.Expression,
  ): IActionRdfJoin {
    const right = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('b'));
    return {
      type: 'optional',
      entries: [
        {
          output: <any> {
            type: 'bindings',
            bindingsStream: new ArrayIterator(left, { autoStart: false }),
            metadata: async() => meta(left.length, [ 'a', 'x' ]),
          },
          operation: AF.createPattern(DF.variable('x'), DF.namedNode('ex:q'), DF.variable('a')),
        },
        {
          output: <any> {
            type: 'bindings',
            bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
            metadata: async() => meta(100, [ 'a', 'b' ]),
          },
          operation: rightSource ? assignOperationSource(right, rightSource) : right,
        },
      ],
      expression,
      context,
    };
  }

  function row(a: RDF.Term, x: string): RDF.Bindings {
    return BF.bindings([[ DF.variable('a'), a ], [ DF.variable('x'), DF.namedNode(x) ]]);
  }

  describe('getJoinCoefficients', () => {
    it('rejects a right operation without source', async() => {
      await expect(actor.getJoinCoefficients(getAction([], undefined), {
        metadatas: [ meta(10, [ 'a', 'x' ]), meta(100, [ 'a', 'b' ]) ],
      })).resolves.toFailTest('Actor actor can only bind on a right operation with a source annotation');
    });

    it('rejects a source that can not handle join bindings for the operation', async() => {
      const action = getAction([], sourceTriplePattern, AF.createTermExpression(DF.literal('true')));
      await expect(actor.getJoinCoefficients(action, {
        metadatas: [ meta(10, [ 'a', 'x' ]), meta(100, [ 'a', 'b' ]) ],
      })).resolves.toFailTest('Actor actor detected a source that can not handle passing down join bindings');
    });

    it('rejects operations that can not be bound', async() => {
      const action = getAction([], source);
      action.entries[1].operation = assignOperationSource(
        AF.createExtend(action.entries[1].operation, DF.variable('c'), AF.createTermExpression(DF.literal('c'))),
        source,
      );
      await expect(actor.getJoinCoefficients(action, {
        metadatas: [ meta(10, [ 'a', 'x' ]), meta(100, [ 'a', 'b' ]) ],
      })).resolves.toFailTest('Actor actor can not bind on Extend, Group, or conflicting LeftJoin/Minus operations');
    });

    it('costs one request per block', async() => {
      await expect(actor.getJoinCoefficients(getAction([], source), {
        metadatas: [ meta(10, [ 'a', 'x' ], 2), meta(100, [ 'a', 'b' ], 4) ],
      })).resolves.toPassTest({
        iterations: 10 * 100 * 0.8 * 0.000_001 / 2,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0 + 10 * ((2 / 100) + (0 + 0.8 * 0.000_001 * 100 * (4 / 100)) / 2),
      });
    });
  });

  describe('getOutput', () => {
    it('joins blocks of left bindings in the source, and adds the left bindings without results', async() => {
      const action = getAction([
        row(DF.namedNode('ex:a1'), 'ex:x1'),
        row(DF.namedNode('ex:a0'), 'ex:x2'),
        row(DF.namedNode('ex:a2'), 'ex:x3'),
      ], source);
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream).toEqualBindingsStream([
        row(DF.namedNode('ex:a1'), 'ex:x1').set(DF.variable('b'), DF.namedNode('ex:b1')),
        row(DF.namedNode('ex:a0'), 'ex:x2'),
        row(DF.namedNode('ex:a2'), 'ex:x3').set(DF.variable('b'), DF.namedNode('ex:b2')),
        row(DF.namedNode('ex:a2'), 'ex:x3').set(DF.variable('b'), DF.namedNode('ex:b3')),
      ], true);
      expect(calls).toHaveLength(2);
      expect(calls[0].operation).toBe(action.entries[1].operation);
      expect(calls[0].bindings).toHaveLength(2);
      expect(calls[0].context).toBe(context);
      await expect(result.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: expect.any(Number) },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('x'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
    });

    it('joins the blocks in the buffer in parallel', async() => {
      const action = getAction([
        row(DF.namedNode('ex:a1'), 'ex:x1'),
        row(DF.namedNode('ex:a0'), 'ex:x2'),
        row(DF.namedNode('ex:a2'), 'ex:x3'),
      ], source);
      const queryBindings = source.source.queryBindings.bind(source.source);
      let pending = 0;
      let maxPending = 0;
      source.source.queryBindings = <any> ((operation: any, ctx: any, options: any) => {
        pending++;
        maxPending = Math.max(maxPending, pending);
        const results = new Promise(resolve => setTimeout(resolve, 10))
          .then(() => queryBindings(operation, ctx, options).toArray())
          .finally(() => pending--);
        return { toArray: () => results };
      });
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream.toArray()).resolves.toHaveLength(4);
      expect(maxPending).toBe(2);
    });

    it('emits errors of the source', async() => {
      const action = getAction([ row(DF.namedNode('ex:a1'), 'ex:x1') ], source);
      source.source.queryBindings = <any> (() => ({ toArray: () => Promise.reject(new Error('source error')) }));
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream.toArray()).rejects.toThrow('source error');
    });

    it('passes the join expression to the source as a filter, and the source context', async() => {
      source.context = new ActionContext({ x: 'y' });
      const expression = AF.createTermExpression(DF.literal('true'));
      const action = getAction([ row(DF.namedNode('ex:a1'), 'ex:x1') ], source, expression);
      const { result } = await (<any> actor).getOutput(action);
      await result.bindingsStream.toArray();
      expect(calls[0].operation.type).toBe(Algebra.Types.FILTER);
      expect(calls[0].context.get(<any> { name: 'x' })).toBe('y');
    });

    it('does not pass bindings with blank nodes for operation variables, and passes others as IRIs', async() => {
      const action = getAction([
        row(DF.blankNode('a'), 'ex:x1'),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a1') ],
          [ DF.variable('x'), DF.blankNode('x') ],
          [ DF.variable('y'), DF.literal('y') ],
        ]),
      ], source);
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream).toEqualBindingsStream([
        row(DF.blankNode('a'), 'ex:x1'),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a1') ],
          [ DF.variable('x'), DF.blankNode('x') ],
          [ DF.variable('y'), DF.literal('y') ],
          [ DF.variable('b'), DF.namedNode('ex:b1') ],
        ]),
      ], true);
      expect(calls).toHaveLength(1);
      expect(calls[0].bindings).toHaveLength(1);
      expect(calls[0].bindings[0].get(DF.variable('x')))
        .toEqual(DF.namedNode(`${ActorRdfJoinOptionalBindSource.BLANK_NODE_IRI_PREFIX}0`));
    });

    it('does not query the source if all bindings of a block have blank nodes for operation variables', async() => {
      const action = getAction([ row(DF.blankNode('a'), 'ex:x1') ], source);
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream).toEqualBindingsStream([ row(DF.blankNode('a'), 'ex:x1') ]);
      expect(calls).toHaveLength(0);
    });
  });

  describe('getVariableNames', () => {
    it('returns the variables of patterns and expressions, but not of metadata', () => {
      const pattern = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('b'));
      (<any> pattern).metadata = { x: DF.variable('m') };
      const operation = AF.createFilter(AF.createJoin([ pattern, pattern ]), AF.createTermExpression(DF.variable('c')));
      expect([ ...ActorRdfJoinOptionalBindSource.getVariableNames(operation) ].sort()).toEqual([ 'a', 'b', 'c' ]);
    });
  });
});
