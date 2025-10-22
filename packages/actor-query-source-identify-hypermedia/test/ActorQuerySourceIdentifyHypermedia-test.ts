import type { MediatorQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, QuerySourceUnidentifiedExpanded } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { DataFactory } from 'rdf-data-factory';
import { ActorQuerySourceIdentifyHypermedia } from '../lib/ActorQuerySourceIdentifyHypermedia';
import { mediators as utilMediators } from './MediatorDereferenceRdf-util';
import 'jest-rdf';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

describe('ActorQuerySourceIdentifyHypermedia', () => {
  let bus: any;
  let mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let mediatorQuerySourceDereferenceLink: MediatorQuerySourceDereferenceLink;
  let mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  let mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorMetadataAccumulate = utilMediators.mediatorMetadataAccumulate;
    mediatorQuerySourceDereferenceLink = utilMediators.mediatorQuerySourceDereferenceLink;
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
        mediatorMetadataAccumulate,
        mediatorQuerySourceDereferenceLink,
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
          mediatorMetadataAccumulate,
          mediatorQuerySourceDereferenceLink,
          mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue,
          mediatorMergeBindingsContext,
          name: 'actor',
        });
        context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
        operation = <any> {};
        querySourceUnidentified = { value: 'firstUrl' };
      });

      describe('test', () => {
        it('should test', async() => {
          await expect(actor.test({
            querySourceUnidentified: { value: 'abc' },
            context,
          })).resolves.toPassTestVoid();
        });

        it('should not test on a null value', async() => {
          await expect(actor.test({
            querySourceUnidentified: { value: <any> null },
            context,
          })).resolves.toFailTest(`actor requires a single query source with a URL value to be present in the context.`);
        });

        it('should not test on an invalid value', async() => {
          await expect(actor.test({
            querySourceUnidentified: { value: <any> { bla: true }},
            context,
          })).resolves.toFailTest(`actor requires a single query source with a URL value to be present in the context.`);
        });
      });

      describe('run', () => {
        it('should return a source that can produce a bindings stream and metadata', async() => {
          const { querySource } = await actor.run({ context, querySourceUnidentified });
          const bindings = querySource.source.queryBindings(operation, context);
          await expect(bindings).toEqualBindingsStream([
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
              a: 1,
              cardinality: {
                type: 'estimate',
                value: Number.POSITIVE_INFINITY,
              },
              state: expect.any(MetadataValidationState),
              firstMeta: true,
            });
          await expect(bindings).toEqualBindingsStream([
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
      });
    });
  });
});
