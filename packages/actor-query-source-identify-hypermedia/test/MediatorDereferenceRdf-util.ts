import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';

import type {
  IActionQuerySourceDereferenceLink,
  MediatorQuerySourceDereferenceLink,
} from '@comunica/bus-query-source-dereference-link';

import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { ICachePolicy, IQuerySource, MetadataBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ArrayIterator } from 'asynciterator';
import 'jest-rdf';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();

// @ts-expect-error
const mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate = {
  async mediate(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
    if (action.mode === 'initialize') {
      return {
        metadata: {
          cardinality: { type: 'exact', value: 0 },
        },
      };
    }

    const metadata = { ...action.accumulatedMetadata };
    if (metadata.cardinality) {
      metadata.cardinality = { ...metadata.cardinality };
    }
    const subMetadata = action.appendingMetadata;
    if (!subMetadata.cardinality) {
      // We're already at infinite, so ignore any later metadata
      metadata.cardinality = <any>{};
      metadata.cardinality.type = 'estimate';
      metadata.cardinality.value = Number.POSITIVE_INFINITY;
    }
    if (metadata.cardinality?.value !== undefined && subMetadata.cardinality?.value !== undefined) {
      metadata.cardinality.value += subMetadata.cardinality.value;
    }
    if (subMetadata.cardinality?.type === 'estimate') {
      metadata.cardinality.type = 'estimate';
    }

    return { metadata };
  },
};
// @ts-expect-error
const mediatorQuerySourceDereferenceLink: MediatorQuerySourceDereferenceLink = {
  async mediate(action: IActionQuerySourceDereferenceLink) {
    action.handledDatasets!.MYDATASET = true;
    let cachePolicy: ICachePolicy<IActionQuerySourceDereferenceLink> | undefined;
    if (action.link.url.includes('cachepolicytrue')) {
      cachePolicy = <any> {
        async satisfiesWithoutRevalidation() {
          return true;
        },
      };
    }
    if (action.link.url.includes('cachepolicyfalse')) {
      cachePolicy = <any> {
        async satisfiesWithoutRevalidation() {
          return false;
        },
      };
    }
    return {
      dataset: 'MYDATASET',
      metadata: <MetadataBindings> <any> { a: 1 },
      source: <IQuerySource> <any> {
        async getFilterFactor() {
          return 1;
        },
        async getSelectorShape() {
          return {
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
          };
        },
        queryBindings() {
          const it = new ArrayIterator([
            BF.fromRecord({
              s: DF.namedNode(action.link.url),
              p: DF.namedNode('p1'),
              o: DF.namedNode('o1'),
            }),
          ], { autoStart: false });
          it.setProperty('metadata', { firstMeta: true });
          return it;
        },
        queryQuads() {
          return new ArrayIterator([], { autoStart: false });
        },
        queryBoolean() {
          return true;
        },
        queryVoid() {
          // Do nothing
        },
      },
      cachePolicy,
    };
  },
};
// @ts-expect-error
const mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks = {
  mediate: () => Promise.resolve({ links: [{ url: 'next' }]}),
};
// @ts-expect-error
const mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue = {
  mediate: () => Promise.resolve({ linkQueue: new LinkQueueFifo() }),
};
export const mediators = {
  mediatorMetadataAccumulate,
  mediatorQuerySourceDereferenceLink,
  mediatorRdfResolveHypermediaLinks,
  mediatorRdfResolveHypermediaLinksQueue,
};
