import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinOptionalBindBlock } from '../lib/ActorRdfJoinOptionalBindBlock';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);
const rowVariable = DF.variable(ActorRdfJoinOptionalBindBlock.ROW_VARIABLE);

function meta(cardinality: number, variables: string[], canBeUndef = false): any {
  return {
    state: new MetadataValidationState(),
    cardinality: { type: 'estimate', value: cardinality },
    variables: variables.map(variable => ({ variable: DF.variable(variable), canBeUndef })),
  };
}

describe('ActorRdfJoinOptionalBindBlock', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
  let mediatorQueryOperation: any;
  let actor: ActorRdfJoinOptionalBindBlock;
  let operations: Algebra.Operation[];
  const right = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('b'));

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = <any> { mediate: async() => ({ selectivity: 0.8 }) };
    operations = [];
    // Joins each VALUES row with data that has a match for ex:a1, two for ex:a2, and ex:b0 for an unbound ?a
    const data: Record<string, string[]> = { 'ex:a1': [ 'ex:b1' ], 'ex:a2': [ 'ex:b2', 'ex:b3' ], '': [ 'ex:b0' ]};
    mediatorQueryOperation = {
      mediate: jest.fn(async({ operation }: { operation: Algebra.Operation }) => {
        operations.push(operation);
        const join = operation.type === Algebra.Types.FILTER ? (<Algebra.Filter> operation).input : operation;
        const values = <Algebra.Values> (<Algebra.Join> join).input[0];
        const results = values.bindings.flatMap(row => (data[row.a?.value ?? ''] ?? [])
          .map(value => BF.bindings([
            ...Object.entries(row).map(([ key, term ]) => <[RDF.Variable, RDF.Term]> [ DF.variable(key), term ]),
            [ DF.variable('b'), DF.namedNode(value) ],
          ])));
        return { type: 'bindings', bindingsStream: new ArrayIterator(results, { autoStart: false }) };
      }),
    };
    actor = new ActorRdfJoinOptionalBindBlock({
      name: 'actor',
      bus,
      selectivityModifier: 0.000_001,
      blockSize: 2,
      maxBlockBindings: 4,
      mediatorJoinSelectivity,
      mediatorQueryOperation,
    });
  });

  function createAction(left: RDF.Bindings[], expression?: Algebra.Expression): IActionRdfJoin {
    return {
      type: 'optional',
      entries: [
        {
          output: <any> {
            type: 'bindings',
            bindingsStream: new ArrayIterator(left, { autoStart: false }),
            metadata: async() => meta(left.length, [ 'a', 'c' ], true),
          },
          operation: AF.createPattern(DF.variable('a'), DF.namedNode('ex:q'), DF.variable('c')),
        },
        {
          output: <any> {
            type: 'bindings',
            bindingsStream: new ArrayIterator([], { autoStart: false }),
            metadata: async() => meta(10, [ 'a', 'b' ]),
          },
          operation: right,
        },
      ],
      expression,
      context,
    };
  }

  describe('getJoinCoefficients', () => {
    it('should reject a right operation with a single source annotation', async() => {
      const action = createAction([]);
      action.entries[1].operation = assignOperationSource(right, <any> {});
      await expect(actor.getJoinCoefficients(action, { metadatas: [ meta(2, [ 'a' ]), meta(10, [ 'a', 'b' ]) ]}))
        .resolves.toFailTest('Actor actor can only join a right operation without a single source annotation');
    });

    it('should estimate one request per block', async() => {
      await expect(actor.getJoinCoefficients(createAction([]), {
        metadatas: [ meta(4, [ 'a' ]), meta(10, [ 'a', 'b' ]) ],
      })).resolves.toPassTest({
        iterations: 4 * 10 * 0.8 * 0.000_001 / 2,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });
  });

  describe('getOutput', () => {
    it('should join blocks with the right operation, and add left bindings without results', async() => {
      const a1 = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ], [ DF.variable('c'), DF.literal('1') ]]);
      const a1Again = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ], [ DF.variable('c'), DF.literal('2') ]]);
      const a2 = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a2') ]]);
      const a3 = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a3') ]]);
      const blank = BF.bindings([[ DF.variable('a'), DF.blankNode('x') ]]);
      const unbound = BF.bindings([[ DF.variable('c'), DF.literal('3') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ a1, a1Again, a2, a3, blank, unbound ]));
      expect(await (<any> result).bindingsStream.toArray()).toEqualBindingsArray([
        a1.set(DF.variable('b'), DF.namedNode('ex:b1')),
        a1Again.set(DF.variable('b'), DF.namedNode('ex:b1')),
        a2.set(DF.variable('b'), DF.namedNode('ex:b2')),
        a2.set(DF.variable('b'), DF.namedNode('ex:b3')),
        a3,
        blank,
        unbound.set(DF.variable('b'), DF.namedNode('ex:b0')),
      ], true);
      // Blocks of at most two distinct keys, of which the bindings with the same key share a row
      expect(operations.map(operation => (<Algebra.Values> (<Algebra.Join> operation).input[0]).bindings))
        .toEqual([
          [
            { a: DF.namedNode('ex:a1'), [rowVariable.value]: DF.literal('0') },
            { a: DF.namedNode('ex:a2'), [rowVariable.value]: DF.literal('1') },
          ],
          [{ a: DF.namedNode('ex:a3'), [rowVariable.value]: DF.literal('0') }],
          [{ [rowVariable.value]: DF.literal('0') }],
        ]);
      expect((<Algebra.Values> (<Algebra.Join> operations[0]).input[0]).variables)
        .toEqual([ DF.variable('a'), rowVariable ]);
      expect((<Algebra.Join> operations[0]).input[1]).toBe(right);
      await expect((<any> result).metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: expect.any(Number) },
        variables: [
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('c'), canBeUndef: true },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
    });

    it('should filter the joined block by the expression', async() => {
      const expression = AF.createTermExpression(DF.variable('c'));
      const a1 = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ], [ DF.variable('c'), DF.literal('1') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ a1 ], expression));
      await expect((<any> result).bindingsStream.toArray()).resolves.toHaveLength(1);
      expect(operations[0].type).toBe(Algebra.Types.FILTER);
      expect((<Algebra.Filter> operations[0]).expression).toBe(expression);
      // Variables of the expression are passed as well
      expect((<Algebra.Values> (<Algebra.Join> (<Algebra.Filter> operations[0]).input).input[0]).variables)
        .toEqual([ DF.variable('a'), DF.variable('c'), rowVariable ]);
    });

    it('should not evaluate the right operation for blocks without passable values', async() => {
      const blank = BF.bindings([[ DF.variable('a'), DF.blankNode('x') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ blank ]));
      await expect((<any> result).bindingsStream.toArray()).resolves.toEqual([ blank ]);
      expect(mediatorQueryOperation.mediate).not.toHaveBeenCalled();
    });

    it('should emit errors of evaluating a block', async() => {
      mediatorQueryOperation.mediate = jest.fn(async() => {
        throw new Error('block failed');
      });
      const a1 = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ a1 ]));
      await expect((<any> result).bindingsStream.toArray()).rejects.toThrow('block failed');
    });
  });
});
