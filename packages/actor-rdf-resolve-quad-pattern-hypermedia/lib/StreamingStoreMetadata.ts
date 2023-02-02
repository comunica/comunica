import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import type { MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { StreamingStore } from 'rdf-streaming-store';

/**
 * A StreamingStore that returns an AsyncIterator with a valid MetadataQuads property.
 */
export class StreamingStoreMetadata extends StreamingStore {
  public readonly runningIterators: Set<AsyncIterator<RDF.Quad>> = new Set<AsyncIterator<RDF.Quad>>();

  public match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ): AsyncIterator<RDF.Quad> {
    // Wrap the raw stream in an AsyncIterator
    const iterator = new ClosableTransformIterator<RDF.Quad, RDF.Quad>(
      <any> super.match(subject, predicate, object, graph), {
        autoStart: false,
        onClose: () => {
          // Running iterators are deleted once closed or destroyed
          this.runningIterators.delete(iterator);
        },
      },
    );

    // Expose the metadata property containing the cardinality
    const metadata: MetadataQuads = {
      cardinality: {
        type: 'exact',
        value: this.getStore().countQuads(subject!, predicate!, object!, graph!),
      },
      canContainUndefs: false,
    };
    iterator.setProperty('metadata', metadata);

    // Store all running iterators until they close or are destroyed
    this.runningIterators.add(iterator);

    return iterator;
  }
}
