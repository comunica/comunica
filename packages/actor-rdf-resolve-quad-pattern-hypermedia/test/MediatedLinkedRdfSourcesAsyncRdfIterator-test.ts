import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type {
  IActionDereferenceRdf,
  IActorDereferenceRdfOutput,
  MediatorDereferenceRdf,
} from '@comunica/bus-dereference-rdf';
import type { IActionRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator, AsyncIterator, setTaskScheduler } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();

setTaskScheduler(task => setImmediate(task));

describe('MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A MediatedLinkedRdfSourcesAsyncRdfIterator instance', () => {
    let context: IActionContext;
    let sourceFactory: () => any;
    let mediators: any;
    let s: RDF.Term;
    let p: RDF.Term;
    let o: RDF.Term;
    let g: RDF.Term;
    let mediatorDereferenceRdf: MediatorDereferenceRdf;
    let mediatorMetadata: any;
    let mediatorMetadataExtract: any;
    let mediatorRdfResolveHypermedia: any;
    let mediatorRdfResolveHypermediaLinks: any;
    let mediatorRdfResolveHypermediaLinksQueue: any;

    beforeEach(() => {
      context = new ActionContext({});
      s = DF.namedNode('s');
      p = DF.namedNode('p');
      o = DF.namedNode('o');
      g = DF.namedNode('g');
      // @ts-expect-error
      mediatorDereferenceRdf = {
        // @ts-expect-error
        mediate: jest.fn(({ url }: IActionDereferenceRdf): Promise<IActorDereferenceRdfOutput> => Promise.resolve({
          url,
          data: new ArrayIterator([
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.literal(`QUADS(${url})+METADATA`)),
          ], { autoStart: false }),
          metadata: { triples: true },
          headers: 'HEADERS',
        })),
      };
      mediatorMetadata = {
        mediate: jest.fn(({ quads }: any) => Promise
          .resolve({
            data: quads.clone()
              .map((q: RDF.Quad) => DF.quad(q.subject, q.predicate, DF.literal(q.object.value.split('+')[0]))),
            metadata: quads.clone()
              .map((q: RDF.Quad) => DF.quad(q.subject, q.predicate, DF.literal(q.object.value.split('+')[1]))),
          })),
      };
      mediatorMetadataExtract = {
        mediate: jest.fn(async({ metadata }: any) => ({
          metadata: { myKey: (await metadata.toArray())[0].object.value },
        })),
      };
      mediatorRdfResolveHypermedia = {
        mediate: jest.fn(async({ forceSourceType, handledDatasets, metadata, quads }: IActionRdfResolveHypermedia) =>
          ({
            dataset: 'MYDATASET',
            source: { sourceContents: 'toArray' in quads ? (await (<any> quads).toArray())[0].object.value : quads },
          })),
      };
      mediatorRdfResolveHypermediaLinks = {
        mediate: jest.fn(({ metadata }: any) => Promise
          .resolve({ links: [{ url: `${metadata.baseURL}url1` }, { url: `${metadata.baseURL}url2` }]})),
      };
      mediatorRdfResolveHypermediaLinksQueue = {
        mediate: () => Promise.resolve({ linkQueue: new LinkQueueFifo() }),
      };
      mediators = {
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks,
        mediatorRdfResolveHypermediaLinksQueue,
      };
      sourceFactory = () => new MediatedLinkedRdfSourcesAsyncRdfIterator(
        10,
        context,
        'forcedType',
        s,
        p,
        o,
        g,
        'first',
        64,
        undefined,
        mediators,
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
          context,
          'forcedType',
          s,
          p,
          o,
          g,
          'first',
          64,
          aggregatedStore,
          mediators,
        );

        source.close();
        await new Promise(setImmediate);
        expect(aggregatedStore.end).toHaveBeenCalledTimes(1);
      });

      it('should close if the iterator is closeable', async() => {
        const source = sourceFactory();
        source.close();
        await new Promise(setImmediate);
        expect(source.closed).toEqual(true);
        expect(source.wasForcefullyClosed).toEqual(false);
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
          context,
          'forcedType',
          s,
          p,
          o,
          g,
          'first',
          64,
          aggregatedStore,
          mediators,
        );

        source.close();
        await new Promise(setImmediate);
        expect(source.closed).toEqual(true);
        expect(aggregatedStore.end).toHaveBeenCalled();
        expect(source.wasForcefullyClosed).toEqual(false);
      });

      it('should not close if the iterator is not closeable', async() => {
        const source = sourceFactory();
        source.getLinkQueue = async() => ({ isEmpty: () => false });
        source.close();
        await new Promise(setImmediate);
        expect(source.closed).toEqual(false);
        expect(source.wasForcefullyClosed).toEqual(true);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should destroy if the link queue rejects', async() => {
        const source = sourceFactory();
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
          context,
          'forcedType',
          s,
          p,
          o,
          g,
          'first',
          64,
          aggregatedStore,
          mediators,
        );

        source.destroy();
        await new Promise(setImmediate);
        expect(aggregatedStore.end).toHaveBeenCalledTimes(1);
      });

      it('should close if the iterator is closeable', async() => {
        const source = sourceFactory();
        source.destroy();
        await new Promise(setImmediate);
        expect(source.closed).toEqual(true);
        expect(source.wasForcefullyClosed).toEqual(false);
      });

      it('should close if the iterator is closeable, and end the aggregated store', async() => {
        const aggregatedStore: any = {
          end: jest.fn(),
          setBaseMetadata: jest.fn(),
          import: jest.fn(),
        };
        const source = <any> new MediatedLinkedRdfSourcesAsyncRdfIterator(
          10,
          context,
          'forcedType',
          s,
          p,
          o,
          g,
          'first',
          64,
          aggregatedStore,
          mediators,
        );

        source.destroy();
        await new Promise(setImmediate);
        expect(source.closed).toEqual(true);
        expect(aggregatedStore.end).toHaveBeenCalled();
        expect(source.wasForcefullyClosed).toEqual(false);
      });

      it('should not close if the iterator is not closeable', async() => {
        const source = sourceFactory();
        source.getLinkQueue = async() => ({ isEmpty: () => false });
        source.destroy();
        await new Promise(setImmediate);
        expect(source.closed).toEqual(false);
        expect(source.wasForcefullyClosed).toEqual(true);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should close if the iterator is not closeable but an error is passed', async() => {
        const source = sourceFactory();
        source.getLinkQueue = async() => ({ isEmpty: () => false });
        source.on('error', jest.fn());
        source.destroy(new Error('force destroy'));
        await new Promise(setImmediate);
        expect(source.closed).toEqual(true);
        expect(source.wasForcefullyClosed).toEqual(false);
      });

      it('should destroy if the link queue rejects', async() => {
        const source = sourceFactory();
        source.getLinkQueue = () => Promise.reject(new Error('getLinkQueue reject'));
        source.destroy();
        await expect(new Promise((resolve, reject) => source.on('error', reject)))
          .rejects.toThrow('getLinkQueue reject');
      });
    });

    describe('getLinkQueue', () => {
      it('should return a new link queue when called for the first time', async() => {
        const source = sourceFactory();
        expect(await source.getLinkQueue()).toBeInstanceOf(LinkQueueFifo);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should always return the same link queue', async() => {
        const source = sourceFactory();
        const queue = await source.getLinkQueue();
        expect(await source.getLinkQueue()).toBe(queue);
        expect(await source.getLinkQueue()).toBe(queue);
        expect(await source.getLinkQueue()).toBe(queue);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should throw on a rejecting mediator', async() => {
        const source = sourceFactory();
        mediatorRdfResolveHypermediaLinksQueue.mediate = () => Promise
          .reject(new Error('mediatorRdfResolveHypermediaLinksQueue-error'));
        await expect(source.getLinkQueue()).rejects.toThrowError('mediatorRdfResolveHypermediaLinksQueue-error');

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
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
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
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url2' },
        ]);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should not re-emit any the first url', async() => {
        const source = sourceFactory();
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: 'first' }]});
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([]);

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should be invokable multiple times', async() => {
        const source = sourceFactory();
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
        expect(await source.getSourceLinks({ baseURL: 'http://base2.org/' })).toEqual([
          { url: 'http://base2.org/url1' },
          { url: 'http://base2.org/url2' },
        ]);
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([]); // Already handled

        source.destroy();
        await new Promise(setImmediate);
      });

      it('should return no urls on a rejecting mediator', async() => {
        const source = sourceFactory();
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.reject(
          new Error('MediatedLinkedRdfSourcesAsyncRdfIterator error'),
        );
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([]);

        source.destroy();
        await new Promise(setImmediate);
      });
    });

    describe('getSource', () => {
      let source: any;

      beforeEach(async() => {
        source = sourceFactory();
        source.close();
        await new Promise(setImmediate);
      });

      it('should get urls based on mediatorRdfResolveHypermedia', async() => {
        expect(await source.getSource({ url: 'startUrl' }, {})).toEqual({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });

      it('should get urls based on mediatorRdfResolveHypermedia without dataset id', async() => {
        mediatorRdfResolveHypermedia.mediate = async({
          forceSourceType, handledDatasets, metadata, quads,
        }: IActionRdfResolveHypermedia) =>
          ({
            source: { sourceContents: (await (<any> quads).toArray())[0].object.value },
          });
        expect(await source.getSource({ url: 'startUrl' }, {})).toEqual({
          link: { url: 'startUrl' },
          handledDatasets: {},
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });

      it('should apply the link transformation', async() => {
        const transform = jest.fn(inputQuads => inputQuads
          .map((q: RDF.Quad) => DF.quad(q.subject, q.predicate, DF.literal(`TRANSFORMED(${q.object.value})`))));
        expect(await source.getSource({ url: 'startUrl', transform }, {})).toEqual({
          link: { url: 'startUrl', transform },
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'TRANSFORMED(QUADS(startUrl))' },
        });
        expect(transform).toHaveBeenCalledWith(expect.any(AsyncIterator));
      });

      it('should apply the link context', async() => {
        expect(await source.getSource({ url: 'startUrl', context: new ActionContext({ a: 'b' }) }, {})).toEqual({
          link: { url: 'startUrl', context: new ActionContext({ a: 'b' }) },
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
        expect(mediatorDereferenceRdf.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          context: new ActionContext({ a: 'b' }),
        });
        expect(mediatorMetadata.mediate).toHaveBeenCalledWith({
          quads: expect.any(AsyncIterator),
          triples: true,
          url: 'startUrl',
          context: new ActionContext({ a: 'b' }),
        });
        expect(mediatorMetadataExtract.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          metadata: expect.any(AsyncIterator),
          context: new ActionContext({ a: 'b' }),
          headers: 'HEADERS',
        });
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          forceSourceType: 'forcedType',
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          quads: expect.any(AsyncIterator),
          context: new ActionContext({ a: 'b' }),
        });
      });

      it('should delegate dereference errors to the source', async() => {
        const error = new Error('MediatedLinkedRdfSourcesAsyncRdfIterator dereference error');
        mediatorRdfResolveHypermedia.mediate = ({ quads }: IActionRdfResolveHypermedia) =>
          ({
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
          });
        mediatorDereferenceRdf.mediate = () => Promise.reject(error);
        const ret = await source.getSource({ url: 'startUrl' }, {});
        expect(ret).toEqual({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: {},
          source: { sourceContents: expect.any(Readable) },
        });
        await expect(arrayifyStream(ret.source.sourceContents)).rejects.toThrow(error);
      });

      it('should ignore data errors', async() => {
        mediatorRdfResolveHypermedia.mediate = ({ quads }: IActionRdfResolveHypermedia) =>
          ({
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
          });
        mediatorMetadata.mediate = jest.fn(({ quads }: any) => {
          const data = new Readable();
          data._read = () => null;
          data.on('newListener', (name: string) => {
            if (name === 'error') {
              setImmediate(() => data
                .emit('error', new Error('MediatedLinkedRdfSourcesAsyncRdfIterator ignored error')));
            }
          });
          return Promise
            .resolve({
              data,
              metadata: quads.clone()
                .map((q: RDF.Quad) => DF.quad(q.subject, q.predicate, DF.literal(q.object.value.split('+')[1]))),
            });
        });

        await source.getSource({ url: 'startUrl' }, {});
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
        expect(source.isCloseable(linkQueue)).toEqual(false);
      });

      it('should be true for an empty link queue', async() => {
        const linkQueue = {
          isEmpty: () => true,
        };
        expect(source.isCloseable(linkQueue)).toEqual(true);
      });

      it('should be false for an empty link queue when sub-iterators are running', async() => {
        const linkQueue = {
          isEmpty: () => true,
        };
        source.iteratorsPendingCreation++;
        expect(source.isCloseable(linkQueue)).toEqual(false);
      });

      it('should be true for a non-empty link queue, but was forcefully closed', async() => {
        const linkQueue = {
          isEmpty: () => false,
        };
        source.iteratorsPendingCreation++;
        source.close();
        await new Promise(setImmediate);
        source.iteratorsPendingCreation--;
        expect(source.isCloseable(linkQueue)).toEqual(true);
      });

      it('should be false for non-empty link queue, was forcefully closed, and sub-iterators are running', async() => {
        const linkQueue = {
          isEmpty: () => true,
        };
        source.iteratorsPendingCreation++;
        source.close();
        await new Promise(setImmediate);
        expect(source.isCloseable(linkQueue)).toEqual(false);
      });
    });
  });
});
