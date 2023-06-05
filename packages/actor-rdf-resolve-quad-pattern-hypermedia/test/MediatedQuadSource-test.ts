import type { MediatorDereferenceRdf, IActionDereferenceRdf,
  IActorDereferenceRdfOutput } from '@comunica/bus-dereference-rdf';
import { KeysInitQuery, KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import 'jest-rdf';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import type { ISourceState } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';
import { MediatedQuadSource } from '../lib/MediatedQuadSource';
import { mediators as utilMediators } from './MediatorDereferenceRdf-util';

const DF = new DataFactory();
const quad = require('rdf-quad');

const v = DF.variable('v');

describe('MediatedQuadSource', () => {
  let context: IActionContext;
  let mediatorDereferenceRdf: MediatorDereferenceRdf;
  let mediatorMetadata;
  let mediatorMetadataExtract;
  let mediatorRdfResolveHypermedia: any;
  let mediatorRdfResolveHypermediaLinks: any;
  let mediatorRdfResolveHypermediaLinksQueue: any;
  let mediators: any;

  beforeEach(() => {
    context = new ActionContext({
      [KeysInitQuery.query.name]: {},
      [KeysRdfResolveQuadPattern.hypermediaSourcesAggregatedStores.name]: new Map(),
    });
    mediatorDereferenceRdf = utilMediators.mediatorDereferenceRdf;
    mediatorMetadata = utilMediators.mediatorMetadata;
    mediatorMetadataExtract = utilMediators.mediatorMetadataExtract;
    mediatorRdfResolveHypermedia = utilMediators.mediatorRdfResolveHypermedia;
    mediatorRdfResolveHypermediaLinks = utilMediators.mediatorRdfResolveHypermediaLinks;
    mediatorRdfResolveHypermediaLinksQueue = utilMediators.mediatorRdfResolveHypermediaLinksQueue;
    mediators = utilMediators;
  });

  describe('The MediatedQuadSource module', () => {
    it('should be a function', () => {
      expect(MediatedQuadSource).toBeInstanceOf(Function);
    });
  });

  describe('A MediatedQuadSource instance', () => {
    let source: MediatedQuadSource;

    beforeEach(() => {
      source = new MediatedQuadSource(10, 'firstUrl', 'forcedType', 64, false, mediators);
    });

    describe('match', () => {
      it('should return a MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
        return expect(source.match(v, v, v, v, context)).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });

      it('should return a stream', async() => {
        expect(await arrayifyStream(source.match(v, v, v, v, context))).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });

      it('should return a metadata event', async() => {
        const out = source.match(v, v, v, v, context);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        expect(await arrayifyStream(out)).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await metaPromise).toEqual({
          state: expect.any(MetadataValidationState),
          firstMeta: true,
          a: 1,
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
        });
      });

      it('should set the first source after the first match call', async() => {
        source.match(v, v, v, v, context);
        expect(((await source.sourcesState.sources.get('firstUrl')))!.metadata).toEqual({ a: 1 });
        expect(((await source.sourcesState.sources.get('firstUrl')))!.source).toBeTruthy();
      });

      it('should allow a custom first source to be set', async() => {
        source.sourcesState = {
          sources: new LRUCache<string, Promise<ISourceState>>({ max: 10 }),
        };
        source.sourcesState.sources.set('firstUrl', Promise.resolve({
          link: { url: 'firstUrl' },
          handledDatasets: {},
          metadata: { state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            canContainUndefs: false,
            a: 2 },
          source: {
            match() {
              const it = new ArrayIterator([
                quad('s1x', 'p1', 'o1'),
                quad('s2x', 'p2', 'o2'),
              ], { autoStart: false });
              it.setProperty('metadata', {});
              return it;
            },
          },
        }));
        expect(await arrayifyStream(source.match(v, v, v, v, context))).toEqualRdfQuadArray([
          quad('s1x', 'p1', 'o1'),
          quad('s2x', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });

      it('should allow a custom first source to be set and emit a metadata event', async() => {
        source.sourcesState = {
          sources: new LRUCache<string, Promise<ISourceState>>({ max: 10 }),
        };
        source.sourcesState.sources.set('firstUrl', Promise.resolve({
          link: { url: 'firstUrl' },
          handledDatasets: {},
          metadata: { state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 1 },
            canContainUndefs: false,
            a: 2 },
          source: {
            match() {
              const it = new ArrayIterator([
                quad('s1x', 'p1', 'o1'),
                quad('s2x', 'p2', 'o2'),
              ], { autoStart: false });
              it.setProperty('metadata', { firstMeta: true, cardinality: { type: 'exact', value: 1 }});
              return it;
            },
          },
        }));
        const out = source.match(v, v, v, v, context);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        expect(await arrayifyStream(out)).toEqualRdfQuadArray([
          quad('s1x', 'p1', 'o1'),
          quad('s2x', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await metaPromise).toEqual({
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'exact', value: 2 },
          firstMeta: true,
          a: 2,
        });
      });

      it('should match three chained sources', async() => {
        let i = 0;
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: `next${i}` }]});
        mediatorRdfResolveHypermedia.mediate = (args: any) => {
          if (i < 3) {
            i++;
          }
          return Promise.resolve({
            dataset: `MYDATASET${i}`,
            source: {
              match() {
                const it = new ArrayIterator([
                  quad(`s1${i}`, `p1${i}`, `o1${i}`),
                  quad(`s2${i}`, `p2${i}`, `o2${i}`),
                ], { autoStart: false });
                it.setProperty('metadata', { firstMeta: true });
                return it;
              },
            },
          });
        };
        expect(await arrayifyStream(source.match(v, v, v, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
      });
    });
  });

  describe('A MediatedQuadSource instance with aggregated store', () => {
    let source: MediatedQuadSource;

    beforeEach(() => {
      source = new MediatedQuadSource(10, 'firstUrl', 'forcedType', 64, true, mediators);
    });

    describe('match', () => {
      it('should match three chained sources when queried multiple times', async() => {
        let i = 0;
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: `next${i}` }]});
        mediatorRdfResolveHypermedia.mediate = jest.fn((args: any) => {
          if (i < 3) {
            i++;
          }
          return Promise.resolve({
            dataset: `MYDATASET${i}`,
            source: {
              match() {
                const it = new ArrayIterator([
                  quad(`s1${i}`, `p1${i}`, `o1${i}`),
                  quad(`s2${i}`, `p2${i}`, `o2${i}`),
                ], { autoStart: false });
                it.setProperty('metadata', { firstMeta: true });
                return it;
              },
            },
          });
        });
        let j = 0;
        mediatorDereferenceRdf.mediate = async({ url }: IActionDereferenceRdf) => {
          if (j < 3) {
            j++;
          }
          const data: IActorDereferenceRdfOutput = {
            data: <any> new ArrayIterator<RDF.Quad>([
              quad(`s1${j}`, `p1${j}`, `o1${j}`),
              quad(`s2${j}`, `p2${j}`, `o2${j}`),
            ], { autoStart: false }),
            metadata: { triples: true },
            exists: true,
            requestTime: 0,
            url,
          };
          // @ts-expect-error
          data.data.setProperty('metadata', { firstMeta: true });
          return data;
        };
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(await arrayifyStream(source.match(DF.namedNode('s11'), v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);
      });

      it('should match three chained sources when queried multiple times in parallel', async() => {
        let i = 0;
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: `next${i}` }]});
        mediatorRdfResolveHypermedia.mediate = jest.fn((args: any) => {
          if (i < 3) {
            i++;
          }
          return Promise.resolve({
            dataset: `MYDATASET${i}`,
            source: {
              match() {
                const it = new ArrayIterator([
                  quad(`s1${i}`, `p1${i}`, `o1${i}`),
                  quad(`s2${i}`, `p2${i}`, `o2${i}`),
                ], { autoStart: false });
                it.setProperty('metadata', { firstMeta: true, cardinality: { type: 'exact', value: 2 }});
                return it;
              },
            },
          });
        });
        let j = 0;
        mediatorDereferenceRdf.mediate = async({ url }: IActionDereferenceRdf) => {
          if (j < 3) {
            j++;
          }
          const data: IActorDereferenceRdfOutput = {
            data: <any> new ArrayIterator<RDF.Quad>([
              quad(`s1${j}`, `p1${j}`, `o1${j}`),
              quad(`s2${j}`, `p2${j}`, `o2${j}`),
            ], { autoStart: false }),
            metadata: { triples: true },
            exists: true,
            requestTime: 0,
            url,
          };
          // @ts-expect-error
          data.data.setProperty('metadata', { firstMeta: true });
          return data;
        };
        const it1 = source.match(v, v, undefined!, v, context);
        const it2 = source.match(v, v, undefined!, v, context);
        const it3 = source.match(DF.namedNode('s11'), v, undefined!, v, context);

        // Only dummy metadata has been defined yet at this stage
        // It2 and 3 are not undefined, as they originate from the streamingstore.
        expect(it1.getProperty('metadata')).toBeUndefined();
        expect(it2.getProperty('metadata')).toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: {
            type: 'estimate',
            value: 0,
          },
          canContainUndefs: false,
        });
        expect(it3.getProperty('metadata')).toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: {
            type: 'estimate',
            value: 0,
          },
          canContainUndefs: false,
        });

        // Expect the metadata to be modified for every page
        const it1Meta = jest.fn();
        const attachIt1MetaListener = () => {
          it1.getProperty('metadata', (metadata: MetadataQuads) => {
            it1Meta(metadata);
            metadata.state.addInvalidateListener(attachIt1MetaListener);
          });
        };
        attachIt1MetaListener();
        const it2Meta = jest.fn();
        const attachIt2MetaListener = () => {
          it2.getProperty('metadata', (metadata: MetadataQuads) => {
            it2Meta(metadata);
            metadata.state.addInvalidateListener(attachIt2MetaListener);
          });
        };
        attachIt2MetaListener();
        const it3Meta = jest.fn();
        const attachIt3MetaListener = () => {
          it3.getProperty('metadata', (metadata: MetadataQuads) => {
            it3Meta(metadata);
            metadata.state.addInvalidateListener(attachIt3MetaListener);
          });
        };
        attachIt3MetaListener();

        expect(await arrayifyStream(it1)).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);
        expect(await arrayifyStream(it2)).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(await arrayifyStream(it3)).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);

        expect(it1Meta).toHaveBeenCalledTimes(4);
        expect(it1Meta).toHaveBeenNthCalledWith(1, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 2 },
        });
        expect(it1Meta).toHaveBeenNthCalledWith(2, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 4 },
        });
        expect(it1Meta).toHaveBeenNthCalledWith(3, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 6 },
        });
        expect(it1Meta).toHaveBeenNthCalledWith(4, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 8 },
        });
        expect(it2Meta).toHaveBeenCalledTimes(9);
        expect(it2Meta).toHaveBeenNthCalledWith(1, {
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 0 },
        });
        expect(it2Meta).toHaveBeenNthCalledWith(2, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 2 },
        });
        expect(it2Meta).toHaveBeenNthCalledWith(4, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 4 },
        });
        expect(it2Meta).toHaveBeenNthCalledWith(6, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 6 },
        });
        expect(it2Meta).toHaveBeenNthCalledWith(8, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 8 },
        });
        expect(it3Meta).toHaveBeenCalledTimes(6);
        expect(it3Meta).toHaveBeenNthCalledWith(1, {
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 0 },
        });
        expect(it3Meta).toHaveBeenNthCalledWith(2, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 1 },
        });
        expect(it3Meta).toHaveBeenNthCalledWith(6, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'estimate', value: 1 },
        });
      });

      it('should match three chained sources when queried multiple times for multiple queries', async() => {
        let i = 0;
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: `next${i}` }]});
        mediatorRdfResolveHypermedia.mediate = jest.fn((args: any) => {
          if (i < 3) {
            i++;
          }
          return Promise.resolve({
            dataset: `MYDATASET${i}`,
            source: {
              match() {
                const it = new ArrayIterator([
                  quad(`s1${i}`, `p1${i}`, `o1${i}`),
                  quad(`s2${i}`, `p2${i}`, `o2${i}`),
                ], { autoStart: false });
                it.setProperty('metadata', { firstMeta: true });
                return it;
              },
            },
          });
        });
        let j = 0;
        mediatorDereferenceRdf.mediate = async({ url }: IActionDereferenceRdf) => {
          if (j < 3) {
            j++;
          }
          const data: IActorDereferenceRdfOutput = {
            data: <any> new ArrayIterator<RDF.Quad>([
              quad(`s1${j}`, `p1${j}`, `o1${j}`),
              quad(`s2${j}`, `p2${j}`, `o2${j}`),
            ], { autoStart: false }),
            metadata: { triples: true },
            exists: true,
            requestTime: 0,
            url,
          };
          // @ts-expect-error
          data.data.setProperty('metadata', { firstMeta: true });
          return data;
        };

        // First query exec
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(await arrayifyStream(source.match(DF.namedNode('s11'), v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);

        // Second query exec (of the same query!)
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(await arrayifyStream(source.match(DF.namedNode('s11'), v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(4);

        // Second query exec (of a different query!)
        context = context.set(KeysRdfResolveQuadPattern.hypermediaSourcesAggregatedStores, new Map());
        i = 1;
        j = 0;
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(7);
        expect(await arrayifyStream(source.match(v, v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
        expect(await arrayifyStream(source.match(DF.namedNode('s11'), v, undefined!, v, context))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
        ]);
        expect(mediatorRdfResolveHypermedia.mediate).toHaveBeenCalledTimes(7);
      });
    });
  });
});
