import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource, getOperationSource } from '@comunica/utils-query-operation';
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
        // A materialized pattern of a binding with a blank node has a match for _:x, and a conflicting one for _:y
        if (operation.type === Algebra.Types.PATTERN) {
          const subject = (<Algebra.Pattern> operation).subject;
          const results = subject.equals(DF.blankNode('x')) ?
              [ BF.bindings([[ DF.variable('b'), DF.namedNode('ex:bx') ]]) ] :
              [ BF.bindings([
                [ DF.variable('a'), DF.namedNode('ex:other') ],
                [ DF.variable('b'), DF.namedNode('ex:by') ],
              ]) ];
          return { type: 'bindings', bindingsStream: new ArrayIterator(results, { autoStart: false }) };
        }
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
      await expect((result).bindingsStream.toArray()).resolves.toEqualBindingsArray([
        a1.set(DF.variable('b'), DF.namedNode('ex:b1')),
        a1Again.set(DF.variable('b'), DF.namedNode('ex:b1')),
        a2.set(DF.variable('b'), DF.namedNode('ex:b2')),
        a2.set(DF.variable('b'), DF.namedNode('ex:b3')),
        a3,
        blank.set(DF.variable('b'), DF.namedNode('ex:bx')),
        unbound.set(DF.variable('b'), DF.namedNode('ex:b0')),
      ], true);
      // Blocks of at most two distinct keys, of which the bindings with the same key share a row
      expect(operations
        .filter(operation => operation.type === Algebra.Types.JOIN)
        .map(operation => (<Algebra.Values> (<Algebra.Join> operation).input[0]).bindings))
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
      await expect((result).metadata()).resolves.toEqual({
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
      await expect((result).bindingsStream.toArray()).resolves.toHaveLength(1);
      expect(operations[0].type).toBe(Algebra.Types.FILTER);
      expect((<Algebra.Filter> operations[0]).expression).toBe(expression);
      // Variables of the expression are passed as well
      expect((<Algebra.Values> (<Algebra.Join> (<Algebra.Filter> operations[0]).input).input[0]).variables)
        .toEqual([ DF.variable('a'), DF.variable('c'), rowVariable ]);
    });

    it('should join blocks with each branch of a union', async() => {
      const branch1 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b'));
      const branch2 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.variable('b'));
      const action = createAction([
        BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ]]),
        BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a2') ]]),
      ]);
      action.entries[1].operation = AF.createUnion([ branch1, branch2 ]);
      jest.spyOn(mediatorQueryOperation, 'mediate').mockImplementation(async() => ({
        type: 'bindings',
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
            [ DF.variable('b'), DF.namedNode('ex:b2') ],
            [ rowVariable, DF.literal('1') ],
          ]),
        ], { autoStart: false }),
      }));
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream.toArray()).resolves.toEqualBindingsArray([
        BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ]]),
        BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a2') ], [ DF.variable('b'), DF.namedNode('ex:b2') ]]),
      ]);
      const operation = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
      const values = AF.createValues([ DF.variable('a'), rowVariable ], [
        { a: DF.namedNode('ex:a1'), [rowVariable.value]: DF.literal('0') },
        { a: DF.namedNode('ex:a2'), [rowVariable.value]: DF.literal('1') },
      ]);
      expect(operation).toEqual(AF.createUnion([
        AF.createJoin([ values, branch1 ]),
        AF.createJoin([ values, branch2 ]),
      ]));
    });

    it('should keep the source annotation of union branches that are joins', async() => {
      const source = <any> { source: {}};
      const branch1 = assignOperationSource(AF.createJoin([
        AF.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('x')),
        AF.createPattern(DF.variable('x'), DF.namedNode('ex:p2'), DF.variable('b')),
      ]), source);
      const branch2 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p3'), DF.variable('b'));
      const action = createAction([ BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ]]) ]);
      action.entries[1].operation = AF.createUnion([ branch1, branch2 ]);
      jest.spyOn(mediatorQueryOperation, 'mediate').mockImplementation(async() => ({
        type: 'bindings',
        bindingsStream: new ArrayIterator([], { autoStart: false }),
      }));
      const { result } = await (<any> actor).getOutput(action);
      await expect(result.bindingsStream.toArray()).resolves.toHaveLength(1);
      const operation = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
      expect(operation.input[0].input).toHaveLength(2);
      expect(operation.input[0].input[1]).toBe(branch1);
      expect(getOperationSource(operation.input[0].input[1])).toBe(source);
    });

    it('should bind bindings with blank nodes into the right operation one by one', async() => {
      const blank = BF.bindings([[ DF.variable('a'), DF.blankNode('x') ], [ DF.variable('c'), DF.literal('1') ]]);
      const blankAgain = BF.bindings([[ DF.variable('a'), DF.blankNode('x') ], [ DF.variable('c'), DF.literal('2') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ blank, blankAgain ]));
      await expect((result).bindingsStream.toArray()).resolves.toEqualBindingsArray([
        blank.set(DF.variable('b'), DF.namedNode('ex:bx')),
        blankAgain.set(DF.variable('b'), DF.namedNode('ex:bx')),
      ]);
      // Bindings with the same values share the evaluation, and no VALUES are evaluated
      expect(operations).toEqual([
        AF.createPattern(DF.blankNode('x'), DF.namedNode('ex:p'), DF.variable('b')),
      ]);
    });

    it('should bind bindings with blank nodes into the right operation and the expression', async() => {
      const expression = AF.createOperatorExpression('bound', [ AF.createTermExpression(DF.variable('c')) ]);
      const blank = BF.bindings([[ DF.variable('a'), DF.blankNode('x') ], [ DF.variable('c'), DF.literal('1') ]]);
      mediatorQueryOperation.mediate.mockImplementation(async() => ({
        type: 'bindings',
        bindingsStream: new ArrayIterator([ BF.bindings([[ DF.variable('b'), DF.namedNode('ex:bx') ]]) ], {
          autoStart: false,
        }),
      }));
      const { result } = await (<any> actor).getOutput(createAction([ blank ], expression));
      await expect((result).bindingsStream.toArray()).resolves.toEqualBindingsArray([
        blank.set(DF.variable('b'), DF.namedNode('ex:bx')),
      ]);
      // The filter is materialized as by the optional bind join
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(1);
      const operation = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
      expect(operation.type).toBe(Algebra.Types.FILTER);
    });

    it('should keep left bindings of which all results conflict', async() => {
      const blank = BF.bindings([[ DF.variable('a'), DF.blankNode('y') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ blank ]));
      await expect((result).bindingsStream.toArray()).resolves.toEqualBindingsArray([ blank ]);
    });

    it('should emit errors of evaluating a block', async() => {
      jest.spyOn(mediatorQueryOperation, 'mediate').mockImplementation(async() => {
        throw new Error('block failed');
      });
      const a1 = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ]]);
      const { result } = await (<any> actor).getOutput(createAction([ a1 ]));
      await expect((result).bindingsStream.toArray()).rejects.toThrow('block failed');
    });
  });
});
