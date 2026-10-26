import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type {
  IActionContext,
  IJoinEntry,
  IJoinEntryWithMetadata,
  IQuerySourceWrapper,
  MetadataBindings,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import type { IActorRdfJoinMultiIndexNestedLoopTestSideData } from '../lib/ActorRdfJoinMultiIndexNestedLoop';
import { ActorRdfJoinMultiIndexNestedLoop } from '../lib/ActorRdfJoinMultiIndexNestedLoop';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

describe('ActorRdfJoinMultiIndexNestedLoop', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
  let actor: ActorRdfJoinMultiIndexNestedLoop;
  let store: RdfStore;
  let source: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = <any> { mediate: async() => ({ selectivity: 1 }) };
    actor = new ActorRdfJoinMultiIndexNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity, lookupCost: 1 });
    store = RdfStore.createDefault();
    for (const [ s, p, o ] of [
      [ 'ex:review1', 'ex:reviewFor', 'ex:product' ],
      [ 'ex:review2', 'ex:reviewFor', 'ex:product' ],
      [ 'ex:review1', 'ex:reviewer', 'ex:person1' ],
      [ 'ex:review2', 'ex:reviewer', 'ex:person2' ],
      [ 'ex:person1', 'ex:name', 'ex:name1' ],
    ]) {
      store.addQuad(DF.quad(DF.namedNode(s), DF.namedNode(p), DF.namedNode(o)));
    }
    source = { source: new QuerySourceRdfJs(store, DF, BF) };
  });

  function term(value: string): RDF.Term {
    return value.startsWith('?') ? DF.variable(value.slice(1)) : DF.namedNode(value);
  }

  function pattern(s: string, p: string, o: string, wrapper = source): Algebra.Pattern {
    return assignOperationSource(AF.createPattern(term(s), term(p), term(o)), wrapper);
  }

  function metadata(
    cardinality: number,
    variables: string[],
    extra: Partial<MetadataBindings> = {},
    distinctValues: Record<string, number> = {},
  ): MetadataBindings {
    return {
      state: new MetadataValidationState(),
      cardinality: { type: 'exact', value: cardinality },
      variables: variables.map(name => ({
        variable: DF.variable(name),
        canBeUndef: false,
        ...distinctValues[name] === undefined ? {} : { distinctValues: distinctValues[name] },
      })),
      ...extra,
    };
  }

  function entry(operation: Algebra.Operation, meta: MetadataBindings): IJoinEntry {
    const op = <Algebra.Pattern> (operation.type === 'join' ? (<Algebra.Join> operation).input[0] : operation);
    const bindings = store.getBindings(BF, op.subject, op.predicate, op.object, DF.defaultGraph());
    return {
      operation,
      output: {
        type: 'bindings',
        bindingsStream: new ArrayIterator(bindings, { autoStart: false }),
        metadata: async() => meta,
      },
    };
  }

  function withMetadata(joinEntry: IJoinEntry, meta: MetadataBindings): IJoinEntryWithMetadata {
    return { ...joinEntry, metadata: meta };
  }

  function reviewEntries(): IJoinEntry[] {
    return [
      entry(pattern('?review', 'ex:reviewer', '?reviewer'), metadata(2, [ 'review', 'reviewer' ])),
      entry(pattern('?review', 'ex:reviewFor', 'ex:product'), metadata(2, [ 'review' ])),
      entry(pattern('?reviewer', 'ex:name', '?name'), metadata(1, [ 'reviewer', 'name' ])),
    ];
  }

  describe('estimateFanout', () => {
    it('divides by the distinct values of a bound variable', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
        {},
        { o: 20 },
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 'o' ]))).toBe(5);
    });

    it('assumes a bound variable without distinct values to identify a single result', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 's' ]))).toBe(1);
    });

    it('takes the most selective bound variable', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
        {},
        { s: 50, o: 2 },
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 's', 'o' ]))).toBe(2);
    });

    it('returns the cardinality for entries sharing no bound variables', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 'x' ]))).toBe(100);
    });
  });

  describe('getLookupOrder', () => {
    it('picks the entry with the lowest fanout next', async() => {
      const entries = await Promise.all(reviewEntries()
        .map(async joinEntry => withMetadata(joinEntry, await joinEntry.output.metadata())));
      expect(ActorRdfJoinMultiIndexNestedLoop.getLookupOrder(entries, 1, 1)).toEqual({
        order: [ 0, 2 ],
        iterations: 2 + 2 * (1 + 1) + 2 * (1 + 1),
        cardinality: 2,
      });
    });
  });

  describe('test', () => {
    it('should pass on local pattern entries, starting from the cheapest entry', async() => {
      const action: IActionRdfJoin = { type: 'inner', entries: reviewEntries(), context };
      const result = await actor.test(action);
      expect(result.get()).toEqual({
        iterations: 1 + 1 * (1 + 1) + 1 * (1 + 1),
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
      const sideData: IActorRdfJoinMultiIndexNestedLoopTestSideData = result.getSideData();
      expect(sideData.first).toBe(2);
      expect(sideData.order).toEqual([ 0, 1 ]);
      expect(sideData.cardinality).toBe(1);
    });

    it('should allow a single entry that can not be looked up as first entry', async() => {
      const entries = reviewEntries();
      entries[1] = entry(AF.createJoin([ entries[1].operation ]), await entries[1].output.metadata());
      const result = await actor.test({ type: 'inner', entries, context });
      expect(result.getSideData().first).toBe(1);
      expect(result.getSideData().order).toEqual([ 0, 2 ]);
    });

    it('should fail when two entries can not be looked up', async() => {
      const entries = reviewEntries();
      entries[1] = entry(AF.createJoin([ entries[1].operation ]), await entries[1].output.metadata());
      entries[2] = entry(AF.createJoin([ entries[2].operation ]), await entries[2].output.metadata());
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be quad patterns over sources that support synchronous lookups`);
    });

    it('should fail on sources without synchronous lookups', async() => {
      const other: IQuerySourceWrapper = <any> { source: {}};
      const entries = reviewEntries();
      entries[0] = entry(pattern('?review', 'ex:reviewer', '?reviewer', other), await entries[0].output.metadata());
      entries[2] = entry(pattern('?reviewer', 'ex:name', '?name', other), await entries[2].output.metadata());
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be quad patterns over sources that support synchronous lookups`);
    });

    it('should fail on entries without source', async() => {
      const entries = reviewEntries();
      entries[0] = entry(AF.createPattern(term('?review'), term('ex:reviewer'), term('?reviewer')), await entries[0]
        .output.metadata());
      entries[2] = entry(AF.createPattern(term('?reviewer'), term('ex:name'), term('?name')), await entries[2]
        .output.metadata());
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be quad patterns over sources that support synchronous lookups`);
    });

    it('should not look up modified operations', async() => {
      const entries = reviewEntries();
      entries[0] = { ...entries[0], operationModified: true };
      entries[2] = { ...entries[2], operationModified: true };
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be quad patterns over sources that support synchronous lookups`);
    });

    it('should not start from an entry that requires its operation', async() => {
      const entries = reviewEntries();
      entries[1] = entry(
        AF.createJoin([ entries[1].operation ]),
        metadata(2, [ 'review' ], { operationRequired: true }),
      );
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`actor does not work with operationRequired.`);
      await expect((<any> actor).getJoinCoefficients({ type: 'inner', entries, context }, {
        metadatas: await Promise.all(entries.map(joinEntry => joinEntry.output.metadata())),
      })).resolves.toFailTest(`Actor actor requires all entries but one to be quad patterns over sources that support synchronous lookups`);
    });

    it('should fail on remote entries', async() => {
      const entries = reviewEntries();
      entries[0] = entry(entries[0].operation, metadata(2, [ 'review', 'reviewer' ], { requestTime: 10 }));
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor can only join entries from local sources`);
      entries[0] = entry(entries[0].operation, metadata(2, [ 'review', 'reviewer' ], { pageSize: 100 }));
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor can only join entries from local sources`);
    });
  });

  describe('run', () => {
    it('should join the first entry with lookups of the others', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('review'), DF.namedNode('ex:review1') ],
          [ DF.variable('reviewer'), DF.namedNode('ex:person1') ],
          [ DF.variable('name'), DF.namedNode('ex:name1') ],
        ]),
      ]);
      expect(entries[0].output.bindingsStream.done).toBeTruthy();
      expect(entries[2].output.bindingsStream.done).toBeTruthy();
    });

    it('should look up within the context of the source', async() => {
      const queryBindingsSynchronous = jest.fn(() => []);
      const contextSource: IQuerySourceWrapper = <any> {
        source: { queryBindingsSynchronous },
        context: new ActionContext({ x: 'y' }),
      };
      const entries = reviewEntries();
      entries[0] = entry(pattern('?review', 'ex:reviewer', '?reviewer', contextSource), metadata(2, [
        'review',
        'reviewer',
      ]));
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([]);
      expect(queryBindingsSynchronous)
        .toHaveBeenCalledWith(expect.anything(), context.merge(new ActionContext({ x: 'y' })));
    });

    it('should cap the cardinality by its own estimate', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.metadata()).resolves.toMatchObject({ cardinality: { type: 'estimate', value: 1 }});
    });

    it('should keep the default cardinality when it is lower', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const sideData = (await actor.test(action)).getSideData();
      const result = await actor.run(action, <any> { ...sideData, cardinality: 1_000 });
      await expect(result.metadata()).resolves.toMatchObject({ cardinality: { type: 'estimate', value: 2 }});
    });
  });
});
