import {ActionContext} from "@comunica/core";
import {namedNode} from "@rdfjs/data-model";
import {MediatedLinkedRdfSourcesAsyncRdfIterator} from "../lib/MediatedLinkedRdfSourcesAsyncRdfIterator";

describe('MediatedLinkedRdfSourcesAsyncRdfIterator', () => {

  describe('A MediatedLinkedRdfSourcesAsyncRdfIterator instance', () => {
    let context: ActionContext;
    let source: any;
    let s;
    let p;
    let o;
    let g;
    let mediatorRdfDereference;
    let mediatorMetadata;
    let mediatorMetadataExtract;
    let mediatorRdfResolveHypermedia: any;
    let mediatorRdfResolveHypermediaLinks: any;

    beforeEach(() => {
      context = ActionContext({});
      s = namedNode('s');
      p = namedNode('p');
      o = namedNode('o');
      g = namedNode('g');
      mediatorRdfDereference = {
        mediate: ({ url }: any) => Promise.resolve({ url, quads: `QUADS(${url})+METADATA`, triples: true }),
      };
      mediatorMetadata = {
        mediate: ({ quads }: any) => Promise.resolve({ data: quads.split('+')[0], metadata: quads.split('+')[1] }),
      };
      mediatorMetadataExtract = {
        mediate: ({ metadata }: any) => Promise.resolve({ metadata: { myKey: metadata } }),
      };
      mediatorRdfResolveHypermedia = {
        mediate: ({ forceSourceType, handledDatasets, metadata, quads }: any) => Promise.resolve({
          dataset: 'MYDATASET',
          source: { sourceContents: quads },
        }),
      };
      mediatorRdfResolveHypermediaLinks = {
        mediate: ({ metadata }: any) => Promise.resolve({ urls: [metadata.baseURL + 'url1', metadata.baseURL + 'url2'] }),
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

    describe('getNextUrls', () => {
      it('should get urls based on mediatorRdfResolveHypermediaLinks', async () => {
        jest.spyOn(mediatorRdfResolveHypermediaLinks, 'mediate');
        expect(await source.getNextUrls({ baseURL: 'http://base.org/' })).toEqual([
          'http://base.org/url1',
          'http://base.org/url2',
        ]);
        expect(mediatorRdfResolveHypermediaLinks.mediate)
          .toHaveBeenCalledWith({ context, metadata: { baseURL: 'http://base.org/' } });
      });

      it('should not emit any urls that were already emitted', async () => {
        source.handledUrls['http://base.org/url1'] = true;
        expect(await source.getNextUrls({ baseURL: 'http://base.org/' })).toEqual([
          'http://base.org/url2',
        ]);
      });

      it('should be invokable multiple times', async () => {
        expect(await source.getNextUrls({ baseURL: 'http://base.org/' })).toEqual([
          'http://base.org/url1',
          'http://base.org/url2',
        ]);
        expect(await source.getNextUrls({ baseURL: 'http://base2.org/' })).toEqual([
          'http://base2.org/url1',
          'http://base2.org/url2',
        ]);
        expect(await source.getNextUrls({ baseURL: 'http://base.org/' })).toEqual([]); // Already handled
      });

      it('should return no urls on a rejecting mediator', async () => {
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.reject();
        expect(await source.getNextUrls({ baseURL: 'http://base.org/' })).toEqual([]);
      });
    });

    describe('getNextSource', () => {
      it('should get urls based on mediatorRdfResolveHypermedia', async () => {
        expect(await source.getNextSource('startUrl', {})).toEqual({
          handledDatasets: { MYDATASET: true },
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });

      it('should get urls based on mediatorRdfResolveHypermedia without dataset id', async () => {
        mediatorRdfResolveHypermedia.mediate = ({ forceSourceType, handledDatasets, metadata, quads }: any) =>
          Promise.resolve({
            source: { sourceContents: quads },
          });
        expect(await source.getNextSource('startUrl', {})).toEqual({
          handledDatasets: {},
          metadata: { myKey: 'METADATA' },
          source: { sourceContents: 'QUADS(startUrl)' },
        });
      });
    });

  });
});
