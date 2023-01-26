import type { MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap } from 'asynciterator';
import { StreamingStore } from 'rdf-streaming-store';

/**
 * A StreamingStore that returns an AsyncIterator with a valid MetadataQuads property.
 */
export class StreamingStoreMetadata extends StreamingStore {
  public match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ): AsyncIterator<RDF.Quad> {
    // Wrap the raw stream in an AsyncIterator
    const iterator = wrap(super.match(subject, predicate, object, graph), { autoStart: false });

    // Expose the metadata property containing the cardinality
    const metadata: MetadataQuads = {
      cardinality: {
        type: 'exact',
        value: this.getStore().countQuads(subject!, predicate!, object!, graph!),
      },
      canContainUndefs: false,
    };
    iterator.setProperty('metadata', metadata);

    return iterator;
  }
}
