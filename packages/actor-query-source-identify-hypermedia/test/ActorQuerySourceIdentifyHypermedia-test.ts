import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { MediatorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, QuerySourceUnidentifiedExpanded } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQuerySourceIdentifyHypermedia } from '../lib/ActorQuerySourceIdentifyHypermedia';
import { mediators as utilMediators } from './MediatorDereferenceRdf-util';
import 'jest-rdf';
import '@comunica/jest';

const BF = new BindingsFactory();
const DF = new DataFactory();
const AF = new Factory();

const mediatorMergeBindingsContext: any = {
  mediate(arg: any) {
    return {};
  },
};

describe('ActorQuerySourceIdentifyHypermedia', () => {
  let bus: any;
  let mediatorDereferenceRdf: MediatorDereferenceRdf;
  let mediatorMetadata: MediatorRdfMetadata;
  let mediatorMetadataExtract: MediatorRdfMetadataExtract;
  let mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  let mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  let mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorDereferenceRdf = utilMediators.mediatorDereferenceRdf;
    mediatorMetadata = utilMediators.mediatorMetadata;
    mediatorMetadataExtract = utilMediators.mediatorMetadataExtract;
    mediatorMetadataAccumulate = utilMediators.mediatorMetadataAccumulate;
    mediatorQuerySourceIdentifyHypermedia = utilMediators.mediatorQuerySourceIdentifyHypermedia;
    mediatorRdfResolveHypermediaLinks = utilMediators.mediatorRdfResolveHypermediaLinks;
    mediatorRdfResolveHypermediaLinksQueue = utilMediators.mediatorRdfResolveHypermediaLinksQueue;
    jest.clearAllMocks();
  });

  describe('The ActorQuerySourceIdentifyHypermedia module', () => {
    it('should be a function', () => {
      expect(ActorQuerySourceIdentifyHypermedia).toBeInstanceOf(Function);
    });

    it('should be a ActorQuerySourceIdentifyHypermedia constructor', () => {
      expect(new (<any> ActorQuerySourceIdentifyHypermedia)({
        bus,
        mediatorDereferenceRdf,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorMetadataAccumulate,
        mediatorQuerySourceIdentifyHypermedia,
        mediatorRdfResolveHypermediaLinks,
      })).toBeInstanceOf(ActorQuerySourceIdentifyHypermedia);
    });

    describe('An ActorQuerySourceIdentifyHypermedia instance', () => {
      let actor: ActorQuerySourceIdentifyHypermedia;
      let context: IActionContext;
      let operation: Algebra.Operation;
      let querySourceUnidentified: QuerySourceUnidentifiedExpanded;

      beforeEach(() => {
        actor = new ActorQuerySourceIdentifyHypermedia({
          bus,
          cacheSize: 10,
          maxIterators: 64,
          aggregateTraversalStore: false,
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorMetadataAccumulate,
          mediatorDereferenceRdf,
          mediatorQuerySourceIdentifyHypermedia,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
          mediatorMergeBindingsContext,
          name: 'actor',
        });
        context = new ActionContext();
        operation = <any> {};
        querySourceUnidentified = { value: 'firstUrl' };
      });

      describe('test', () => {
        it('should test', async() => {
          await expect(actor.test({
            querySourceUnidentified: { value: 'abc' },
            context,
          })).resolves.toBeTruthy();
        });

        it('should not test on a null value', async() => {
          await expect(actor.test({
            querySourceUnidentified: { value: <any> null },
            context,
          })).rejects.toThrow(`actor requires a single query source with a URL value to be present in the context.`);
        });

        it('should not test on an invalid value', async() => {
          await expect(actor.test({
            querySourceUnidentified: { value: <any> { bla: true }},
            context,
          })).rejects.toThrow(`actor requires a single query source with a URL value to be present in the context.`);
        });
      });

      describe('run', () => {
        it('should return a source that can produce a bindings stream and metadata', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(bindings).toEqualBindingsStream([
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
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
              firstMeta: true,
              a: 1,
            });
        });

        it('should return a source that can produce metadata and a bindings stream', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              firstMeta: true,
            });
          await expect(bindings).toEqualBindingsStream([
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

        it('should emit a warning on metadata extract failures when only metadata is read', async() => {
          const mediatorMetadataExtractThis: any = {
            mediate: () => Promise.reject(new Error('mediatorMetadataExtractThis error')),
          };

          actor = new ActorQuerySourceIdentifyHypermedia({
            bus,
            cacheSize: 10,
            maxIterators: 64,
            aggregateTraversalStore: false,
            mediatorMetadata,
            mediatorMetadataExtract: mediatorMetadataExtractThis,
            mediatorMetadataAccumulate,
            mediatorDereferenceRdf,
            mediatorQuerySourceIdentifyHypermedia,
            mediatorRdfResolveHypermediaLinks,
            mediatorRdfResolveHypermediaLinksQueue,
            mediatorMergeBindingsContext,
            name: 'actor',
          });
          const spy = jest.spyOn(<any> actor, 'logWarn');

          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({ state: expect.any(MetadataValidationState), firstMeta: true });

          expect(spy).toHaveBeenCalledWith({
            map: expect.anything(),
          }, 'Metadata extraction for firstUrl failed: mediatorMetadataExtractThis error');
        });

        it('should emit a warning on metadata extract failures when stream is consumed', async() => {
          const mediatorMetadataExtractThis: any = {
            mediate: () => Promise.reject(new Error('mediatorMetadataExtractThis error')),
          };

          actor = new ActorQuerySourceIdentifyHypermedia({
            bus,
            cacheSize: 10,
            maxIterators: 64,
            aggregateTraversalStore: false,
            mediatorMetadata,
            mediatorMetadataExtract: mediatorMetadataExtractThis,
            mediatorMetadataAccumulate,
            mediatorDereferenceRdf,
            mediatorQuerySourceIdentifyHypermedia,
            mediatorRdfResolveHypermediaLinks,
            mediatorRdfResolveHypermediaLinksQueue,
            mediatorMergeBindingsContext,
            name: 'actor',
          });
          const spy = jest.spyOn(<any> actor, 'logWarn');

          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(bindings.toArray()).rejects.toThrow('mediatorMetadataExtractThis error');
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
              firstMeta: true,
            });

          expect(spy).toHaveBeenCalledWith({
            map: expect.anything(),
          }, 'Metadata extraction for firstUrl failed: mediatorMetadataExtractThis error');
          expect(spy).toHaveBeenCalledWith({
            map: expect.anything(),
          }, 'Metadata extraction for next failed: mediatorMetadataExtractThis error');
        });
      });
    });

    describe('An ActorQuerySourceIdentifyHypermedia instance with aggregateTraversalStore on a traverse source', () => {
      let actor: ActorQuerySourceIdentifyHypermedia;
      let context: IActionContext;
      let operation: Algebra.Operation;
      let querySourceUnidentified: QuerySourceUnidentifiedExpanded;

      beforeEach(() => {
        actor = new ActorQuerySourceIdentifyHypermedia({
          bus,
          cacheSize: 10,
          maxIterators: 64,
          aggregateTraversalStore: true,
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorMetadataAccumulate,
          mediatorDereferenceRdf,
          mediatorQuerySourceIdentifyHypermedia,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
          mediatorMergeBindingsContext,
          name: 'actor',
        });
        operation = <any> {};
        querySourceUnidentified = {
          value: 'firstUrl',
          context: new ActionContext().set(KeysQuerySourceIdentify.traverse, true),
        };
      });

      describe('run without hypermediaSourcesAggregatedStores', () => {
        beforeEach(() => {
          context = new ActionContext();
        });

        it('should return a source that can produce a bindings stream and metadata', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(bindings).toEqualBindingsStream([
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
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
              firstMeta: true,
              a: 1,
            });
        });

        it('should return a source that can produce metadata and a bindings stream', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              firstMeta: true,
            });
          await expect(bindings).toEqualBindingsStream([
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
      });

      describe('run with hypermediaSourcesAggregatedStores', () => {
        beforeEach(() => {
          context = new ActionContext({
            [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
          });
        });

        it('should return a source that can produce a bindings stream and metadata', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(bindings).toEqualBindingsStream([
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
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
              firstMeta: true,
              a: 1,
            });
        });

        it('should return a source that can produce metadata and a bindings stream', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(new Promise(resolve => bindings.getProperty('metadata', resolve))).resolves
            .toEqual({
              state: expect.any(MetadataValidationState),
              firstMeta: true,
            });
          await expect(bindings).toEqualBindingsStream([
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

        it(`should return a source that can be queried multiple times without using the aggregate store when queried with a non-pattern`, async() => {
          jest.spyOn(mediatorQuerySourceIdentifyHypermedia, 'mediate');

          const source = (await actor.run({ context, querySourceUnidentified })).querySource.source;

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
          expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(2);

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
          // An additional call is made because the 'next' link is followed, which is not part of the aggregate store.
          expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(3);
        });

        it(`should return a source that can be queried multiple times with the same aggregate store with pattern`, async() => {
          operation = AF.createPattern(
            DF.variable('s'),
            DF.variable('p'),
            DF.variable('o'),
          );

          jest.spyOn(mediatorQuerySourceIdentifyHypermedia, 'mediate');

          const source = (await actor.run({ context, querySourceUnidentified })).querySource.source;

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
          expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(2);

          await expect(source.queryBindings(operation, context)).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s1'),
              p: DF.namedNode('p1'),
              o: DF.namedNode('o1'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s2'),
              p: DF.namedNode('p2'),
              o: DF.namedNode('o2'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s3'),
              p: DF.namedNode('p3'),
              o: DF.namedNode('o3'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s4'),
              p: DF.namedNode('p4'),
              o: DF.namedNode('o4'),
            }),
          ]);

          expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(2);
        });

        it(`should return a source that can be queried multiple times in parallel with the same aggregate store with pattern`, async() => {
          operation = AF.createPattern(
            DF.variable('s'),
            DF.variable('p'),
            DF.variable('o'),
          );

          jest.spyOn(mediatorQuerySourceIdentifyHypermedia, 'mediate');

          const source = (await actor.run({ context, querySourceUnidentified })).querySource.source;
          const it1 = source.queryBindings(operation, context);
          const it2 = source.queryBindings(operation, context);

          await expect(it1).toEqualBindingsStream([
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
          expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(2);

          // TODO: remove the limit once https://github.com/comunica/rdf-streaming-store.js/issues/6 is fixed
          await expect(it2.toArray({ limit: 4 })).resolves.toEqualBindingsArray([
            BF.fromRecord({
              s: DF.namedNode('s1'),
              p: DF.namedNode('p1'),
              o: DF.namedNode('o1'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s2'),
              p: DF.namedNode('p2'),
              o: DF.namedNode('o2'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s3'),
              p: DF.namedNode('p3'),
              o: DF.namedNode('o3'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s4'),
              p: DF.namedNode('p4'),
              o: DF.namedNode('o4'),
            }),
          ]);

          expect(mediatorQuerySourceIdentifyHypermedia.mediate).toHaveBeenCalledTimes(2);
        });
      });
    });
  });
});
