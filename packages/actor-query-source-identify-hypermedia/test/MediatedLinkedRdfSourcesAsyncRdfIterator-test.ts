import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks, ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { ActionContext } from '@comunica/core';
import type { IActionContext, IQuerySource } from '@comunica/types';
import { setTaskScheduler } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import type { ISourceState, SourceStateGetter } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();

setTaskScheduler(task => setImmediate(task));

describe('MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A MediatedLinkedRdfSourcesAsyncRdfIterator instance', () => {
    let context: IActionContext;
    let sourceFactory: () => any;
    let operation: Algebra.Operation;
    let mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
    let mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
    let mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
    let sourceStateGetter: SourceStateGetter;

    beforeEach(() => {
      context = new ActionContext({});
      AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.namedNode('g'),
      );
      mediatorRdfResolveHypermediaLinks = <any>{
        mediate: jest.fn(({ metadata }: any) => Promise
          .resolve({ links: [{ url: `${metadata.baseURL}url1` }, { url: `${metadata.baseURL}url2` }]})),
      };
      mediatorRdfResolveHypermediaLinksQueue = <any>{
        mediate: () => Promise.resolve({ linkQueue: new LinkQueueFifo() }),
      };
      sourceStateGetter = async(link: ILink, handledDatasets: Record<string, boolean>) => {
        return <ISourceState> <any> {
          link,
          metadata: {},
          handledDatasets: { ...handledDatasets, MYDATASET: true },
          source: <IQuerySource> {},
        };
      };
      sourceFactory = () => new MediatedLinkedRdfSourcesAsyncRdfIterator(
        10,
        operation,
        {},
        context,
        'forcedType',
        'first',
        64,
        sourceStateGetter,
        undefined,
        mediatorMetadataAccumulate,
        mediatorRdfResolveHypermediaLinks,
        mediatorRdfResolveHypermediaLinksQueue,
      );
    });

    describe('close', () => {
      it('should not end an undefined aggregated store', async() => {
        sourceFactory().close();
      });

      it('should end a defined aggregated store', async() => {
        const aggregatedStore: any = {
          end: jest.fn(),
          setBaseMetadata: jest.fn(),
          import: jest.fn(),
          containedSources: new Set(),
        };
        const source = new MediatedLinkedRdfSourcesAsyncRdfIterator(
          10,
          operation,
          {},
          context,
          'forcedType',
          'first',
          64,
          sourceStateGetter,
          aggregatedStore,
          mediatorMetadataAccumulate,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
        );

        source.close();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(aggregatedStore.end).toHaveBeenCalledTimes(1);
      });

      it('should close if the iterator is closeable', async() => {
        const source = sourceFactory();
        source.close();
        await new Promise(setImmediate);
        expect(source.closed).toBe(true);
        expect(source.wasForcefullyClosed).toBe(false);
      });

      it('should close if the iterator is closeable, and end the aggregated store', async() => {
        const aggregatedStore: any = {
          end: jest.fn(),
          setBaseMetadata: jest.fn(),
          import: jest.fn(),
          containedSources: new Set(),
        };
        const source = <any> new MediatedLinkedRdfSourcesAsyncRdfIterator(
          10,
          operation,
          {},
          context,
          'forcedType',
          'first',
          64,
          sourceStateGetter,
          aggregatedStore,
          mediatorMetadataAccumulate,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
        );

        source.close();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(source.closed).toBe(true);
        expect(aggregatedStore.end).toHaveBeenCalledTimes(1);
        expect(source.wasForcefullyClosed).toBe(false);
      });

      it('should not close if the iterator is not closeable', async() => {
        const source = sourceFactory();
        source.aggregatedStore = {
          end: jest.fn(),
        };
        source.getLinkQueue = async() => ({ isEmpty: () => false });
        source.close();
        await new Promise(setImmediate);
        expect(source.closed).toBe(false);
        expect(source.wasForcefullyClosed).toBe(true);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should destroy if the link queue rejects', async() => {
        const source = sourceFactory();
        source.aggregatedStore = {};
        source.getLinkQueue = () => Promise.reject(new Error('getLinkQueue reject'));
        source.close();
        await expect(new Promise((resolve, reject) => source.on('error', reject)))
          .rejects.toThrow('getLinkQueue reject');
      });
    });

    describe('destroy', () => {
      it('should not end an undefined aggregated store', async() => {
        sourceFactory().destroy();
      });

      it('should end a defined aggregated store', async() => {
        const aggregatedStore: any = {
          end: jest.fn(),
          setBaseMetadata: jest.fn(),
          import: jest.fn(),
        };
        const source = new MediatedLinkedRdfSourcesAsyncRdfIterator(
          10,
          operation,
          {},
          context,
          'forcedType',
          'first',
          64,
          sourceStateGetter,
          aggregatedStore,
          mediatorMetadataAccumulate,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
        );

        source.destroy();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(aggregatedStore.end).toHaveBeenCalledTimes(1);
      });

      it('should close if the iterator is closeable', async() => {
        const source = sourceFactory();
        source.destroy();
        await new Promise(setImmediate);
        expect(source.closed).toBe(true);
        expect(source.wasForcefullyClosed).toBe(false);
      });

      it('should close if the iterator is closeable, and end the aggregated store', async() => {
        const aggregatedStore: any = {
          end: jest.fn(),
          setBaseMetadata: jest.fn(),
          import: jest.fn(),
        };
        const source = <any> new MediatedLinkedRdfSourcesAsyncRdfIterator(
          10,
          operation,
          {},
          context,
          'forcedType',
          'first',
          64,
          sourceStateGetter,
          aggregatedStore,
          mediatorMetadataAccumulate,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
        );

        source.destroy();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(source.closed).toBe(true);
        expect(aggregatedStore.end).toHaveBeenCalledTimes(1);
        expect(source.wasForcefullyClosed).toBe(false);
      });

      it('should not close if the iterator is not closeable', async() => {
        const source = sourceFactory();
        source.aggregatedStore = {
          end: jest.fn(),
        };
        source.getLinkQueue = async() => ({ isEmpty: () => false });
        source.destroy();
        await new Promise(setImmediate);
        expect(source.closed).toBe(false);
        expect(source.wasForcefullyClosed).toBe(true);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should close if the iterator is not closeable but an error is passed', async() => {
        const source = sourceFactory();
        source.getLinkQueue = async() => ({ isEmpty: () => false });
        source.on('error', jest.fn());
        source.destroy(new Error('force destroy'));
        await new Promise(setImmediate);
        expect(source.closed).toBe(true);
        expect(source.wasForcefullyClosed).toBe(false);
      });

      it('should destroy if the link queue rejects', async() => {
        const source = sourceFactory();
        source.aggregatedStore = {};
        source.getLinkQueue = () => Promise.reject(new Error('getLinkQueue reject'));
        source.destroy();
        await expect(new Promise((resolve, reject) => source.on('error', reject)))
          .rejects.toThrow('getLinkQueue reject');
      });
    });

    describe('getLinkQueue', () => {
      it('should return a new link queue when called for the first time', async() => {
        const source = sourceFactory();
        await expect(source.getLinkQueue()).resolves.toBeInstanceOf(LinkQueueFifo);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should always return the same link queue', async() => {
        const source = sourceFactory();
        const queue = await source.getLinkQueue();
        await expect(source.getLinkQueue()).resolves.toBe(queue);
        await expect(source.getLinkQueue()).resolves.toBe(queue);
        await expect(source.getLinkQueue()).resolves.toBe(queue);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should throw on a rejecting mediator', async() => {
        const source = sourceFactory();
        mediatorRdfResolveHypermediaLinksQueue.mediate = () => Promise
          .reject(new Error('mediatorRdfResolveHypermediaLinksQueue-error'));
        await expect(source.getLinkQueue()).rejects.toThrow('mediatorRdfResolveHypermediaLinksQueue-error');

        source.on('error', () => {
          // Void any later errors
        });
        source.destroy();
        await new Promise(setImmediate);
      });
    });

    describe('getSourceLinks', () => {
      it('should get urls based on mediatorRdfResolveHypermediaLinks', async() => {
        const source = sourceFactory();
        jest.spyOn(mediatorRdfResolveHypermediaLinks, 'mediate');
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' })).resolves.toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
        expect(mediatorRdfResolveHypermediaLinks.mediate)
          .toHaveBeenCalledWith({ context, metadata: { baseURL: 'http://base.org/' }});

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should not emit any urls that were already emitted', async() => {
        const source = sourceFactory();
        source.handledUrls['http://base.org/url1'] = true;
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' })).resolves.toEqual([
          { url: 'http://base.org/url2' },
        ]);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should not re-emit any the first url', async() => {
        const source = sourceFactory();
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: 'first' }]});
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' })).resolves.toEqual([]);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should be invokable multiple times', async() => {
        const source = sourceFactory();
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' })).resolves.toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
        await expect(source.getSourceLinks({ baseURL: 'http://base2.org/' })).resolves.toEqual([
          { url: 'http://base2.org/url1' },
          { url: 'http://base2.org/url2' },
        ]);
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' })).resolves.toEqual([]); // Already handled

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should return no urls on a rejecting mediator', async() => {
        const source = sourceFactory();
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.reject(
          new Error('MediatedLinkedRdfSourcesAsyncRdfIterator error'),
        );
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' })).resolves.toEqual([]);

        source.destroy();
        await new Promise(setImmediate);
      });
    });

    describe('isCloseable', () => {
      let source: any;

      beforeEach(async() => {
        source = sourceFactory();
        source.close();
        await new Promise(setImmediate);
      });

      it('should be false for a non-empty link queue', async() => {
        const linkQueue = {
          isEmpty: () => false,
        };
        expect(source.isCloseable(linkQueue)).toBe(false);
      });

      it('should be true for an empty link queue', async() => {
        const linkQueue = {
          isEmpty: () => true,
        };
        expect(source.isCloseable(linkQueue)).toBe(true);
      });

      it('should be false for an empty link queue when sub-iterators are running', async() => {
        const linkQueue = {
          isEmpty: () => true,
        };
        source.iteratorsPendingCreation++;
        expect(source.isCloseable(linkQueue)).toBe(false);
      });

      it('should be true for a non-empty link queue, but was forcefully closed', async() => {
        const linkQueue = {
          isEmpty: () => false,
        };
        source.iteratorsPendingCreation++;
        source.aggregatedStore = {};
        source.close();
        await new Promise(setImmediate);
        source.iteratorsPendingCreation--;
        expect(source.isCloseable(linkQueue)).toBe(true);
      });

      it('should be false for non-empty link queue, was forcefully closed, and sub-iterators are running', async() => {
        const linkQueue = {
          isEmpty: () => true,
        };
        source.iteratorsPendingCreation++;
        source.close();
        await new Promise(setImmediate);
        expect(source.isCloseable(linkQueue)).toBe(false);
      });
    });
  });
});
