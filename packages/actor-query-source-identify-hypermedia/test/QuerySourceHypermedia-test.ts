import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  MediatorDereferenceRdf,
  IActionDereferenceRdf,
  IActorDereferenceRdfOutput,
} from '@comunica/bus-dereference-rdf';
import type { IActionQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import { KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import 'jest-rdf';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import type { ISourceState } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';
import { QuerySourceHypermedia } from '../lib/QuerySourceHypermedia';
import { mediators as utilMediators } from './MediatorDereferenceRdf-util';
import '@comunica/jest';

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();
const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

const v = DF.variable('v');

describe('QuerySourceHypermedia', () => {
  let context: IActionContext;
  let mediatorDereferenceRdf: MediatorDereferenceRdf;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorQuerySourceIdentifyHypermedia: any;
  let mediatorRdfResolveHypermediaLinks: any;
  let mediatorRdfResolveHypermediaLinksQueue: any;
  let mediators: any;
  let logWarning: (warningMessage: string) => void;
  let operation: Algebra.Operation;

  beforeEach(() => {
    context = new ActionContext({
      [KeysInitQuery.query.name]: {},
      [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
    });
    mediatorDereferenceRdf = utilMediators.mediatorDereferenceRdf;
    mediatorMetadata = utilMediators.mediatorMetadata;
    mediatorMetadataExtract = utilMediators.mediatorMetadataExtract;
    mediatorQuerySourceIdentifyHypermedia = utilMediators.mediatorQuerySourceIdentifyHypermedia;
    mediatorRdfResolveHypermediaLinks = utilMediators.mediatorRdfResolveHypermediaLinks;
    mediatorRdfResolveHypermediaLinksQueue = utilMediators.mediatorRdfResolveHypermediaLinksQueue;
    mediators = utilMediators;
    logWarning = jest.fn();
    operation = AF.createPattern(
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
    );
  });

  describe('The QuerySourceHypermedia module', () => {
    it('should be a function', () => {
      expect(QuerySourceHypermedia).toBeInstanceOf(Function);
    });
  });

  describe('A QuerySourceHypermedia instance', () => {
    let source: QuerySourceHypermedia;

    beforeEach(() => {
      source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, false, mediators, logWarning, BF);
    });

    describe('getSelectorShape', () => {
      it('should return a selector shape', async() => {
        await expect(source.getSelectorShape(context)).resolves.toEqual({
          type: 'operation',
          operation: {
            operationType: 'pattern',
            pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
          },
          variablesOptional: [
            DF.variable('s'),
            DF.variable('p'),
            DF.variable('o'),
            DF.variable('g'),
          ],
        });
      });
    });

    describe('toString', () => {
      it('should return a string representation', async() => {
        expect(source.toString()).toBe('QuerySourceHypermedia(firstUrl)');
      });
    });

    describe('queryBindings', () => {
      it('should return a MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
        const it = source.queryBindings(operation, context);
        expect(it).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
        it.destroy();
      });

      it('should return a stream', async() => {
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.namedNode('s1'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s2'),
            p: DF.namedNode('p2'),
            o: DF.namedNode('o2'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s3'),
            p: DF.namedNode('p3'),
            o: DF.namedNode('o3'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s4'),
            p: DF.namedNode('p4'),
            o: DF.namedNode('o4'),
            g: DF.defaultGraph(),
          }),
        ]);
      });

      it('should return a metadata event', async() => {
        const out = source.queryBindings(operation, context);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.namedNode('s1'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s2'),
            p: DF.namedNode('p2'),
            o: DF.namedNode('o2'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s3'),
            p: DF.namedNode('p3'),
            o: DF.namedNode('o3'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s4'),
            p: DF.namedNode('p4'),
            o: DF.namedNode('o4'),
            g: DF.defaultGraph(),
          }),
        ]);
        await expect(metaPromise).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          firstMeta: true,
        });
      });

      it('should set the first source after the first match call', async() => {
        source.queryBindings(operation, context);
        expect(((await source.sourcesState.get('firstUrl')))!.metadata).toEqual({ a: 1 });
        expect(((await source.sourcesState.get('firstUrl')))!.source).toBeTruthy();
      });

      it('should allow a custom first source to be set', async() => {
        source.sourcesState = new LRUCache<string, Promise<ISourceState>>({ max: 10 });
        source.sourcesState.set('firstUrl', Promise.resolve(<ISourceState> <any> {
          link: { url: 'firstUrl' },
          handledDatasets: {},
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            canContainUndefs: false,
            a: 2,
          },
          source: {
            queryBindings() {
              const it = new ArrayIterator([
                BF.fromRecord({
                  s: DF.namedNode('s1x'),
                  p: DF.namedNode('p1'),
                  o: DF.namedNode('o1'),
                }),
                BF.fromRecord({
                  s: DF.namedNode('s2x'),
                  p: DF.namedNode('p2'),
                  o: DF.namedNode('o2'),
                }),
              ], { autoStart: false });
              it.setProperty('metadata', {});
              return it;
            },
          },
        }));
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.namedNode('s1x'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s2x'),
            p: DF.namedNode('p2'),
            o: DF.namedNode('o2'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s3'),
            p: DF.namedNode('p3'),
            o: DF.namedNode('o3'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s4'),
            p: DF.namedNode('p4'),
            o: DF.namedNode('o4'),
            g: DF.defaultGraph(),
          }),
        ]);
      });

      it('should allow a custom first source to be set and emit a metadata event', async() => {
        source.sourcesState = new LRUCache<string, Promise<ISourceState>>({ max: 10 });
        source.sourcesState.set('firstUrl', Promise.resolve(<ISourceState> <any> {
          link: { url: 'firstUrl' },
          handledDatasets: {},
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 1 },
            canContainUndefs: false,
            a: 2,
          },
          source: {
            queryBindings() {
              const it = new ArrayIterator([
                BF.fromRecord({
                  s: DF.namedNode('s1x'),
                  p: DF.namedNode('p1'),
                  o: DF.namedNode('o1'),
                }),
                BF.fromRecord({
                  s: DF.namedNode('s2x'),
                  p: DF.namedNode('p2'),
                  o: DF.namedNode('o2'),
                }),
              ], { autoStart: false });
              it.setProperty('metadata', { firstMeta: true, cardinality: { type: 'exact', value: 1 }});
              return it;
            },
          },
        }));
        const out = source.queryBindings(operation, context);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.namedNode('s1x'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s2x'),
            p: DF.namedNode('p2'),
            o: DF.namedNode('o2'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s3'),
            p: DF.namedNode('p3'),
            o: DF.namedNode('o3'),
            g: DF.defaultGraph(),
          }),
          BF.fromRecord({
            s: DF.namedNode('s4'),
            p: DF.namedNode('p4'),
            o: DF.namedNode('o4'),
            g: DF.defaultGraph(),
          }),
        ]);
        await expect(metaPromise).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 1 },
          firstMeta: true,
        });
      });

      it('should match three chained sources', async() => {
        let i = 0;
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorRdfResolveHypermediaLinks = {
          mediate: () => Promise.resolve({ links: i < 3 ? [{ url: `next${i}` }] : []}),
        };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate(args: any) {
            if (i < 3) {
              i++;
            }
            return Promise.resolve({
              dataset: `MYDATASET${i}`,
              source: {
                queryBindings() {
                  const it = new ArrayIterator([
                    BF.fromRecord({
                      s: DF.namedNode(`s1${i}`),
                      p: DF.namedNode(`p1${i}`),
                      o: DF.namedNode(`o1${i}`),
                    }),
                    BF.fromRecord({
                      s: DF.namedNode(`s2${i}`),
                      p: DF.namedNode(`p2${i}`),
                      o: DF.namedNode(`o2${i}`),
                    }),
                  ], { autoStart: false });
                  it.setProperty('metadata', { firstMeta: true });
                  return it;
                },
              },
            });
          },
        };
        source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, false, mediatorsThis, logWarning, BF);
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.namedNode('s11'),
            p: DF.namedNode('p11'),
            o: DF.namedNode('o11'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s21'),
            p: DF.namedNode('p21'),
            o: DF.namedNode('o21'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s12'),
            p: DF.namedNode('p12'),
            o: DF.namedNode('o12'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s22'),
            p: DF.namedNode('p22'),
            o: DF.namedNode('o22'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s13'),
            p: DF.namedNode('p13'),
            o: DF.namedNode('o13'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s23'),
            p: DF.namedNode('p23'),
            o: DF.namedNode('o23'),
          }),
        ]);
      });

      it('should emit an error when mediatorQuerySourceIdentifyHypermedia rejects', async() => {
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          async mediate() {
            throw new Error(`mediatorQuerySourceIdentifyHypermedia error`);
          },
        };
        source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, false, mediatorsThis, logWarning, BF);

        await expect(source.queryBindings(operation, context).toArray()).rejects.toThrow(`mediatorQuerySourceIdentifyHypermedia error`);
      });
    });

    describe('queryQuads', () => {
      it('should throw', async() => {
        await expect(source.queryQuads(<any> undefined, context).toArray()).resolves
          .toBeRdfIsomorphic([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
          ]);
      });
    });

    describe('queryBoolean', () => {
      it('should throw', async() => {
        await expect(source.queryBoolean(<any> undefined, context)).resolves
          .toBe(true);
      });
    });

    describe('queryVoid', () => {
      it('should throw', async() => {
        await source.queryVoid(<any> undefined, context);
      });
    });

    describe('getSource', () => {
      it('should get urls based on mediatorQuerySourceIdentifyHypermedia', async() => {
        await expect(source.getSource({ url: 'startUrl' }, {}, context, undefined)).resolves.toMatchObject({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: { a: 1 },
          source: expect.anything(),
        });
      });

      it('should get urls based on mediatorQuerySourceIdentifyHypermedia without dataset id', async() => {
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate: async({ quads }: IActionQuerySourceIdentifyHypermedia) => ({
            source: { sourceContents: (await (<any> quads).toArray())[0].object.value },
          }),
        };
        source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, false, mediatorsThis, logWarning, BF);
        await expect(source.getSource({ url: 'startUrl' }, {}, context, undefined)).resolves.toEqual({
          link: { url: 'startUrl' },
          handledDatasets: {},
          metadata: { a: 1 },
          source: { sourceContents: 'o3' },
        });
      });

      it('should apply the link transformation', async() => {
        const transform = jest.fn(inputQuads => inputQuads
          .map((q: RDF.Quad) => DF.quad(q.subject, q.predicate, DF.literal(`TRANSFORMED(${q.object.value})`))));
        await expect(source.getSource({ url: 'startUrl', transform }, {}, context, undefined)).resolves.toEqual({
          link: { url: 'startUrl', transform },
          handledDatasets: { MYDATASET: true },
          metadata: { a: 1 },
          source: expect.anything(),
        });
        expect(transform).toHaveBeenCalledWith(expect.any(require('node:stream').Readable));
      });

      it('should apply the link context', async() => {
        jest.spyOn(mediatorDereferenceRdf, 'mediate');
        jest.spyOn(mediatorMetadata, 'mediate');
        jest.spyOn(mediatorMetadataExtract, 'mediate');
        jest.spyOn(mediatorQuerySourceIdentifyHypermedia, 'mediate');
        await expect(source.getSource(
          { url: 'startUrl', context: new ActionContext({ a: 'b' }) },
          {},
          context,
          undefined,
        )).resolves
          .toEqual({
            link: { url: 'startUrl', context: new ActionContext({ a: 'b' }) },
            handledDatasets: { MYDATASET: true },
            metadata: { a: 1 },
            source: expect.anything(),
          });
        expect(mediatorDereferenceRdf.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.query.name]: {},
            [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
          }),
        });
        expect(mediatorMetadata.mediate).toHaveBeenCalledWith({
          quads: expect.any(require('node:stream').Readable),
          triples: true,
          url: 'startUrl',
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.query.name]: {},
            [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
          }),
        });
        expect(mediatorMetadataExtract.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          metadata: { a: 1 },
          requestTime: 0,
          context: new ActionContext({
            [KeysInitQuery.query.name]: {},
            [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
            a: 'b',
          }),
        });
        expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledWith({
          url: 'startUrl',
          handledDatasets: { MYDATASET: true },
          metadata: { a: 1 },
          quads: expect.any(require('node:stream').Readable),
          context: new ActionContext({
            [KeysInitQuery.query.name]: {},
            [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
            a: 'b',
          }),
        });
      });

      it('should delegate dereference errors to the source', async() => {
        const error = new Error('MediatedLinkedRdfSourcesAsyncRdfIterator dereference error');
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate: async({ quads }: IActionQuerySourceIdentifyHypermedia) => ({
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
          }),
        };
        mediatorsThis.mediatorDereferenceRdf = {
          async mediate() {
            throw error;
          },
        };
        source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, false, mediatorsThis, logWarning, BF);
        const ret = await source.getSource({ url: 'startUrl' }, {}, context, undefined);
        expect(ret).toEqual({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: { cardinality: { type: 'exact', value: 0 }},
          source: { sourceContents: expect.any(Readable) },
        });
        await expect(arrayifyStream((<any> ret.source).sourceContents)).rejects.toThrow(error);
      });

      it('should ignore data errors', async() => {
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate: async({ quads }: IActionQuerySourceIdentifyHypermedia) => ({
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
          }),
        };
        mediatorsThis.mediatorMetadata = {
          mediate: jest.fn(({ quads }: any) => {
            const data = new Readable();
            data._read = () => null;
            data.on('newListener', (name: string) => {
              if (name === 'error') {
                setImmediate(() => data
                  .emit('error', new Error('QuerySourceHypermedia ignored error')));
              }
            });
            return Promise
              .resolve({
                data,
                metadata: quads,
              });
          }),
        };
        source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, false, mediatorsThis, logWarning, BF);

        await source.getSource({ url: 'startUrl' }, {}, context, undefined);
        await new Promise(setImmediate);
      });
    });
  });

  describe('A QuerySourceHypermedia instance with aggregated store', () => {
    let source: QuerySourceHypermedia;

    beforeEach(() => {
      source = new QuerySourceHypermedia(10, 'firstUrl', 'forcedType', 64, true, mediators, logWarning, BF);
      const aggregateStores = new Map();
      context = context.set(KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores, aggregateStores);
    });

    describe('queryBindings', () => {
      it('should match three chained sources when queried multiple times in parallel', async() => {
        let i = 0;
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorRdfResolveHypermediaLinks = {
          mediate: () => Promise.resolve({ links: i < 3 ? [{ url: `next${i}` }] : []}),
        };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate: jest.fn(async(args: any) => {
            if (i < 3) {
              i++;
            }
            await args.quads.toArray(); // Wait until the quads are fully consumed
            return {
              dataset: `MYDATASET${i}`,
              source: {
                queryBindings() {
                  const it = new ArrayIterator([
                    BF.fromRecord({
                      s: DF.namedNode(`s1${i}`),
                      p: DF.namedNode(`p1${i}`),
                      o: DF.namedNode(`o1${i}`),
                    }),
                    BF.fromRecord({
                      s: DF.namedNode(`s2${i}`),
                      p: DF.namedNode(`p2${i}`),
                      o: DF.namedNode(`o2${i}`),
                    }),
                  ], { autoStart: false });
                  it.setProperty('metadata', { firstMeta: true, cardinality: { type: 'exact', value: 2 }});
                  return it;
                },
              },
            };
          }),
        };
        let j = 0;
        mediatorsThis.mediatorDereferenceRdf = {
          async mediate({ url }: IActionDereferenceRdf) {
            if (j < 3) {
              j++;
            }
            const data: IActorDereferenceRdfOutput = {
              data: streamifyArray([
                quad(`s1${j}`, `p1${j}`, `o1${j}`),
                quad(`s2${j}`, `p2${j}`, `o2${j}`),
              ]),
              metadata: { triples: true },
              exists: true,
              requestTime: 0,
              url,
            };
            return data;
          },
        };
        source = new QuerySourceHypermedia(
          10,
          'firstUrl',
          'forcedType',
          64,
          true,
          mediatorsThis,
          logWarning,
          BF,
        );
        const it1 = source.queryBindings(operation, context);
        const spy = jest.spyOn((<any> it1), 'kickstart');
        const it2 = source.queryBindings(operation, context);
        const it3 = source.queryBindings(
          AF.createPattern(DF.namedNode('s11'), DF.variable('p'), DF.variable('o')),
          context,
        );

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
          variables: [ DF.variable('s'), DF.variable('p'), DF.variable('o') ],
        });
        expect(it3.getProperty('metadata')).toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: {
            type: 'estimate',
            value: 0,
          },
          canContainUndefs: false,
          variables: [ DF.variable('p'), DF.variable('o') ],
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

        const expected = [
          BF.fromRecord({
            s: DF.namedNode('s11'),
            p: DF.namedNode('p11'),
            o: DF.namedNode('o11'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s21'),
            p: DF.namedNode('p21'),
            o: DF.namedNode('o21'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s12'),
            p: DF.namedNode('p12'),
            o: DF.namedNode('o12'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s22'),
            p: DF.namedNode('p22'),
            o: DF.namedNode('o22'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s13'),
            p: DF.namedNode('p13'),
            o: DF.namedNode('o13'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s23'),
            p: DF.namedNode('p23'),
            o: DF.namedNode('o23'),
          }),
        ];
        await expect(it1).toEqualBindingsStream(expected);
        expect(mediatorsThis.mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(3);
        await expect(it2).toEqualBindingsStream(expected);
        await expect(it3).toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p11'),
            o: DF.namedNode('o11'),
          }),
        ]);
        expect(mediatorsThis.mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(3);

        expect(it1Meta).toHaveBeenCalledTimes(4);
        expect(it1Meta).toHaveBeenNthCalledWith(1, {
          state: expect.any(MetadataValidationState),
          firstMeta: true,
          cardinality: { type: 'exact', value: 2 },
        });
        expect(it1Meta).toHaveBeenNthCalledWith(2, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 2 },
        });
        expect(it1Meta).toHaveBeenNthCalledWith(3, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 4 },
        });
        expect(it1Meta).toHaveBeenNthCalledWith(4, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'exact', value: 6 },
        });
        expect(it2Meta).toHaveBeenCalledTimes(8);
        expect(it2Meta).toHaveBeenNthCalledWith(1, {
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 0 },
          variables: [ DF.variable('s'), DF.variable('p'), DF.variable('o') ],
        });
        expect(it2Meta).toHaveBeenNthCalledWith(2, {
          state: expect.any(MetadataValidationState),
          a: 1,
          firstMeta: true,
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('s'), DF.variable('p'), DF.variable('o') ],
        });
        expect(it2Meta).toHaveBeenNthCalledWith(4, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [ DF.variable('s'), DF.variable('p'), DF.variable('o') ],
        });
        expect(it2Meta).toHaveBeenNthCalledWith(6, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('s'), DF.variable('p'), DF.variable('o') ],
        });
        expect(it3Meta).toHaveBeenCalledTimes(4);
        expect(it3Meta).toHaveBeenNthCalledWith(1, {
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 0 },
          variables: [ DF.variable('p'), DF.variable('o') ],
        });
        expect(it3Meta).toHaveBeenNthCalledWith(2, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 0 },
          firstMeta: true,
          canContainUndefs: false,
          variables: [ DF.variable('p'), DF.variable('o') ],
        });
        expect(it3Meta).toHaveBeenNthCalledWith(4, {
          state: expect.any(MetadataValidationState),
          a: 1,
          cardinality: { type: 'estimate', value: 0 },
          firstMeta: true,
          canContainUndefs: false,
          variables: [ DF.variable('p'), DF.variable('o') ],
        });

        expect(spy).toHaveBeenCalledTimes(2);
      });

      it('should match three chained sources when queried multiple times', async() => {
        let i = 0;
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorRdfResolveHypermediaLinks = {
          mediate: () => Promise.resolve({ links: i < 3 ? [{ url: `next${i}` }] : []}),
        };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate: jest.fn((args: any) => {
            if (i < 3) {
              i++;
            }
            return Promise.resolve({
              dataset: `MYDATASET${i}`,
              source: {
                queryBindings() {
                  const it = new ArrayIterator([
                    BF.fromRecord({
                      s: DF.namedNode(`s1${i}`),
                      p: DF.namedNode(`p1${i}`),
                      o: DF.namedNode(`o1${i}`),
                    }),
                    BF.fromRecord({
                      s: DF.namedNode(`s2${i}`),
                      p: DF.namedNode(`p2${i}`),
                      o: DF.namedNode(`o2${i}`),
                    }),
                  ], { autoStart: false });
                  it.setProperty('metadata', { firstMeta: true });
                  return it;
                },
              },
            });
          }),
        };
        let j = 0;
        mediatorsThis.mediatorDereferenceRdf = {
          async mediate({ url }: IActionDereferenceRdf) {
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
          },
        };
        source = new QuerySourceHypermedia(
          10,
          'firstUrl',
          'forcedType',
          64,
          true,
          mediatorsThis,
          logWarning,
          BF,
        );
        const expected = [
          BF.fromRecord({
            s: DF.namedNode('s11'),
            p: DF.namedNode('p11'),
            o: DF.namedNode('o11'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s21'),
            p: DF.namedNode('p21'),
            o: DF.namedNode('o21'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s12'),
            p: DF.namedNode('p12'),
            o: DF.namedNode('o12'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s22'),
            p: DF.namedNode('p22'),
            o: DF.namedNode('o22'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s13'),
            p: DF.namedNode('p13'),
            o: DF.namedNode('o13'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s23'),
            p: DF.namedNode('p23'),
            o: DF.namedNode('o23'),
          }),
        ];
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream(expected);
        expect(mediatorsThis.mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(3);
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream(expected);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s11'), DF.variable('p'), DF.variable('o')),
          context,
        )).toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p11'),
            o: DF.namedNode('o11'),
          }),
        ]);
        expect(mediatorsThis.mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(3);
      });

      it('should match three chained sources when queried multiple times in different query contexts', async() => {
        let i = 0;
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorRdfResolveHypermediaLinks = {
          mediate: () => Promise.resolve({ links: i < 3 ? [{ url: `next${i}` }] : []}),
        };
        mediatorsThis.mediatorQuerySourceIdentifyHypermedia = {
          mediate: jest.fn((args: any) => {
            if (i < 3) {
              i++;
            }
            return Promise.resolve({
              dataset: `MYDATASET${i}`,
              source: {
                queryBindings() {
                  const it = new ArrayIterator([
                    BF.fromRecord({
                      s: DF.namedNode(`s1${i}`),
                      p: DF.namedNode(`p1${i}`),
                      o: DF.namedNode(`o1${i}`),
                    }),
                    BF.fromRecord({
                      s: DF.namedNode(`s2${i}`),
                      p: DF.namedNode(`p2${i}`),
                      o: DF.namedNode(`o2${i}`),
                    }),
                  ], { autoStart: false });
                  it.setProperty('metadata', { firstMeta: true });
                  return it;
                },
              },
            });
          }),
        };
        let j = 0;
        mediatorsThis.mediatorDereferenceRdf = {
          async mediate({ url }: IActionDereferenceRdf) {
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
          },
        };
        source = new QuerySourceHypermedia(
          10,
          'firstUrl',
          'forcedType',
          64,
          true,
          mediatorsThis,
          logWarning,
          BF,
        );
        const expected = [
          BF.fromRecord({
            s: DF.namedNode('s11'),
            p: DF.namedNode('p11'),
            o: DF.namedNode('o11'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s21'),
            p: DF.namedNode('p21'),
            o: DF.namedNode('o21'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s12'),
            p: DF.namedNode('p12'),
            o: DF.namedNode('o12'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s22'),
            p: DF.namedNode('p22'),
            o: DF.namedNode('o22'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s13'),
            p: DF.namedNode('p13'),
            o: DF.namedNode('o13'),
          }),
          BF.fromRecord({
            s: DF.namedNode('s23'),
            p: DF.namedNode('p23'),
            o: DF.namedNode('o23'),
          }),
        ];
        await expect(source.queryBindings(operation, new ActionContext({
          [KeysInitQuery.query.name]: {},
          [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
        }))).toEqualBindingsStream(expected);
        expect(mediatorsThis.mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(3);
        i = 1;
        j = 1;
        await expect(source.queryBindings(operation, new ActionContext({
          [KeysInitQuery.query.name]: {},
          [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
        }))).toEqualBindingsStream(expected);
      });
    });
  });
});
