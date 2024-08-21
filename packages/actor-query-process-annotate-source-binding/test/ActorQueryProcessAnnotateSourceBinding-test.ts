import type { Bindings } from '@comunica/bindings-factory';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysMergeBindingsContext } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import {
  ActorQueryProcessAnnotateSourceBinding,
  KEY_CONTEXT_WRAPPED,
} from '../lib/ActorQueryProcessAnnotateSourceBinding';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryProcessAnnotateSourceBinding', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorQueryProcess: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQueryProcessAnnotateSourceBinding instance', () => {
    let actor: ActorQueryProcessAnnotateSourceBinding;
    let bindings: Bindings;

    beforeEach(() => {
      actor = new ActorQueryProcessAnnotateSourceBinding({ name: 'actor', bus, mediatorQueryProcess });
      bindings = BF.fromRecord({
        v1: DF.namedNode('V1'),
        v2: DF.namedNode('V2'),
        v3: DF.literal('Literal'),
      });
      context = new ActionContext();
    });

    it('should wrap once', async() => {
      await expect(actor.test({ query: 'aQuery', context }))
        .resolves.toBe(true);
    });

    it('should run only once', async() => {
      context = context.set(KEY_CONTEXT_WRAPPED, true);
      await expect(actor.test({ query: 'aQuery', context }))
        .rejects
        .toThrow('Unable to query process multiple times');
    });

    it('should add single source in context to binding', async() => {
      bindings = bindings.setContextEntry(KeysMergeBindingsContext.sourcesBinding, [ 'S1' ]);

      mediatorQueryProcess = {
        async mediate(arg: any) {
          return { result: { type: 'bindings', bindingsStream: new ArrayIterator([ bindings ]) }};
        },
      };
      const actorWithSource = new ActorQueryProcessAnnotateSourceBinding({ name: 'actor', bus, mediatorQueryProcess });

      const queryResult = actorWithSource.run({ query: 'irrelevantQuery', context });
      expect((await queryResult).result.type).toBe('bindings');
      await expect((< IQueryOperationResultBindings >(await queryResult).result).bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('V1'),
          v2: DF.namedNode('V2'),
          v3: DF.literal('Literal'),
          _source: DF.literal('["S1"]'),
        }),
      ]);
    });

    it('should add array of sources in context to binding', async() => {
      bindings = bindings.setContextEntry(KeysMergeBindingsContext.sourcesBinding, [ 'S1', 'S2' ]);

      mediatorQueryProcess = {
        async mediate(arg: any) {
          return { result: { type: 'bindings', bindingsStream: new ArrayIterator([ bindings ]) }};
        },
      };
      const actorWithSource = new ActorQueryProcessAnnotateSourceBinding({ name: 'actor', bus, mediatorQueryProcess });

      const queryResult = actorWithSource.run({ query: 'irrelevantQuery', context });
      expect((await queryResult).result.type).toBe('bindings');
      await expect((< IQueryOperationResultBindings >(await queryResult).result).bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('V1'),
          v2: DF.namedNode('V2'),
          v3: DF.literal('Literal'),
          _source: DF.literal('["S1","S2"]'),
        }),
      ]);
    });

    it('should fail gracefully when binding does not have context', async() => {
      mediatorQueryProcess = {
        async mediate(arg: any) {
          return { result: { type: 'bindings', bindingsStream: new ArrayIterator([ bindings ]) }};
        },
      };
      const actorWithSource = new ActorQueryProcessAnnotateSourceBinding({ name: 'actor', bus, mediatorQueryProcess });

      const queryResult = actorWithSource.run({ query: 'irrelevantQuery', context });
      expect((await queryResult).result.type).toBe('bindings');
      await expect((< IQueryOperationResultBindings >(await queryResult).result).bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('V1'),
          v2: DF.namedNode('V2'),
          v3: DF.literal('Literal'),
          _source: DF.literal('[]'),
        }),
      ]);
    });

    it('should fail gracefully when bindingcontext has no source', async() => {
      bindings = bindings.setContextEntry(KeysMergeBindingsContext.sourcesBinding, []);

      mediatorQueryProcess = {
        async mediate(arg: any) {
          return { result: { type: 'bindings', bindingsStream: new ArrayIterator([ bindings ]) }};
        },
      };
      const actorWithSource = new ActorQueryProcessAnnotateSourceBinding({ name: 'actor', bus, mediatorQueryProcess });

      const queryResult = actorWithSource.run({ query: 'irrelevantQuery', context });
      expect((await queryResult).result.type).toBe('bindings');
      await expect((< IQueryOperationResultBindings >(await queryResult).result).bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('V1'),
          v2: DF.namedNode('V2'),
          v3: DF.literal('Literal'),
          _source: DF.literal('[]'),
        }),
      ]);
    });
  });
});
