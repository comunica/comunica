// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'node:events';
import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import { MetadataValidationState } from '@comunica/metadata';
import type { MetadataQuads, IAggregatedStore, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { StreamingStore } from 'rdf-streaming-store';

/**
 * A StreamingStore that returns an AsyncIterator with a valid MetadataQuads property.
 */
export class StreamingStoreMetadata extends StreamingStore implements IAggregatedStore {
  public started = false;
  public containedSources = new Set<string>();
  public readonly runningIterators: Set<AsyncIterator<RDF.Quad>> = new Set<AsyncIterator<RDF.Quad>>();
  protected readonly iteratorCreatedListeners: Set<() => void> = new Set();
  protected readonly metadataAccumulator:
  (accumulatedMetadata: MetadataBindings, appendingMetadata: MetadataBindings) => Promise<MetadataBindings>;

  protected baseMetadata: MetadataBindings = {
    state: new MetadataValidationState(),
    cardinality: { type: 'exact', value: 0 },
    canContainUndefs: false,
    variables: [],
  };

  public constructor(
    store: RDF.Store | undefined,
    metadataAccumulator:
    (accumulatedMetadata: MetadataBindings, appendingMetadata: MetadataBindings) => Promise<MetadataBindings>,
  ) {
    super(store);
    this.metadataAccumulator = metadataAccumulator;
  }

  public override import(stream: RDF.Stream): EventEmitter {
    if (!this.ended) {
      super.import(stream);
    }
    return stream;
  }

  public hasRunningIterators(): boolean {
    return this.runningIterators.size > 0;
  }

  public override match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ): AsyncIterator<RDF.Quad> {
    // Wrap the raw stream in an AsyncIterator
    const rawStream = super.match(subject, predicate, object, graph);
    const iterator = new ClosableTransformIterator<RDF.Quad, RDF.Quad>(
      <any> rawStream,
      {
        autoStart: false,
        onClose: () => {
          // Running iterators are deleted once closed or destroyed
          this.runningIterators.delete(iterator);
        },
      },
    );

    // Expose the metadata property containing the cardinality
    let count = this.getStore().countQuads(subject!, predicate!, object!, graph!);
    const metadata: MetadataQuads = {
      state: new MetadataValidationState(),
      cardinality: {
        type: 'estimate',
        value: count,
      },
      canContainUndefs: false,
    };
    iterator.setProperty('metadata', metadata);
    iterator.setProperty('lastCount', count);

    // Every time a new quad is pushed into the iterator, update the metadata
    rawStream.on('quad', () => {
      iterator.setProperty('lastCount', ++count);
      this.updateMetadataState(iterator, count);
    });

    // Store all running iterators until they close or are destroyed
    this.runningIterators.add(iterator);

    // Invoke creation listeners
    for (const listener of this.iteratorCreatedListeners) {
      listener();
    }

    return iterator;
  }

  public setBaseMetadata(metadata: MetadataBindings, updateStates: boolean): void {
    this.baseMetadata = { ...metadata };
    this.baseMetadata.cardinality = { type: 'exact', value: 0 };

    if (updateStates) {
      for (const iterator of this.runningIterators) {
        const count: number = iterator.getProperty('lastCount')!;
        this.updateMetadataState(iterator, count);
      }
    }
  }

  protected updateMetadataState(iterator: AsyncIterator<RDF.Quad>, count: number): void {
    // Append the given cardinality to the base metadata
    const metadataNew: MetadataBindings = {
      state: new MetadataValidationState(),
      cardinality: {
        type: 'estimate',
        value: count,
      },
      canContainUndefs: false,
      variables: [],
    };

    this.metadataAccumulator(this.baseMetadata, metadataNew)
      .then((accumulatedMetadata) => {
        accumulatedMetadata.state = new MetadataValidationState();

        // Set the new metadata, and invalidate the previous state
        const metadataToInvalidate = iterator.getProperty<MetadataQuads>('metadata');
        iterator.setProperty('metadata', accumulatedMetadata);
        metadataToInvalidate?.state.invalidate();
      })
      .catch(() => {
        // Void errors
      });
  }

  public addIteratorCreatedListener(listener: () => void): void {
    this.iteratorCreatedListeners.add(listener);
  }

  public removeIteratorCreatedListener(listener: () => void): void {
    this.iteratorCreatedListeners.delete(listener);
  }
}
