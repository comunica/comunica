import type { IActionQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import { KeysStatistics } from '@comunica/context-entries';
import type {
  ILink,
  IQuerySource,
  IActionContext,
  MetadataBindings,
  IQueryBindingsOptions,
  IStatisticBase,
  ILinkQueue,
  ICachePolicy,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator, BufferedIteratorOptions } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';

/**
 * An abstract buffered iterator that lazily traverses linked RDF sources by following links discovered in metadata.
 * Subclasses provide concrete strategies for link queue management, link discovery, and metadata accumulation.
 */
export abstract class LinkedRdfSourcesAsyncRdfIterator extends BufferedIterator<RDF.Bindings> {
  /** The algebra operation to evaluate against each source. */
  protected readonly operation: Algebra.Operation;
  /** Optional bindings query options forwarded to each sub-source. */
  protected readonly queryBindingsOptions: IQueryBindingsOptions | undefined;
  /** The action context propagated to each source. */
  protected readonly context: IActionContext;

  /** The initial link used to seed source traversal. */
  protected readonly firstLink: ILink;
  /** Maximum number of sub-iterators that may run concurrently. */
  private readonly maxIterators: number;
  /** Function that resolves a link and dataset info into a source state. */
  private readonly sourceStateGetter: SourceStateGetter;

  /** Whether the first read has been initiated. */
  protected started = false;
  /** The currently active sub-iterators producing bindings. */
  private readonly currentIterators: AsyncIterator<RDF.Bindings>[] = [];
  /** Number of sub-iterators currently being created. */
  private iteratorsPendingCreation = 0;
  /** Number of sub-iterators that have ended but are still flushing next-links. */
  private iteratorsPendingTermination = 0;
  /** Promise resolving to the accumulated metadata across all visited sources. */
  // eslint-disable-next-line unicorn/no-useless-undefined
  private accumulatedMetadata: Promise<MetadataBindings | undefined> = Promise.resolve(undefined);
  /** Lazily fetched metadata obtained before the iterator has started reading. */
  private preflightMetadata: Promise<MetadataBindings> | undefined;

  /**
   * Creates a new linked RDF sources async iterator.
   * @param operation The algebra operation to evaluate.
   * @param queryBindingsOptions Optional bindings query options.
   * @param context The action context.
   * @param firstLink The initial link to start traversal from.
   * @param maxIterators Maximum number of concurrent sub-iterators.
   * @param sourceStateGetter Function to resolve a link into a source state.
   * @param options Optional buffered iterator options.
   */
  public constructor(
    operation: Algebra.Operation,
    queryBindingsOptions: IQueryBindingsOptions | undefined,
    context: IActionContext,
    firstLink: ILink,
    maxIterators: number,
    sourceStateGetter: SourceStateGetter,
    options?: BufferedIteratorOptions,
  ) {
    super({ autoStart: false, ...options });
    this._reading = false;
    this.operation = operation;
    this.queryBindingsOptions = queryBindingsOptions;
    this.context = context;
    this.firstLink = firstLink;
    this.maxIterators = maxIterators;
    this.sourceStateGetter = sourceStateGetter;

    if (this.maxIterators <= 0) {
      throw new Error(`LinkedRdfSourcesAsyncRdfIterator.maxIterators must be larger than zero, but got ${this.maxIterators}`);
    }
  }

  /**
   * Start filling the buffer of this iterator.
   */
  public kickstart(): void {
    if (!this.started) {
      this._fillBufferAsync();
    }
  }

  /**
   * Overrides property retrieval to lazily fetch metadata before iteration starts.
   * When `metadata` is requested and the iterator has not yet started, a preflight
   * metadata fetch is initiated without consuming any bindings.
   * @template P The type of the property value.
   * @param propertyName The name of the property to retrieve.
   * @param callback Optional callback invoked with the property value.
   * @return The property value, or undefined if not yet available.
   */
  public override getProperty<P>(propertyName: string, callback?: (value: P) => void): P | undefined {
    if (propertyName === 'metadata' && !this.started) {
      // If the iterator has not started yet, forcefully fetch the metadata from the source without starting the
      // iterator. This way, we keep the iterator lazy.
      if (!this.preflightMetadata) {
        this.preflightMetadata = new Promise((resolve, reject) => {
          this.sourceStateGetter(this.firstLink, {})
            .then((sourceState) => {
              // Don't pass query options, as we don't want to consume any passed iterators
              const bindingsStream = sourceState.source.queryBindings(this.operation, this.context);
              bindingsStream.getProperty('metadata', (metadata: MetadataBindings) => {
                metadata.state = new MetadataValidationState();
                bindingsStream.destroy();
                this.accumulateMetadata(sourceState.metadata, metadata)
                  .then((accumulatedMetadata) => {
                    // Also merge fields that were not explicitly accumulated
                    const returnMetadata = { ...sourceState.metadata, ...metadata, ...accumulatedMetadata };
                    resolve(returnMetadata);
                  })
                  .catch(() => {
                    resolve({
                      ...sourceState.metadata,
                      state: new MetadataValidationState(),
                    });
                  });
              });
            })
            .catch(reject);
        });
      }
      this.preflightMetadata
        .then(metadata => this.setProperty('metadata', metadata))
        .catch(e => this.emit('error', e));
    }
    return super.getProperty(propertyName, callback);
  }

  /**
   * Closes all running sub-iterators and ends this iterator.
   * @param destroy Whether to forcefully destroy the iterator.
   */
  protected override _end(destroy?: boolean): void {
    // Close all running iterators
    for (const it of this.currentIterators) {
      it.destroy();
    }

    super._end(destroy);
  }

  /**
   * Get the internal link queue.
   * The returned instance must always be the same.
   */
  public abstract getLinkQueue(): Promise<ILinkQueue>;

  /**
   * Determine the links to be followed from the current source given its metadata.
   * @param metadata The metadata of a source.
   */
  protected abstract getSourceLinks(metadata: Record<string, any>, startSource: ISourceState): Promise<ILink[]>;

  /**
   * Reads bindings from active sub-iterators and schedules new ones when capacity allows.
   * On the first call, initializes traversal by resolving the first source.
   * @param count The maximum number of items to read.
   * @param done Callback to signal reading is complete.
   */
  public override _read(count: number, done: () => void): void {
    if (this.started) {
      // Read from all current iterators
      for (const iterator of this.currentIterators) {
        while (count > 0) {
          const read = iterator.read();
          if (read === null) {
            break;
          } else {
            count--;
            this._push(read);
          }
        }
        if (count <= 0) {
          break;
        }
      }

      // Schedule new iterators if needed
      if (count >= 0 && this.canStartNewIterator()) {
        // We can safely ignore skip catching the error, since we are guaranteed to have
        // successfully got the source for this.firstUrl before.
        // eslint-disable-next-line ts/no-floating-promises
        this.sourceStateGetter(this.firstLink, {})
          .then((sourceState) => {
            this.startIteratorsForNextUrls(sourceState.handledDatasets, false);
          });
      }
      done();
    } else {
      // The first time this is called, prepare the first source
      this.started = true;

      // Await the source to be set, and start the source iterator
      this.sourceStateGetter(this.firstLink, {})
        .then((sourceState) => {
          this.startIterator(sourceState);
          done();
        })
        // Destroy should be async because it can be called before it is listened to
        .catch(error => setTimeout(() => this.destroy(error)));
    }
  }

  /**
   * Checks whether a new sub-iterator can be started within the maximum iterators limit.
   * @return True if the number of active and pending iterators is below the maximum.
   */
  protected canStartNewIterator(): boolean {
    return (this.currentIterators.length + this.iteratorsPendingCreation + this.iteratorsPendingTermination) <
      this.maxIterators && (!this.canStartNewIteratorConsiderReadable() || !this.readable);
  }

  /**
   * Hook for subclasses to control whether the readable state should prevent starting new iterators.
   * @return True if the readable state should be considered when deciding to start new iterators.
   */
  protected canStartNewIteratorConsiderReadable(): boolean {
    return true;
  }

  /**
   * Checks whether any sub-iterators are currently active, pending creation, or pending termination.
   * @return True if at least one sub-iterator is running or pending.
   */
  protected areIteratorsRunning(): boolean {
    return (this.currentIterators.length + this.iteratorsPendingCreation + this.iteratorsPendingTermination) > 0;
  }

  /**
   * Append the fields from appendingMetadata into accumulatedMetadata.
   * @param accumulatedMetadata The fields to append to.
   * @param appendingMetadata The fields to append.
   * @protected
   */
  protected abstract accumulateMetadata(
    accumulatedMetadata: MetadataBindings,
    appendingMetadata: MetadataBindings,
  ): Promise<MetadataBindings>;

  /**
   * Start a new iterator for the given source.
   * Once the iterator is done, it will either determine a new source, or it will close the linked iterator.
   * @param {ISourceState} startSource The start source state.
   */
  protected startIterator(startSource: ISourceState): void {
    // Delegate the quad pattern query to the given source
    try {
      const iterator = startSource.source.queryBindings(this.operation, this.context, this.queryBindingsOptions);
      this.currentIterators.push(iterator);
      let receivedEndEvent = false;
      let receivedMetadata = false;

      // Attach readers to the newly created iterator
      (<any>iterator)._destination = this;
      iterator.on('error', (error: Error) => this.destroy(error));
      iterator.on('readable', () => this._fillBuffer());
      iterator.on('end', () => {
        this.currentIterators.splice(this.currentIterators.indexOf(iterator), 1);

        // Indicate that this iterator still needs to flush its next-links.
        // Without this, the linked iterator could sometimes be closed before next-links are obtained.
        receivedEndEvent = true;
        if (!receivedMetadata) {
          this.iteratorsPendingTermination++;
        }

        // If the metadata was already received, handle the next URL in the queue
        if (receivedMetadata) {
          this.startIteratorsForNextUrls(startSource.handledDatasets, true);
        }
      });

      // Listen for the metadata of the source
      // The metadata property is guaranteed to be set
      iterator.getProperty('metadata', (metadata: MetadataBindings) => {
        // Accumulate the metadata object
        this.accumulatedMetadata = this.accumulatedMetadata
          .then(previousMetadata => (async() => {
            if (!previousMetadata) {
              previousMetadata = startSource.metadata;
            }
            return this.accumulateMetadata(previousMetadata, metadata);
          })()
            .then((accumulatedMetadata) => {
              // Also merge fields that were not explicitly accumulated
              const returnMetadata = { ...startSource.metadata, ...metadata, ...accumulatedMetadata };

              // Create new metadata state
              returnMetadata.state = new MetadataValidationState();

              // Emit metadata, and invalidate any metadata that was set before
              this.updateMetadata(returnMetadata);

              // Invalidate any preflight metadata
              if (this.preflightMetadata) {
                this.preflightMetadata
                  .then(metadataIn => metadataIn.state.invalidate())
                  .catch(() => {
                    // Ignore errors
                  });
              }

              // Determine next urls, which will eventually become a next-next source.
              this.getSourceLinks(returnMetadata, startSource)
                .then((nextUrls: ILink[]) => Promise.all(nextUrls))
                .then(async(nextUrls: ILink[]) => {
                  // Append all next URLs to our queue
                  const linkQueue = await this.getLinkQueue();
                  for (const nextUrl of nextUrls) {
                    linkQueue.push(nextUrl, startSource.link);
                  }

                  receivedMetadata = true;
                  if (receivedEndEvent) {
                    this.iteratorsPendingTermination--;
                  }

                  this.startIteratorsForNextUrls(startSource.handledDatasets, true);
                }).catch(error => this.destroy(error));

              return returnMetadata;
            })).catch((error) => {
            this.destroy(error);
            return <MetadataBindings>{};
          });
      });
    } catch (syncError: unknown) {
      this.destroy(<Error> syncError);
    }
  }

  /**
   * Sets new accumulated metadata on this iterator and invalidates the previous metadata state.
   * @param metadataNew The new metadata to set.
   */
  protected updateMetadata(metadataNew: MetadataBindings): void {
    const metadataToInvalidate = this.getProperty<MetadataBindings>('metadata');
    this.setProperty('metadata', metadataNew);
    metadataToInvalidate?.state.invalidate();
  }

  /**
   * Checks whether this iterator is still running (not done).
   * @return True if the iterator has not yet ended.
   */
  protected isRunning(): boolean {
    return !this.done;
  }

  /**
   * Check if a next URL is in the queue.
   * If yes, start a new iterator.
   * If no, close this iterator.
   * @param handledDatasets
   * @param canClose
   */
  protected startIteratorsForNextUrls(handledDatasets: Record<string, boolean>, canClose: boolean): void {
    this.getLinkQueue()
      .then((linkQueue) => {
        // Create as many new iterators as possible
        while (this.canStartNewIterator() && this.isRunning()) {
          const nextLink = linkQueue.pop();
          if (nextLink) {
            this.iteratorsPendingCreation++;
            this.sourceStateGetter(nextLink, handledDatasets)
              .then((nextSourceState) => {
                // If we find a statistic tracking dereference events we emit the relevant data
                const statisticDereferenceLinks: IStatisticBase<ILink> | undefined = this.context.get(
                  KeysStatistics.dereferencedLinks,
                );
                if (statisticDereferenceLinks) {
                  statisticDereferenceLinks.updateStatistic(
                    {
                      url: nextSourceState.link.url,
                      metadata: { ...nextSourceState.metadata, ...nextSourceState.link.metadata },
                    },
                    nextSourceState.source,
                  );
                }

                this.iteratorsPendingCreation--;
                this.startIterator(nextSourceState);
              })
              .catch(error => this.emit('error', error));
          } else {
            break;
          }
        }

        // Close, only if no other iterators are still running
        if (canClose && this.isCloseable(linkQueue, true)) {
          this.close();
        }
      })
      .catch(error => this.destroy(error));
  }

  /**
   * Checks whether this iterator can be closed based on the link queue state and running iterators.
   * @param linkQueue The link queue to check.
   * @param _requireQueueEmpty Whether the queue must be empty to allow closing.
   * @return True if the link queue is empty and no iterators are running.
   */
  protected isCloseable(linkQueue: ILinkQueue, _requireQueueEmpty: boolean): boolean {
    return linkQueue.isEmpty() && !this.areIteratorsRunning();
  }
}

/**
 * The current state of a source.
 * This is needed for following links within a source.
 */
export interface ISourceState {
  /**
   * The link to this source.
   */
  link: ILink;
  /**
   * A source.
   */
  source: IQuerySource;
  /**
   * The source's initial metadata.
   */
  metadata: MetadataBindings;
  /**
   * All dataset identifiers that have been passed for this source.
   */
  handledDatasets: Record<string, boolean>;
  /**
   * The cache policy of the request's response.
   */
  cachePolicy?: ICachePolicy<IActionQuerySourceDereferenceLink>;
}

/**
 * Function type that resolves a link and handled dataset identifiers into a source state.
 */
export type SourceStateGetter = (link: ILink, handledDatasets: Record<string, boolean>) => Promise<ISourceState>;
