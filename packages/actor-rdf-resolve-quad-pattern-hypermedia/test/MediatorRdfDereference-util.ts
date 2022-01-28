import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type {
  IActionRdfDereference,
  IActorRdfDereferenceOutput,
  MediatorRdfDereference,
} from '@comunica/bus-rdf-dereference';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { Bus } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

export const bus = new Bus({ name: 'bus' });
// @ts-expect-error
const mediatorRdfDereference: MediatorRdfDereference = {
  async mediate({ url }: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    const data: IActorRdfDereferenceOutput = {
      // @ts-expect-error
      data: url === 'firstUrl' ?
        new ArrayIterator<RDF.Quad>([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ], { autoStart: false }) :
        new ArrayIterator<RDF.Quad>([
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
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
// @ts-expect-error
const mediatorMetadata: MediatorRdfMetadata = {
  // TODO: Double check the 'as any' cast here
  mediate: ({ quads }: any) => Promise.resolve({ data: quads, metadata: <any> { a: 1 }}),
};
// @ts-expect-error
const mediatorMetadataExtract: MediatorRdfMetadataExtract = {
  mediate: ({ metadata }: any) => Promise.resolve({ metadata }),
};
// @ts-expect-error
const mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia = {
  mediate: ({ forceSourceType, handledDatasets, metadata, quads }: any) => Promise.resolve({
    dataset: 'MYDATASET',
    source: {
      match: () => quads.clone(),
    },
  }),
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
  mediatorRdfDereference,
  mediatorRdfResolveHypermedia,
  mediatorRdfResolveHypermediaLinks,
  mediatorRdfResolveHypermediaLinksQueue,
};
