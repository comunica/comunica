// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'node:events';
import type {
  MetadataQuads,
  IAggregatedStore,
  MetadataBindings,
  IQuerySource,
  ComunicaDataFactory,
  IActionContext,
} from '@comunica/types';
import { ClosableTransformIterator } from '@comunica/utils-iterator';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { StreamingStore } from 'rdf-streaming-store';
import { Factory } from 'sparqlalgebrajs';

/**
 * An aggregated store that returns AsyncIterators with a valid MetadataQuads property.
 */
export class AggregatedStoreMemory extends StreamingStore implements IAggregatedStore {
  public started = false;
  public containedSources = new Set<string>();
  public readonly runningIterators: Set<AsyncIterator<RDF.Quad>> = new Set<AsyncIterator<RDF.Quad>>();
  protected readonly iteratorCreatedListeners: Set<() => void> = new Set();
  protected readonly allIteratorsClosedListeners: Set<() => void> = new Set();
  protected readonly metadataAccumulator:
  (accumulatedMetadata: MetadataBindings, appendingMetadata: MetadataBindings) => Promise<MetadataBindings>;

  protected readonly dataFactory: ComunicaDataFactory;

  /**
   * Whether the AggregatedStoreMemory should emit updated partial cardinalities
   * for each matching quad. Enabling this option may impact performance due to
   * frequent {@link MetadataValidationState} invalidations and updates
   */
  private readonly emitPartialCardinalities: boolean;

  protected baseMetadata: MetadataBindings = {
    state: new MetadataValidationState(),
    cardinality: { type: 'exact', value: 0 },
    variables: [],
  };

  public constructor(
    store: RDF.Store | undefined,
    metadataAccumulator:
    (accumulatedMetadata: MetadataBindings, appendingMetadata: MetadataBindings) => Promise<MetadataBindings>,
    emitPartialCardinalities: boolean,
    dataFactory: ComunicaDataFactory,
  ) {
    super(store);
    this.metadataAccumulator = metadataAccumulator;
    this.emitPartialCardinalities = emitPartialCardinalities;
    this.dataFactory = dataFactory;
  }

  public async importSource(url: string, source: IQuerySource, context: IActionContext): Promise<void> {
    if (!this.ended) {
      const AF = new Factory();
      this.containedSources.add(url);
      const eventEmitter = this.import(source.queryQuads(AF.createPattern(
        this.dataFactory.variable('s'),
        this.dataFactory.variable('p'),
        this.dataFactory.variable('o'),
        this.dataFactory.variable('g'),
      ), context));
      await new Promise((resolve, reject) => {
        eventEmitter.on('end', resolve);
        eventEmitter.on('error', reject);
      });
    }
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

          // Invoke listeners when all iterators have been closed
          if (!this.hasRunningIterators()) {
            for (const listener of this.allIteratorsClosedListeners) {
              listener();
            }
          }
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
    };
    iterator.setProperty('metadata', metadata);
    iterator.setProperty('lastCount', count);

    if (this.emitPartialCardinalities) {
      // Every time a new quad is pushed into the iterator, update the metadata
      rawStream.on('quad', () => {
        iterator.setProperty('lastCount', ++count);
        this.updateMetadataState(iterator, count);
      });
    }

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

  public addAllIteratorsClosedListener(listener: () => void): void {
    this.allIteratorsClosedListeners.add(listener);
  }

  public removeAllIteratorsClosedListener(listener: () => void): void {
    this.allIteratorsClosedListeners.delete(listener);
  }
}
