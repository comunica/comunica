import { Readable } from 'stream';
import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type {
  IActionDereferenceRdf,
  IActorDereferenceRdfOutput,
  MediatorDereferenceRdf,
} from '@comunica/bus-dereference-rdf';
import type { IActionRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';
const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

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
          data: `QUADS(${url})+METADATA`,
          metadata: { triples: true },
          headers: 'HEADERS',
        })),
      };
      mediatorMetadata = {
        mediate: jest.fn(({ quads }: any) => Promise
          .resolve({ data: quads.split('+')[0], metadata: quads.split('+')[1] })),
      };
      mediatorMetadataExtract = {
        mediate: jest.fn(({ metadata }: any) => Promise.resolve({ metadata: { myKey: metadata }})),
      };
      mediatorRdfResolveHypermedia = {
        mediate: jest.fn(({ forceSourceType, handledDatasets, metadata, quads }: IActionRdfResolveHypermedia) =>
          Promise.resolve({
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
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
      source = new MediatedLinkedRdfSourcesAsyncRdfIterator(10, context, 'forcedType', s, p, o, g, 'first', mediators);
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
        mediatorRdfResolveHypermedia.mediate = ({
          forceSourceType, handledDatasets, metadata, quads,
        }: IActionRdfResolveHypermedia) =>
          Promise.resolve({
            source: { sourceContents: quads },
          });
        expect(await source.getSource({ url: 'startUrl' }, {})).toEqual({
          link: { url: 'startUrl' },
          handledDatasets: {},
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });

      it('should apply the link transformation', async() => {
        const transform = jest.fn(input => Promise.resolve(`TRANSFORMED(${input})`));
        expect(await source.getSource({ url: 'startUrl', transform }, {})).toEqual({
          link: { url: 'startUrl', transform },
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'TRANSFORMED(QUADS(startUrl))' },
        });
        expect(transform).toHaveBeenCalledWith('QUADS(startUrl)');
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
          quads: 'QUADS(startUrl)+METADATA',
          triples: true,
          url: 'startUrl',
          context: new ActionContext({ a: 'b' }),
        });
        expect(mediatorMetadataExtract.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          metadata: 'METADATA',
          context: new ActionContext({ a: 'b' }),
          headers: 'HEADERS',
        });
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          forceSourceType: 'forcedType',
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          quads: 'QUADS(startUrl)',
          context: new ActionContext({ a: 'b' }),
        });
      });

      it('should delegate dereference errors to the source', async() => {
        const error = new Error('MediatedLinkedRdfSourcesAsyncRdfIterator dereference error');
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
    });
  });
});
