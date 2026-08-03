import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysStatistics } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import type { IActionContext, IQuerySource, ILink } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { setTaskScheduler } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { ISourceState, SourceStateGetter } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();
const AF = new AlgebraFactory();

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
        operation!,
        {},
        context,
        { url: 'first' },
        64,
        sourceStateGetter,
        mediatorMetadataAccumulate!,
        mediatorRdfResolveHypermediaLinks,
        mediatorRdfResolveHypermediaLinksQueue,
      );
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
      // Else isClosable tests will time out due to async nature of 'should update discover statistic data'
      afterEach(() => {
        jest.useRealTimers();
      });

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

      it('should update discover statistic data', async() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());

        const statisticTracker: StatisticLinkDiscovery = new StatisticLinkDiscovery();
        context = context.set(KeysStatistics.discoveredLinks, statisticTracker);

        const source = sourceFactory();
        // Here we pass a partial source state object, as the link attribute is required to track
        // discover events
        await expect(source.getSourceLinks({ baseURL: 'http://base.org/' }, { link: { url: 'http://source.org/' }})).resolves.toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);

        expect(statisticTracker.metadata).toEqual({
          'http://base.org/url1': [
            {
              discoveredTimestamp: performance.now(),
              discoverOrder: 0,
            },
          ],
          'http://base.org/url2': [
            {
              discoveredTimestamp: performance.now(),
              discoverOrder: 1,
            },
          ],
        });

        jest.useRealTimers();
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
