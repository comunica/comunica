import type { ILinkQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysStatistics } from '@comunica/context-entries';
import type {
  ILink,
  IQuerySource,
  IActionContext,
  MetadataBindings,
  IQueryBindingsOptions,
  IStatisticBase,
} from '@comunica/types';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator, BufferedIteratorOptions } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

export abstract class LinkedRdfSourcesAsyncRdfIterator extends BufferedIterator<RDF.Bindings> {
  protected readonly operation: Algebra.Operation;
  protected readonly queryBindingsOptions: IQueryBindingsOptions | undefined;
  protected readonly context: IActionContext;

  private readonly cacheSize: number;
  protected readonly firstUrl: string;
  private readonly maxIterators: number;
  private readonly sourceStateGetter: SourceStateGetter;

  protected started = false;
  private readonly currentIterators: AsyncIterator<RDF.Bindings>[] = [];
  private iteratorsPendingCreation = 0;
  private iteratorsPendingTermination = 0;
  // eslint-disable-next-line unicorn/no-useless-undefined
  private accumulatedMetadata: Promise<MetadataBindings | undefined> = Promise.resolve(undefined);
  private preflightMetadata: Promise<MetadataBindings> | undefined;

  public constructor(
    cacheSize: number,
    operation: Algebra.Operation,
    queryBindingsOptions: IQueryBindingsOptions | undefined,
    context: IActionContext,
    firstUrl: string,
    maxIterators: number,
    sourceStateGetter: SourceStateGetter,
    options?: BufferedIteratorOptions,
  ) {
    super({ autoStart: false, ...options });
    this._reading = false;
    this.cacheSize = cacheSize;
    this.operation = operation;
    this.queryBindingsOptions = queryBindingsOptions;
    this.context = context;
    this.firstUrl = firstUrl;
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

  public override getProperty<P>(propertyName: string, callback?: (value: P) => void): P | undefined {
    if (propertyName === 'metadata' && !this.started) {
      // If the iterator has not started yet, forcefully fetch the metadata from the source without starting the
      // iterator. This way, we keep the iterator lazy.
      if (!this.preflightMetadata) {
        this.preflightMetadata = new Promise((resolve, reject) => {
          this.sourceStateGetter({ url: this.firstUrl }, {})
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
        .catch(() => {
          // Ignore errors
        });
    }
    return super.getProperty(propertyName, callback);
  }

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
        this.sourceStateGetter({ url: this.firstUrl }, {})
          .then((sourceState) => {
            this.startIteratorsForNextUrls(sourceState.handledDatasets, false);
            done();
          });
      } else {
        done();
      }
    } else {
      // The first time this is called, prepare the first source
      this.started = true;

      // Await the source to be set, and start the source iterator
      this.sourceStateGetter({ url: this.firstUrl }, {})
        .then((sourceState) => {
          this.startIterator(sourceState);
          done();
        })
        // Destroy should be async because it can be called before it is listened to
        .catch(error => setTimeout(() => this.destroy(error)));
    }
  }

  protected canStartNewIterator(): boolean {
    return (this.currentIterators.length + this.iteratorsPendingCreation + this.iteratorsPendingTermination) <
      this.maxIterators && (!this.canStartNewIteratorConsiderReadable() || !this.readable);
  }

  protected canStartNewIteratorConsiderReadable(): boolean {
    return true;
  }

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

  protected updateMetadata(metadataNew: MetadataBindings): void {
    const metadataToInvalidate = this.getProperty<MetadataBindings>('metadata');
    this.setProperty('metadata', metadataNew);
    metadataToInvalidate?.state.invalidate();
  }

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
}

export type SourceStateGetter = (link: ILink, handledDatasets: Record<string, boolean>) => Promise<ISourceState>;
