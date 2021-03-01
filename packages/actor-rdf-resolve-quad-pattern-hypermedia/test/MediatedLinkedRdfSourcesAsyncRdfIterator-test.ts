import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';
const DF = new DataFactory();

describe('MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A MediatedLinkedRdfSourcesAsyncRdfIterator instance', () => {
    let context: ActionContext;
    let source: any;
    let s;
    let p;
    let o;
    let g;
    let mediatorRdfDereference: any;
    let mediatorMetadata: any;
    let mediatorMetadataExtract: any;
    let mediatorRdfResolveHypermedia: any;
    let mediatorRdfResolveHypermediaLinks: any;

    beforeEach(() => {
      context = ActionContext({});
      s = DF.namedNode('s');
      p = DF.namedNode('p');
      o = DF.namedNode('o');
      g = DF.namedNode('g');
      mediatorRdfDereference = {
        mediate: jest.fn(({ url }: any) => Promise.resolve({ url, quads: `QUADS(${url})+METADATA`, triples: true })),
      };
      mediatorMetadata = {
        mediate: jest.fn(({ quads }: any) => Promise
          .resolve({ data: quads.split('+')[0], metadata: quads.split('+')[1] })),
      };
      mediatorMetadataExtract = {
        mediate: jest.fn(({ metadata }: any) => Promise.resolve({ metadata: { myKey: metadata }})),
      };
      mediatorRdfResolveHypermedia = {
        mediate: jest.fn(({ forceSourceType, handledDatasets, metadata, quads }: any) => Promise.resolve({
          dataset: 'MYDATASET',
          source: { sourceContents: quads },
        })),
      };
      mediatorRdfResolveHypermediaLinks = {
        mediate: jest.fn(({ metadata }: any) => Promise
          .resolve({ urls: [ `${metadata.baseURL}url1`, `${metadata.baseURL}url2` ]})),
      };
      const mediators: any = {
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks,
      };
      source = new MediatedLinkedRdfSourcesAsyncRdfIterator(10, context, 'forcedType', s, p, o, g, 'first', mediators);
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
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ urls: [ 'first' ]});
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

      it('should get urls based on mediatorRdfResolveHypermediaLinks when they are provided as string', async() => {
        mediatorRdfResolveHypermediaLinks.mediate = ({ metadata }: any) => Promise.resolve({
          urls: [ `${metadata.baseURL}url1`, `${metadata.baseURL}url2` ],
        });
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
      });

      it('should get urls based on mediatorRdfResolveHypermediaLinks when they are provided as links', async() => {
        mediatorRdfResolveHypermediaLinks.mediate = ({ metadata }: any) => Promise.resolve({
          urls: [{ url: `${metadata.baseURL}url1` }, { url: `${metadata.baseURL}url2` }],
        });
        expect(await source.getSourceLinks({ baseURL: 'http://base.org/' })).toEqual([
          { url: 'http://base.org/url1' },
          { url: 'http://base.org/url2' },
        ]);
      });
    });

    describe('getSource', () => {
      it('should get urls based on mediatorRdfResolveHypermedia', async() => {
        expect(await source.getSource({ url: 'startUrl' }, {})).toEqual({
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });

      it('should get urls based on mediatorRdfResolveHypermedia without dataset id', async() => {
        mediatorRdfResolveHypermedia.mediate = ({ forceSourceType, handledDatasets, metadata, quads }: any) =>
          Promise.resolve({
            source: { sourceContents: quads },
          });
        expect(await source.getSource({ url: 'startUrl' }, {})).toEqual({
          handledDatasets: {},
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });

      it('should apply the link transformation', async() => {
        const transform = jest.fn(input => Promise.resolve(`TRANSFORMED(${input})`));
        expect(await source.getSource({ url: 'startUrl', transform }, {})).toEqual({
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'TRANSFORMED(QUADS(startUrl))' },
        });
        expect(transform).toHaveBeenCalledWith('QUADS(startUrl)');
      });

      it('should apply the link context', async() => {
        expect(await source.getSource({ url: 'startUrl', context: ActionContext({ a: 'b' }) }, {})).toEqual({
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
        expect(mediatorRdfDereference.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          context: ActionContext({ a: 'b' }),
        });
        expect(mediatorMetadata.mediate).toHaveBeenCalledWith({
          quads: 'QUADS(startUrl)+METADATA',
          triples: true,
          url: 'startUrl',
          context: ActionContext({ a: 'b' }),
        });
        expect(mediatorMetadataExtract.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          metadata: 'METADATA',
          context: ActionContext({ a: 'b' }),
        });
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          forceSourceType: 'forcedType',
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          quads: 'QUADS(startUrl)',
          context: ActionContext({ a: 'b' }),
        });
      });
    });
  });
});
