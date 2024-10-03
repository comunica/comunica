import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type {
  IActionDereferenceRdf,
  IActorDereferenceRdfOutput,
  MediatorDereferenceRdf,
} from '@comunica/bus-dereference-rdf';
import type {
  IActionQuerySourceIdentifyHypermedia,
  MediatorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { IQuerySource } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { wrap } from 'asynciterator';
import 'jest-rdf';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';

const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new Factory();

// @ts-expect-error
const mediatorDereferenceRdf: MediatorDereferenceRdf = {
  async mediate({ url }: IActionDereferenceRdf): Promise<IActorDereferenceRdfOutput> {
    return {
      data: url === 'firstUrl' ?
        streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]) :
        streamifyArray([
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]),
      metadata: { triples: true },
      exists: true,
      requestTime: 0,
      url,
    };
  },
};
// @ts-expect-error
const mediatorMetadata: MediatorRdfMetadata = {
  mediate: ({ quads }: any) => Promise.resolve({ data: quads, metadata: <any> { a: 1 }}),
};
// @ts-expect-error
const mediatorMetadataExtract: MediatorRdfMetadataExtract = {
  mediate: ({ metadata }: any) => Promise.resolve({ metadata }),
};
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
const mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia = {
  async mediate({ quads }: IActionQuerySourceIdentifyHypermedia) {
    const quadsIterator = wrap(quads);
    return {
      dataset: 'MYDATASET',
      source: <IQuerySource> <any> {
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
          quads.on('error', () => {
            setImmediate(() => {
              it.close();
            });
          });
          const it = quadsIterator.clone().transform({
            map: q => BF.fromRecord({
              s: q.subject,
              p: q.predicate,
              o: q.object,
              g: q.graph,
            }),
            autoStart: false,
          });
          it.setProperty('metadata', { firstMeta: true });
          return it;
        },
        queryQuads() {
          return quadsIterator.clone();
        },
        queryBoolean() {
          return true;
        },
        queryVoid() {
          // Do nothing
        },
      },
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
  mediatorMetadata,
  mediatorMetadataExtract,
  mediatorMetadataAccumulate,
  mediatorDereferenceRdf,
  mediatorQuerySourceIdentifyHypermedia,
  mediatorRdfResolveHypermediaLinks,
  mediatorRdfResolveHypermediaLinksQueue,
};
