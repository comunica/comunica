import { ActionContext, Bus } from '@comunica/core';
import {
  ActorOptimizeQueryOperationInitializeLinkTraversalManager,
} from '../lib/ActorOptimizeQueryOperationInitializeLinkTraversalManager';
import '@comunica/utils-jest';
import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type { MediatorAggregatedStoreFactory } from '@comunica/bus-aggregated-store-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQuerySourceHypermediaResolve } from '@comunica/bus-query-source-hypermedia-resolve';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { LinkTraversalManagerMediated } from '../lib';

describe('ActorOptimizeQueryOperationInitializeLinkTraversalManager', () => {
  let bus: any;
  let context: IActionContext;
  let operation: Algebra.Operation;
  let mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  let mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  let mediatorQuerySourceHypermediaResolve: MediatorQuerySourceHypermediaResolve;
  let mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  let mediatorAggregatedStoreFactory: MediatorAggregatedStoreFactory;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext()
      .set(KeysInitQuery.dataFactory, new DataFactory());
    operation = <any> {};
    mediatorRdfResolveHypermediaLinks = <any> {
      mediate: () => Promise.resolve({ links: [{ url: 'next' }]}),
    };
    mediatorRdfResolveHypermediaLinksQueue = <any> {
      mediate: () => Promise.resolve({ linkQueue: new LinkQueueFifo() }),
    };
    mediatorQuerySourceHypermediaResolve = <any> {
      mediate: async() => {
        return { source: 'SRC', metadata: { a: 1 }};
      },
    };
    mediatorMergeBindingsContext = <any> {
      mediate: async() => {
        return { mergeHandlers: {}};
      },
    };
    mediatorAggregatedStoreFactory = <any> {
      mediate: async() => {
        return { aggregatedStore: 'AGGSTORE' };
      },
    };
  });

  describe('An ActorOptimizeQueryOperationInitializeLinkTraversalManager instance', () => {
    let actor: ActorOptimizeQueryOperationInitializeLinkTraversalManager;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationInitializeLinkTraversalManager({
        name: 'actor',
        bus,
        linkParallelization: 2,
        mediatorRdfResolveHypermediaLinks,
        mediatorRdfResolveHypermediaLinksQueue,
        mediatorQuerySourceHypermediaResolve,
        mediatorMergeBindingsContext,
        mediatorAggregatedStoreFactory,
      });
    });

    describe('test', () => {
      it('should pass', async() => {
        await expect(actor.test({ context, operation })).resolves.toPassTestVoid();
      });
    });

    describe('run', () => {
      it('should not do anything for an empty context', async() => {
        const { context: contextOut } = await actor.run({ context, operation });
        expect(contextOut).toBe(context);
      });

      it('should not do anything for non-traverse sources', async() => {
        const contextIn = context.set(KeysInitQuery.querySourcesUnidentified, [ 'a', 'b', 'c' ]);
        const { context: contextOut } = await actor.run({
          context: contextIn,
          operation,
        });
        expect(contextOut).toBe(contextIn);
      });

      it('should group sources when traverse flag is true', async() => {
        // Run
        const contextIn = context
          .set(KeysInitQuery.querySourcesUnidentified, [ 'a', 'b', 'c' ])
          .set(KeysQuerySourceIdentify.traverse, true);
        const { context: contextOut } = await actor.run({
          context: contextIn,
          operation,
        });

        // Check context
        expect(contextOut).toEqual(context
          .set(KeysInitQuery.querySourcesUnidentified, [{
            type: 'traverse',
            value: [{ url: 'a' }, { url: 'b' }, { url: 'c' }],
            context: expect.any(ActionContext),
          }])
          .set(KeysQuerySourceIdentify.traverse, true));

        // Check manager
        const mgr = (<any> contextOut.getSafe(KeysInitQuery.querySourcesUnidentified)[0]).context
          .getSafe(KeysQuerySourceIdentify.linkTraversalManager);
        expect(mgr).toBeInstanceOf(LinkTraversalManagerMediated);
        expect(mgr.seeds).toEqual([{ url: 'a' }, { url: 'b' }, { url: 'c' }]);
        expect(mgr.linkQueue).toBeInstanceOf(LinkQueueFifo);
        expect(mgr.aggregatedStore).toBe('AGGSTORE');
        expect(mgr.mediatorRdfResolveHypermediaLinks).toBe(mediatorRdfResolveHypermediaLinks);
        expect(mgr.mediatorQuerySourceHypermediaResolve).toBe(mediatorQuerySourceHypermediaResolve);
      });

      it('should group sources of mixed types when traverse flag is true', async() => {
        // Run
        const contextIn = context
          .set(KeysInitQuery.querySourcesUnidentified, [
            'a',
            'b',
            { value: 'c' },
            { type: 'sparql', value: 'd' },
            <any> { match: true },
          ])
          .set(KeysQuerySourceIdentify.traverse, true);
        const { context: contextOut } = await actor.run({
          context: contextIn,
          operation,
        });

        // Check context
        expect(contextOut).toEqual(context
          .set(KeysInitQuery.querySourcesUnidentified, [
            <any> { match: true },
            {
              type: 'traverse',
              value: [
                { url: 'a' },
                { url: 'b' },
                { url: 'c', context: new ActionContext() },
                { url: 'd', forceSourceType: 'sparql', context: new ActionContext() },
              ],
              context: expect.any(ActionContext),
            },
          ])
          .set(KeysQuerySourceIdentify.traverse, true));

        // Check manager
        const mgr = (<any> contextOut.getSafe(KeysInitQuery.querySourcesUnidentified)[1]).context
          .getSafe(KeysQuerySourceIdentify.linkTraversalManager);
        expect(mgr).toBeInstanceOf(LinkTraversalManagerMediated);
        expect(mgr.seeds).toEqual([
          { url: 'a' },
          { url: 'b' },
          { url: 'c', context: new ActionContext() },
          { url: 'd', forceSourceType: 'sparql', context: new ActionContext() },
        ]);
      });
    });
  });
});
