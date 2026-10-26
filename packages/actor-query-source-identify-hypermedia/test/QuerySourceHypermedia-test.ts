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

    describe('when no links can be followed from the first source', () => {
      let inner: any;
      let sourceMetadata: Record<string, any>;
      let cachePolicy: any;
      let links: any[] | undefined;
      let linkContext: IActionContext | undefined;
      let directSource: QuerySourceHypermedia;

      beforeEach(() => {
        inner = {
          getSelectorShape: async() => ({ type: 'operation', operation: { operationType: 'wildcard' }, synchronous: true }),
          queryBindings: jest.fn(() => new ArrayIterator([], { autoStart: false })),
          queryBindingsSynchronous: jest.fn(() => [ BF.fromRecord({ s: DF.namedNode('s') }) ]),
        };
        sourceMetadata = { first: [], next: []};
        cachePolicy = undefined;
        links = [];
        linkContext = undefined;
        directSource = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl', context: linkContext },
          64,
          {
            ...mediators,
            mediatorQuerySourceDereferenceLink: {
              mediate: async({ link }: any) => ({ link, source: inner, metadata: sourceMetadata, cachePolicy }),
            },
            mediatorRdfResolveHypermediaLinks: {
              mediate: jest.fn(async() => {
                if (!links) {
                  throw new Error('no links');
                }
                return { links };
              }),
            },
          },
          DF,
          BF,
        );
      });

      async function probe(source = directSource): Promise<void> {
        source.queryBindings(operation, context).destroy();
        await (<any> source).directSourceProbe;
      }

      it('should keep synchronous lookups in the selector shape', async() => {
        await expect(directSource.getSelectorShape(context)).resolves
          .toEqual({ type: 'operation', operation: { operationType: 'wildcard' }, synchronous: true });
      });

      it('should remove synchronous lookups from the selector shape if links can be followed', async() => {
        links = [{ url: 'next' }];
        await expect(directSource.getSelectorShape(context)).resolves
          .toEqual({ type: 'operation', operation: { operationType: 'wildcard' }});
      });

      it('should delegate queryBindings to the first source', async() => {
        await probe();
        const it = directSource.queryBindings(operation, context);
        expect(it).toBe(inner.queryBindings.mock.results.at(-1).value);
        expect(inner.queryBindings).toHaveBeenLastCalledWith(operation, context, undefined);
      });

      it('should probe the first source only once', async() => {
        await probe();
        directSource.queryBindingsSynchronous(<Algebra.Pattern> operation, context);
        directSource.queryBindings(operation, context);
        expect((<any> directSource).mediators.mediatorRdfResolveHypermediaLinks.mediate).toHaveBeenCalledTimes(1);
      });

      it('should delegate queryBindings if link resolution fails', async() => {
        links = undefined;
        await probe();
        expect(directSource.queryBindings(operation, context)).toBe(inner.queryBindings.mock.results.at(-1).value);
      });

      it('should not delegate queryBindings if links can be followed', async() => {
        links = [{ url: 'next' }];
        await probe();
        expect(directSource.queryBindings(operation, context)).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });

      it('should not delegate queryBindings if the source has a cache policy', async() => {
        cachePolicy = { satisfiesWithoutRevalidation: async() => true };
        await probe();
        expect(directSource.queryBindings(operation, context)).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });

      it.each([
        { cardinality: { type: 'exact', value: 1 }},
        { pageSize: 10 },
        { requestTime: 10 },
      ])('should not delegate queryBindings if the source metadata must be accumulated: %o', async(extra) => {
        sourceMetadata = { ...sourceMetadata, ...extra };
        await probe();
        expect(directSource.queryBindings(operation, context)).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });

      it('should not delegate queryBindings if the first source fails', async() => {
        const failing = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl' },
          64,
          { ...mediators, mediatorQuerySourceDereferenceLink: { mediate: async() => {
            throw new Error('dereference failure');
          } }},
          DF,
          BF,
        );
        const it = failing.queryBindings(operation, context);
        const error = new Promise(resolve => it.on('error', resolve));
        await (<any> failing).directSourceProbe;
        await expect(error).resolves.toThrow('dereference failure');
        expect((<any> failing).directSourceState).toBeUndefined();
      });

      it('should look up synchronously in the first source', async() => {
        expect(directSource.queryBindingsSynchronous(<Algebra.Pattern> operation, context)).toBeUndefined();
        await (<any> directSource).directSourceProbe;
        expect(directSource.queryBindingsSynchronous(<Algebra.Pattern> operation, context))
          .toEqualBindingsArray([ BF.fromRecord({ s: DF.namedNode('s') }) ]);
        expect(inner.queryBindingsSynchronous).toHaveBeenCalledWith(operation, context);
      });

      it('should not look up synchronously in a first source without synchronous lookups', async() => {
        delete inner.queryBindingsSynchronous;
        await probe();
        expect(directSource.queryBindingsSynchronous(<Algebra.Pattern> operation, context)).toBeUndefined();
      });

      it('should query the first source within the context of its link', async() => {
        const withContext = new QuerySourceHypermedia(
          10,
          { url: 'firstUrl', context: new ActionContext({ x: 'y' }) },
          64,
          (<any> directSource).mediators,
          DF,
          BF,
        );
        await probe(withContext);
        withContext.queryBindingsSynchronous(<Algebra.Pattern> operation, context);
        withContext.queryBindingsSynchronous(<Algebra.Pattern> operation, context);
        const merged = context.merge(new ActionContext({ x: 'y' }));
        expect(inner.queryBindingsSynchronous).toHaveBeenNthCalledWith(1, operation, merged);
        // The merged context is reused for the same context
        expect(inner.queryBindingsSynchronous.mock.calls[0][1]).toBe(inner.queryBindingsSynchronous.mock.calls[1][1]);
        const otherContext = context.set(KeysQueryOperation.unionDefaultGraph, true);
        withContext.queryBindingsSynchronous(<Algebra.Pattern> operation, otherContext);
        expect(inner.queryBindingsSynchronous)
          .toHaveBeenLastCalledWith(operation, otherContext.merge(new ActionContext({ x: 'y' })));
      });
    });

    describe('withoutSynchronous', () => {
      const plain: any = { type: 'operation', operation: { operationType: 'wildcard' }};
      const sync: any = { ...plain, synchronous: true };

      it('should keep shapes without synchronous flag', () => {
        const shapes: any[] = [
          plain,
          { ...plain, children: [ plain ]},
          { type: 'disjunction', children: [ plain ]},
          { type: 'negation', child: plain },
        ];
        for (const shape of shapes) {
          expect(QuerySourceHypermedia.withoutSynchronous(shape)).toBe(shape);
        }
      });

      it('should remove synchronous flags', () => {
        expect(QuerySourceHypermedia.withoutSynchronous(sync)).toEqual(plain);
        expect(QuerySourceHypermedia.withoutSynchronous({ ...plain, children: [ sync ]}))
          .toEqual({ ...plain, children: [ plain ]});
        expect(QuerySourceHypermedia.withoutSynchronous({ ...sync, children: [ plain ]}))
          .toEqual({ ...plain, children: [ plain ]});
        expect(QuerySourceHypermedia.withoutSynchronous({ type: 'conjunction', children: [ plain, sync ]}))
          .toEqual({ type: 'conjunction', children: [ plain, plain ]});
        expect(QuerySourceHypermedia.withoutSynchronous({ type: 'arity', min: 1, child: sync }))
          .toEqual({ type: 'arity', min: 1, child: plain });
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

      it('should not cache sources that could not be resolved', async() => {
        const spy = jest.spyOn(utilMediators.mediatorQuerySourceDereferenceLink, 'mediate');
        spy.mockClear();
        spy.mockRejectedValueOnce(new Error('Source does not exist'));

        await expect(source.getSourceCached({ url: 'startUrl' }, {}, context)).rejects
          .toThrow('Source does not exist');
        await expect(source.getSourceCached({ url: 'startUrl' }, {}, context)).resolves.toMatchObject({
          link: { url: 'startUrl' },
          metadata: { a: 1 },
        });
        expect(spy).toHaveBeenCalledTimes(2);

        spy.mockRestore();
      });

      it('should not remove a newer cache entry when an older source could not be resolved', async() => {
        const spy = jest.spyOn(utilMediators.mediatorQuerySourceDereferenceLink, 'mediate');
        spy.mockClear();
        let rejectFirst: (error: Error) => void;
        spy.mockReturnValueOnce(<any> new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }));

        const srcFailing = source.getSourceCached({ url: 'startUrl' }, {}, context);
        // Replace the cache entry before the first source fails
        source.sourcesState.delete('startUrl');
        const srcNew = source.getSourceCached({ url: 'startUrl' }, {}, context);
        rejectFirst!(new Error('Source does not exist'));

        await expect(srcFailing).rejects.toThrow('Source does not exist');
        expect(source.sourcesState.get('startUrl')).toBe(srcNew);

        spy.mockRestore();
      });
    });
  });
});
