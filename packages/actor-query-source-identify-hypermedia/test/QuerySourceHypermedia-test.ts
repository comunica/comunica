import type { IActionQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { ArrayIterator } from 'asynciterator';
import 'jest-rdf';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import type { ISourceState } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';
import { QuerySourceHypermedia } from '../lib/QuerySourceHypermedia';
import { mediators as utilMediators } from './MediatorDereferenceRdf-util';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);

describe('QuerySourceHypermedia', () => {
  let context: IActionContext;
  let mediators: any;
  let operation: Algebra.Operation;

  beforeEach(() => {
    context = new ActionContext({
      [KeysInitQuery.dataFactory.name]: DF,
      [KeysInitQuery.query.name]: {},
    });
    mediators = utilMediators;
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
      source = new QuerySourceHypermedia(
        10,
        { url: 'firstUrl', forceSourceType: 'forcedType' },
        64,
        mediators,
        DF,
        BF,
      );
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

    describe('getFilterFactor', () => {
      it('should return 1', async() => {
        await expect(source.getFilterFactor(context)).resolves.toBe(1);
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
            s: DF.namedNode('firstUrl'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            s: DF.namedNode('next'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
        ]);
      });

      it('should return a metadata event', async() => {
        const out = source.queryBindings(operation, context);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.namedNode('firstUrl'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            s: DF.namedNode('next'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
        ]);
        await expect(metaPromise).resolves.toEqual({
          a: 1,
          cardinality: {
            type: 'estimate',
            value: Number.POSITIVE_INFINITY,
          },
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
            s: DF.namedNode('next'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
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
            s: DF.namedNode('next'),
            p: DF.namedNode('p1'),
            o: DF.namedNode('o1'),
          }),
        ]);
        await expect(metaPromise).resolves.toEqual({
          a: 2,
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 2 },

          firstMeta: true,
        });
      });

      it('should match three chained sources', async() => {
        let i = 0;
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorRdfResolveHypermediaLinks = {
          mediate: () => Promise.resolve({ links: i < 3 ? [{ url: `next${i}` }] : []}),
        };
        mediatorsThis.mediatorQuerySourceDereferenceLink = {
          mediate() {
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
        source = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl', forceSourceType: 'forcedType' },
          64,
          mediatorsThis,
          DF,
          BF,
        );
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

      it('should emit an error when mediatorQuerySourceDereferenceLink rejects', async() => {
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorQuerySourceDereferenceLink = {
          async mediate() {
            throw new Error(`mediatorQuerySourceDereferenceLink error`);
          },
        };
        source = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl', forceSourceType: 'forcedType' },
          64,
          mediatorsThis,
          DF,
          BF,
        );

        await expect(source.queryBindings(operation, context).toArray())
          .rejects.toThrow(`mediatorQuerySourceDereferenceLink error`);
      });
    });

    describe('queryQuads', () => {
      it('should throw', async() => {
        await expect(source.queryQuads(<any> undefined, context).toArray()).resolves
          .toEqual([]);
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
      it('should get urls based on mediatorQuerySourceDereferenceLink', async() => {
        jest.spyOn(utilMediators.mediatorQuerySourceDereferenceLink, 'mediate');
        await expect(source.getSource({ url: 'startUrl' }, {}, context)).resolves.toMatchObject({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: { a: 1 },
          source: expect.anything(),
        });
        expect(utilMediators.mediatorQuerySourceDereferenceLink.mediate).toHaveBeenCalledWith({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          context,
        });
      });

      it('should not merge the link context yet', async() => {
        jest.spyOn(utilMediators.mediatorQuerySourceDereferenceLink, 'mediate');
        const linkContext = new ActionContext({ link: 1 });
        await expect(source.getSource({ url: 'startUrl', context: linkContext }, {}, context)).resolves.toMatchObject({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: { a: 1 },
          source: expect.anything(),
        });
        expect(utilMediators.mediatorQuerySourceDereferenceLink.mediate).toHaveBeenCalledWith({
          link: { url: 'startUrl', context: linkContext },
          handledDatasets: { MYDATASET: true },
          context,
        });
      });

      it('should ignore data errors', async() => {
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorQuerySourceDereferenceLink = {
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
        source = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl', forceSourceType: 'forcedType' },
          64,
          mediatorsThis,
          DF,
          BF,
        );

        await source.getSource({ url: 'startUrl' }, {}, context);
        await new Promise(setImmediate);
      });

      it('should skip metadata extraction for single forced SPARQL endpoints', async() => {
        const mediatorsThis = { ...mediators };
        mediatorsThis.mediatorMetadata = {
          mediate: jest.fn(),
        };
        source = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl', forceSourceType: 'sparql' },
          64,
          mediatorsThis,
          DF,
          BF,
        );

        await source.getSource(
          { url: 'startUrl' },
          {},
          context.set(KeysQueryOperation.querySources, [ <any> 'a' ]),
        );
        await new Promise(setImmediate);
        expect(mediatorsThis.mediatorMetadata.mediate).not.toHaveBeenCalled();
      });
    });

    describe('getSourceCached', () => {
      it('should return sources', async() => {
        const src1 = await source.getSourceCached({ url: 'startUrl' }, {}, context);
        expect(src1).toMatchObject({
          link: { url: 'startUrl' },
          handledDatasets: { MYDATASET: true },
          metadata: { a: 1 },
          source: expect.anything(),
        });
      });

      it('should cache sources asynchronously', async() => {
        const spy = jest.spyOn(utilMediators.mediatorQuerySourceDereferenceLink, 'mediate');
        spy.mockClear();
        const src1 = await source.getSourceCached({ url: 'startUrl' }, {}, context);
        const src2 = await source.getSourceCached({ url: 'startUrl' }, {}, context);
        expect(src1).toBe(src2);
        expect(utilMediators.mediatorQuerySourceDereferenceLink.mediate).toHaveBeenCalledTimes(1);
      });

      it('should cache sources synchronously', async() => {
        const spy = jest.spyOn(utilMediators.mediatorQuerySourceDereferenceLink, 'mediate');
        spy.mockClear();
        const src1 = source.getSourceCached({ url: 'startUrl' }, {}, context);
        const src2 = source.getSourceCached({ url: 'startUrl' }, {}, context);
        await expect(src1).resolves.toBe(await src2);
        expect(utilMediators.mediatorQuerySourceDereferenceLink.mediate).toHaveBeenCalledTimes(1);
      });

      it('should cache indefinitely if source has no cache policy', async() => {
        const src1 = await source.getSourceCached({ url: 'startUrl' }, {}, context);
        const src2 = await source.getSourceCached({ url: 'startUrl' }, {}, context);
        expect(src1).toBe(src2);
      });

      it('should cache asynchronously if source has a cache policy that remains valid', async() => {
        const src1 = await source.getSourceCached({ url: 'cachepolicytrue' }, {}, context);
        const src2 = await source.getSourceCached({ url: 'cachepolicytrue' }, {}, context);
        expect(src1).toBe(src2);
      });

      it('should cache synchronously if source has a cache policy that remains valid', async() => {
        const src1 = source.getSourceCached({ url: 'cachepolicytrue' }, {}, context);
        const src2 = source.getSourceCached({ url: 'cachepolicytrue' }, {}, context);
        await expect(src1).resolves.toBe(await src2);
      });

      it('should not cache asynchronously if source has a cache policy that does not remain valid', async() => {
        const src1 = await source.getSourceCached({ url: 'cachepolicyfalse' }, {}, context);
        const src2 = await source.getSourceCached({ url: 'cachepolicyfalse' }, {}, context);
        expect(src1).not.toBe(src2);
      });

      it('should not cache synchronously if source has a cache policy that does not remain valid', async() => {
        const src1 = source.getSourceCached({ url: 'cachepolicyfalse' }, {}, context);
        const src2 = source.getSourceCached({ url: 'cachepolicyfalse' }, {}, context);
        await expect(src1).resolves.not.toBe(await src2);
      });
    });
  });
});
