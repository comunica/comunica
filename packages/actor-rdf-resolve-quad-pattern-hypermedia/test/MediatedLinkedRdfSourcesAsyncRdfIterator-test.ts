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
import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();

describe('MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A MediatedLinkedRdfSourcesAsyncRdfIterator instance', () => {
    let context: IActionContext;
    let source: any;
    let s;
    let p;
    let o;
    let g;
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
      const mediators: any = {
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks,
        mediatorRdfResolveHypermediaLinksQueue,
      };
      source = new MediatedLinkedRdfSourcesAsyncRdfIterator(
        10,
        context,
        'forcedType',
        s,
        p,
        o,
        g,
        'first',
        64,
        mediators,
      );
    });

    describe('getLinkQueue', () => {
      it('should return a new link queue when called for the first time', async() => {
        expect(await source.getLinkQueue()).toBeInstanceOf(LinkQueueFifo);
      });

      it('should always return the same link queue', async() => {
        const queue = await source.getLinkQueue();
        expect(await source.getLinkQueue()).toBe(queue);
        expect(await source.getLinkQueue()).toBe(queue);
        expect(await source.getLinkQueue()).toBe(queue);
      });

      it('should throw on a rejecting mediator', async() => {
        mediatorRdfResolveHypermediaLinksQueue.mediate = () => Promise
          .reject(new Error('MediatedLinkRdfSourceAsyncRdfIterator-error'));
        await expect(source.getLinkQueue()).rejects.toThrowError('MediatedLinkRdfSourceAsyncRdfIterator-error');
      });
    });

    describe('getSourceLinks', () => {
      it('should get urls based on mediatorRdfResolveHypermediaLinks', async() => {
        jest.spyOn(mediatorRdfResolveHypermediaLinks, 'mediate');
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
        expect(mediatorRdfResolveHypermediaLinks.mediate)
          .toHaveBeenCalledWith({ context, metadata: { baseURL: 'http://base.org/' }});
      });

      it('should not emit any urls that were already emitted', async() => {
        source.handledUrls['http://base.org/url1'] = true;
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url2' },
        ]);
      });

      it('should not re-emit any the first url', async() => {
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: 'first' }]});
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([]);
      });

      it('should be invokable multiple times', async() => {
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
        expect(await source.getSourceLinks({ baseURL: 'http://base2.org/' })).toEqual([
          { url: 'http://base2.org/url1' },
          { url: 'http://base2.org/url2' },
        ]);
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([]); // Already handled
      });

      it('should return no urls on a rejecting mediator', async() => {
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.reject(
          new Error('MediatedLinkedRdfSourcesAsyncRdfIterator error'),
        );
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([]);
      });
    });

    describe('getSource', () => {
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
  });
});
