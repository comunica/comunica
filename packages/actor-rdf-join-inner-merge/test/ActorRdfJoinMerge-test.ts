import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type {
  Bindings,
  IActionContext,
  IJoinEntry,
  MetadataBindings,
  MetadataVariable,
  TermsOrder,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { ActorRdfJoinMerge } from '../lib/ActorRdfJoinMerge';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const VAR_A: MetadataVariable = { variable: DF.variable('a'), canBeUndef: false };
const VAR_B: MetadataVariable = { variable: DF.variable('b'), canBeUndef: false };
const VAR_C: MetadataVariable = { variable: DF.variable('c'), canBeUndef: false };

const ORDER_A_ASC: TermsOrder<RDF.Variable> = [{ term: DF.variable('a'), direction: 'asc' }];

function metadata(
  cardinality: number,
  variables: MetadataVariable[],
  order?: TermsOrder<RDF.Variable>,
  requestTime = 10,
  canSeek?: boolean,
): MetadataBindings {
  return {
    state: new MetadataValidationState(),
    cardinality: { type: 'estimate', value: cardinality },
    pageSize: 100,
    requestTime,
    order,
    canSeek,
    variables,
  };
}

function entry(bindings: Bindings[], meta: MetadataBindings): IJoinEntry {
  return {
    output: {
      type: 'bindings',
      bindingsStream: new ArrayIterator<Bindings>(bindings, { autoStart: false }),
      metadata: () => Promise.resolve(meta),
    },
    operation: <any> {},
  };
}

describe('ActorRdfJoinMerge', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: any;
  let mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  let actor: ActorRdfJoinMerge;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = { mediate: async() => ({ selectivity: 1 }) };
    mediatorTermComparatorFactory = <any> {
      mediate: async() => ({
        orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined): -1 | 0 | 1 {
          const stringA = termToString(termA) ?? '';
          const stringB = termToString(termB) ?? '';
          if (stringA < stringB) {
            return -1;
          }
          return stringA > stringB ? 1 : 0;
        },
      }),
    };
    actor = new ActorRdfJoinMerge({ name: 'actor', bus, mediatorJoinSelectivity, mediatorTermComparatorFactory });
  });

  describe('The ActorRdfJoinMerge module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinMerge).toBeInstanceOf(Function);
    });

    it('should be an ActorRdfJoinMerge constructor', () => {
      expect(new (<any> ActorRdfJoinMerge)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoinMerge);
      expect(new (<any> ActorRdfJoinMerge)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoin);
    });
  });

  describe('getCommonOrderPrefix', () => {
    it('returns nothing if the first entry is unordered', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A ]),
        metadata(1, [ VAR_A ], ORDER_A_ASC),
      ])).toEqual([]);
    });

    it('returns nothing if the second entry is unordered', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A ], ORDER_A_ASC),
        metadata(1, [ VAR_A ]),
      ])).toEqual([]);
    });

    it('returns nothing if the entries are sorted on a different variable', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A, VAR_B ], [{ term: DF.variable('a'), direction: 'asc' }]),
        metadata(1, [ VAR_A, VAR_B ], [{ term: DF.variable('b'), direction: 'asc' }]),
      ])).toEqual([]);
    });

    it('returns nothing if the entries are sorted in a different direction', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A ], [{ term: DF.variable('a'), direction: 'asc' }]),
        metadata(1, [ VAR_A ], [{ term: DF.variable('a'), direction: 'desc' }]),
      ])).toEqual([]);
    });

    it('returns nothing if the leading order variable is not shared', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A, VAR_B ], [{ term: DF.variable('b'), direction: 'asc' }]),
        metadata(1, [ VAR_A, VAR_C ], [{ term: DF.variable('b'), direction: 'asc' }]),
      ])).toEqual([]);
    });

    it('returns the shared leading variable', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A, VAR_B ], ORDER_A_ASC),
        metadata(1, [ VAR_A, VAR_C ], ORDER_A_ASC),
      ])).toEqual(ORDER_A_ASC);
    });

    it('returns the longest common prefix of shared variables', () => {
      const order: TermsOrder<RDF.Variable> = [
        { term: DF.variable('a'), direction: 'asc' },
        { term: DF.variable('b'), direction: 'asc' },
      ];
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A, VAR_B ], order),
        metadata(1, [ VAR_A, VAR_B, VAR_C ], order),
      ])).toEqual(order);
    });

    it('stops the prefix at the first variable that is not shared', () => {
      expect(ActorRdfJoinMerge.getCommonOrderPrefix([
        metadata(1, [ VAR_A, VAR_B ], [
          { term: DF.variable('a'), direction: 'asc' },
          { term: DF.variable('c'), direction: 'asc' },
        ]),
        metadata(1, [ VAR_A, VAR_C ], [
          { term: DF.variable('a'), direction: 'asc' },
          { term: DF.variable('c'), direction: 'asc' },
        ]),
      ])).toEqual(ORDER_A_ASC);
    });
  });

  describe('test', () => {
    it('rejects entries that are not sorted on a shared variable', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(5, [ VAR_A, VAR_B ])),
          entry([], metadata(4, [ VAR_A, VAR_C ])),
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toFailTest('Actor actor can only join entries that are sorted on a shared variable');
    });

    it('reports coefficients for sorted entries', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(5, [ VAR_A, VAR_B ], ORDER_A_ASC, 10)),
          entry([], metadata(4, [ VAR_A, VAR_C ], ORDER_A_ASC, 20)),
        ],
        context,
      };
      // Neither entry advertises that it can skip, so both are read in full at 1 per binding.
      await expect(actor.test(action)).resolves.toPassTest({
        iterations: 9,
        persistedItems: 0.8,
        blockingItems: 0,
        requestTime: 1.3,
      });
    });

    it('streams the largest entry and buffers the smallest one', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(3, [ VAR_A, VAR_B ], ORDER_A_ASC, 10)),
          entry([], metadata(9, [ VAR_A, VAR_C ], ORDER_A_ASC, 20)),
        ],
        context,
      };
      const result = await actor.test(action);
      await expect(actor.test(action)).resolves.toPassTest({
        iterations: 12,
        persistedItems: 3 / 9,
        blockingItems: 0,
        // The largest entry (requestTime 20) is streamed, so it is charged first.
        requestTime: (9 * 0.2) + (3 * 0.1),
      });
      // The entry with the largest cardinality is the one that gets streamed.
      expect(result.getSideData().entriesSorted[0]).toBe(action.entries[1]);
      expect(result.getSideData().entriesSorted[1]).toBe(action.entries[0]);
    });

    it('charges entries that cannot skip for reading both of them in full', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(100, [ VAR_A, VAR_B ], ORDER_A_ASC, 0)),
          entry([], metadata(10, [ VAR_A, VAR_C ], ORDER_A_ASC, 0)),
        ],
        context,
      };
      // Both entries in full, at a higher cost per binding than the hash join's 0.8.
      await expect(actor.test(action)).resolves.toPassTest({
        iterations: 110,
        persistedItems: 0.1,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('never beats the hash join when neither entry can skip', async() => {
      // Whatever the two cardinalities, reading both entries in full at 1 per binding costs more than
      // the hash join's 0.8 per binding plus the entry it persists and blocks on.
      for (const [ big, small ] of [[ 100, 100 ], [ 100, 10 ], [ 1000, 1 ], [ 5, 4 ]]) {
        const action: IActionRdfJoin = {
          type: 'inner',
          entries: [
            entry([], metadata(big, [ VAR_A, VAR_B ], ORDER_A_ASC, 0)),
            entry([], metadata(small, [ VAR_A, VAR_C ], ORDER_A_ASC, 0)),
          ],
          context,
        };
        const coefficients = (await actor.test(action)).get()!;
        const mergeCost = coefficients.iterations * 10 + coefficients.persistedItems +
          coefficients.blockingItems * 2;
        const hashCost = 0.8 * (big + small) * 10 + small + small * 2;
        expect(mergeCost).toBeGreaterThan(hashCost);
      }
    });

    it('charges a skipping entry for what the join is expected to read from it', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(1000, [ VAR_A, VAR_B ], ORDER_A_ASC, 0, true)),
          entry([], metadata(10, [ VAR_A, VAR_C ], ORDER_A_ASC, 0)),
        ],
        context,
      };
      // The large entry is read down to the estimated join result of 10, rather than all 1000.
      await expect(actor.test(action)).resolves.toPassTest({
        iterations: 20,
        persistedItems: 0.01,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('charges two ordered sources the same per binding as the hash join', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(1000, [ VAR_A, VAR_B ], ORDER_A_ASC, 0, true)),
          entry([], metadata(10, [ VAR_A, VAR_C ], ORDER_A_ASC, 0, true)),
        ],
        context,
      };
      // Same reads as above, but at 0.8 rather than 1, so that a chain of merges can form.
      await expect(actor.test(action)).resolves.toPassTest({
        iterations: 16,
        persistedItems: 0.01,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('handles entries with zero cardinality', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(0, [ VAR_A, VAR_B ], ORDER_A_ASC)),
          entry([], metadata(0, [ VAR_A, VAR_C ], ORDER_A_ASC)),
        ],
        context,
      };
      await expect(actor.test(action)).resolves.toPassTest({
        iterations: 0,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });
  });

  describe('run', () => {
    it('merges two sorted entries', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([
            BF.bindings([[ DF.variable('a'), DF.literal('1') ], [ DF.variable('b'), DF.literal('l1') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('2') ], [ DF.variable('b'), DF.literal('l2') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('3') ], [ DF.variable('b'), DF.literal('l3') ]]),
          ], metadata(5, [ VAR_A, VAR_B ], ORDER_A_ASC)),
          entry([
            BF.bindings([[ DF.variable('a'), DF.literal('2') ], [ DF.variable('c'), DF.literal('r1') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('3') ], [ DF.variable('c'), DF.literal('r2') ]]),
          ], metadata(4, [ VAR_A, VAR_C ], ORDER_A_ASC)),
        ],
        context,
      };
      const sideData = (await actor.test(action)).getSideData();
      const output = await actor.run(action, sideData);
      await expect(arrayifyStream(output.bindingsStream)).resolves.toEqualBindingsArray([
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('l2') ],
          [ DF.variable('c'), DF.literal('r1') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('3') ],
          [ DF.variable('b'), DF.literal('l3') ],
          [ DF.variable('c'), DF.literal('r2') ],
        ]),
      ]);
    });

    it('declares the merge key as the order of its output', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(5, [ VAR_A, VAR_B ], ORDER_A_ASC)),
          entry([], metadata(4, [ VAR_A, VAR_C ], ORDER_A_ASC)),
        ],
        context,
      };
      const sideData = (await actor.test(action)).getSideData();
      const output = await actor.run(action, sideData);
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        order: ORDER_A_ASC,
        cardinality: { type: 'estimate', value: 4 },
        variables: [ VAR_A, VAR_B, VAR_C ],
      });
      output.bindingsStream.destroy();
    });
  });
});
