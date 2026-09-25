import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
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
import { ActorRdfJoinMultiLeapfrog } from '../lib/ActorRdfJoinMultiLeapfrog';
import { LeapfrogJoinIterator } from '../lib/LeapfrogJoinIterator';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function variable(name: string, canBeUndef = false): MetadataVariable {
  return { variable: DF.variable(name), canBeUndef };
}

function order(name: string, direction: 'asc' | 'desc' = 'asc'): TermsOrder<RDF.Variable> {
  return [{ term: DF.variable(name), direction }];
}

function metadata(
  cardinality: number,
  variables: MetadataVariable[],
  termOrder?: TermsOrder<RDF.Variable>,
  canSeek?: boolean,
): MetadataBindings {
  return {
    state: new MetadataValidationState(),
    cardinality: { type: 'estimate', value: cardinality },
    pageSize: 100,
    requestTime: 0,
    termOrder,
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
    operation: <any> { type: 'nop' },
  };
}

function bind(values: Record<string, string>): Bindings {
  return BF.bindings(Object.entries(values).map(([ name, value ]) => [ DF.variable(name), DF.literal(value) ]));
}

describe('ActorRdfJoinMultiLeapfrog', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: any;
  let mediatorJoin: any;
  let actor: ActorRdfJoinMultiLeapfrog;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = { mediate: async() => ({ selectivity: 1 }) };
    mediatorJoin = {
      mediate: jest.fn(async(action: IActionRdfJoin) => ({
        type: 'bindings',
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: async() => metadata(0, []),
        entries: action.entries,
      })),
    };
    actor = new ActorRdfJoinMultiLeapfrog({ name: 'actor', bus, mediatorJoinSelectivity, mediatorJoin });
  });

  it('is an ActorRdfJoin', () => {
    expect(actor).toBeInstanceOf(ActorRdfJoin);
  });

  describe('getLeapfrogVariable', () => {
    it('finds nothing when no entry is sorted', () => {
      expect(ActorRdfJoinMultiLeapfrog.getLeapfrogVariable([
        metadata(1, [ variable('a') ]),
        metadata(1, [ variable('a') ]),
      ])).toBeUndefined();
    });

    it('skips entries sorted in descending order, or on a variable that can be undefined', () => {
      expect(ActorRdfJoinMultiLeapfrog.getLeapfrogVariable([
        metadata(1, [ variable('a') ], order('a', 'desc')),
        metadata(1, [ variable('a', true) ], order('a')),
        metadata(1, [ variable('a') ], order('a')),
      ])).toEqual({ variable: DF.variable('a'), indexes: [ 2 ]});
    });

    it('picks the variable that most entries are sorted on', () => {
      expect(ActorRdfJoinMultiLeapfrog.getLeapfrogVariable([
        metadata(1, [ variable('a'), variable('b') ], order('b')),
        metadata(9, [ variable('a') ], order('a')),
        metadata(9, [ variable('a') ], order('a')),
      ])).toEqual({ variable: DF.variable('a'), indexes: [ 1, 2 ]});
    });

    it('picks the variable with the smallest entry among equally large groups', () => {
      expect(ActorRdfJoinMultiLeapfrog.getLeapfrogVariable([
        metadata(9, [ variable('a'), variable('b') ], order('a')),
        metadata(5, [ variable('a'), variable('b') ], order('b')),
        metadata(9, [ variable('a'), variable('b') ], order('a')),
        metadata(9, [ variable('a'), variable('b') ], order('b')),
      ])).toEqual({ variable: DF.variable('b'), indexes: [ 1, 3 ]});
    });
  });

  describe('test', () => {
    it('rejects fewer than three entries', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [
          entry([], metadata(1, [ variable('a') ], order('a'))),
          entry([], metadata(1, [ variable('a') ], order('a'))),
        ],
        context,
      })).resolves.toFailTest('actor requires 3 join entries at least. The input contained 2.');
    });

    it('rejects entries of which fewer than three are sorted on a shared variable', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [
          entry([], metadata(1, [ variable('a') ], order('a'))),
          entry([], metadata(1, [ variable('a') ], order('a'))),
          entry([], metadata(1, [ variable('a') ])),
        ],
        context,
      })).resolves.toFailTest('Actor actor can only join at least 3 entries that are sorted on a shared variable');
    });

    it('rejects entries that are not sorted at all', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [
          entry([], metadata(1, [ variable('a') ])),
          entry([], metadata(1, [ variable('a') ])),
          entry([], metadata(1, [ variable('a') ])),
        ],
        context,
      })).resolves.toFailTest('Actor actor can only join at least 3 entries that are sorted on a shared variable');
    });

    it('charges entries that can skip for about as many bindings as the smallest one', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [
          entry([], metadata(1000, [ variable('a') ], order('a'), true)),
          entry([], metadata(10, [ variable('a') ], order('a'), true)),
          entry([], metadata(500, [ variable('a') ], order('a'), true)),
        ],
        context,
      })).resolves.toPassTest({
        iterations: 30 * 0.8,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('charges entries that cannot skip for all of their bindings', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [
          entry([], metadata(1000, [ variable('a') ], order('a'))),
          entry([], metadata(10, [ variable('a') ], order('a'), true)),
          entry([], metadata(500, [ variable('a') ], order('a'), true)),
        ],
        context,
      })).resolves.toPassTest({
        iterations: 1020,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('charges the other entries for being joined with the result one at a time', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [
          entry([], metadata(100, [ variable('a') ], order('a'), true)),
          entry([], metadata(10, [ variable('a'), variable('b') ], order('a'), true)),
          entry([], metadata(50, [ variable('a'), variable('b') ])),
          entry([], metadata(100, [ variable('a') ], order('a'), true)),
          entry([], metadata(5, [ variable('a'), variable('b') ])),
        ],
        context,
      })).resolves.toPassTest({
        // 30 bindings leapfrogged, then 10 + 50 and 10 + 5.
        iterations: (30 * 0.8) + 60 + 15,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });
  });

  describe('run', () => {
    it('leapfrogs all entries when they are sorted on the same variable', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry(
            [ bind({ a: '1', b: 'b1' }), bind({ a: '2', b: 'b2' }) ],
            metadata(2, [ variable('a'), variable('b') ], order('a'), true),
          ),
          entry([ bind({ a: '2', c: 'c2' }) ], metadata(1, [ variable('a'), variable('c') ], order('a'), true)),
          entry(
            [ bind({ a: '0', d: 'd0' }), bind({ a: '2', d: 'd2' }) ],
            metadata(2, [ variable('a'), variable('d') ], order('a'), true),
          ),
        ],
        context,
      };
      const { result } = await (<any> actor).getOutput(action, (await actor.test(action)).getSideData());
      expect(result.bindingsStream).toBeInstanceOf(LeapfrogJoinIterator);
      await expect(arrayifyStream(result.bindingsStream)).resolves.toEqualBindingsArray([
        bind({ a: '2', b: 'b2', c: 'c2', d: 'd2' }),
      ]);
      await expect(result.metadata()).resolves.toMatchObject({
        termOrder: order('a'),
        canSeek: true,
      });
      expect(mediatorJoin.mediate).not.toHaveBeenCalled();
    });

    it('does not claim that the result can skip when an entry cannot', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(2, [ variable('a') ], order('a'), true)),
          entry([], metadata(1, [ variable('a') ], order('a'))),
          entry([], metadata(2, [ variable('a') ], order('a'), true)),
        ],
        context,
      };
      const { result } = await (<any> actor).getOutput(action, (await actor.test(action)).getSideData());
      await expect(result.metadata()).resolves.toMatchObject({ canSeek: false });
    });

    it('joins the other entries with the leapfrogged result through the join bus', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
        entries: [
          entry([], metadata(2, [ variable('a') ], order('a'), true)),
          entry([], metadata(5, [ variable('a'), variable('b') ])),
          entry([], metadata(1, [ variable('a') ], order('a'), true)),
          entry([], metadata(2, [ variable('a') ], order('a'), true)),
        ],
        context,
      };
      const { result } = await (<any> actor).getOutput(action, (await actor.test(action)).getSideData());
      expect(mediatorJoin.mediate).toHaveBeenCalledTimes(1);
      const [ joined, rest ] = result.entries;
      expect(joined.output.bindingsStream).toBeInstanceOf(LeapfrogJoinIterator);
      expect(joined.operation.type).toBe('join');
      expect(rest).toBe(action.entries[1]);
    });
  });
});
