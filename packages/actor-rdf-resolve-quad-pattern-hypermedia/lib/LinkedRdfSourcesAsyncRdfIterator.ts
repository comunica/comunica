import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { ILinkQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import { MetadataValidationState } from '@comunica/metadata';
import type { MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator, BufferedIteratorOptions } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';
import { LRUCache } from 'lru-cache';

export abstract class LinkedRdfSourcesAsyncRdfIterator extends BufferedIterator<RDF.Quad> implements RDF.Stream {
  public sourcesState?: ISourcesState;

  protected readonly subject: RDF.Term;
  protected readonly predicate: RDF.Term;
  protected readonly object: RDF.Term;
  protected readonly graph: RDF.Term;

  private readonly cacheSize: number;
  protected readonly firstUrl: string;
  private readonly maxIterators: number;

  private started = false;
  private readonly currentIterators: AsyncIterator<RDF.Quad>[] = [];
  private iteratorsPendingCreation = 0;
  // eslint-disable-next-line unicorn/no-useless-undefined
  private accumulatedMetadata: Promise<MetadataQuads | undefined> = Promise.resolve(undefined);

  public constructor(cacheSize: number, subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
    firstUrl: string, maxIterators: number, options?: BufferedIteratorOptions) {
    super({ autoStart: true, ...options });
    this.cacheSize = cacheSize;
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.graph = graph;
    this.firstUrl = firstUrl;
    this.maxIterators = maxIterators;

    if (this.maxIterators <= 0) {
      throw new Error(`LinkedRdfSourcesAsyncRdfIterator.maxIterators must be larger than zero, but got ${this.maxIterators}`);
    }
  }

  protected _end(destroy?: boolean): void {
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
   * This method can optionally called after constructing an instance
   * for allowing the sources state to be cached.
   *
   * When calling without args, then the default logic will be followed to determine the sources state.
   * When calling with an arg, then the given sources state will be set instead of following the default logic.
   *
   * After calling this method, the `sourcesState` field can be retrieved and optionally cached.
   *
   * This sources state also contains a hash of all handled datasets that will be copied upon first use.
   *
   * @param {ISourcesState} sourcesState An optional sources state.
   */
  public setSourcesState(sourcesState?: ISourcesState): void {
    if (sourcesState) {
      this.sourcesState = sourcesState;
    } else {
      this.sourcesState = {
        sources: new LRUCache<string, Promise<ISourceState>>({ max: this.cacheSize }),
      };
      // Ignore the response, we just want the promise to be cached
      this.getSourceCached({ url: this.firstUrl }, {})
        .catch(error => this.destroy(error));
    }
  }

  /**
   * Determine the links to be followed from the current source given its metadata.
   * @param metadata The metadata of a source.
   */
  protected abstract getSourceLinks(metadata: Record<string, any>): Promise<ILink[]>;

  /**
   * Resolve a source for the given URL.
   * @param link A source link.
   * @param handledDatasets A hash of dataset identifiers that have already been handled.
   */
  protected abstract getSource(link: ILink, handledDatasets: Record<string, boolean>): Promise<ISourceState>;

  /**
   * Resolve a source for the given URL.
   * This will first try to retrieve the source from cache.
   * @param link A source ILink.
   * @param handledDatasets A hash of dataset identifiers that have already been handled.
   */
  protected getSourceCached(link: ILink, handledDatasets: Record<string, boolean>): Promise<ISourceState> {
    let source = this.sourcesState!.sources.get(link.url);
    if (source) {
      return source;
    }
    source = this.getSource(link, handledDatasets);
    if (link.url === this.firstUrl || this.shouldStoreSourcesStates()) {
      this.sourcesState!.sources.set(link.url, source);
    }
    return source;
  }

  protected shouldStoreSourcesStates(): boolean {
    return true;
  }

  public _read(count: number, done: () => void): void {
    if (!this.started) {
      // The first time this is called, prepare the first source
      this.started = true;

      // Create a sources state if needed (can be defined if set from actor cache)
      if (!this.sourcesState) {
        this.setSourcesState();
      }

      // Await the source to be set, and start the source iterator
      this.getSourceCached({ url: this.firstUrl }, {})
        .then(sourceState => {
          this.startIterator(sourceState, true);
          done();
        })
        .catch(error => this.destroy(error));
    } else {
      // Read from all current iterators
      for (const iterator of this.currentIterators) {
        while (count > 0) {
          const read = iterator.read();
          if (read !== null) {
            count--;
            this._push(read);
          } else {
            break;
          }
        }
        if (count <= 0) {
          break;
        }
      }

      // Schedule new iterators if needed
      if (count >= 0 && this.canStartNewIterator()) {
        this.getSourceCached({ url: this.firstUrl }, {})
          .then(sourceState => {
            this.startIteratorsForNextUrls(sourceState.handledDatasets, false);
            done();
          })
          .catch(error => this.destroy(error));
      } else {
        done();
      }
    }
  }

  protected canStartNewIterator(): boolean {
    return (this.currentIterators.length + this.iteratorsPendingCreation) < this.maxIterators && !this.readable;
  }

  protected areIteratorsRunning(): boolean {
    return (this.currentIterators.length + this.iteratorsPendingCreation) > 0;
  }

  /**
   * Append the fields from appendingMetadata into accumulatedMetadata.
   * @param accumulatedMetadata The fields to append to.
   * @param appendingMetadata The fields to append.
   * @protected
   */
  protected abstract accumulateMetadata(
    accumulatedMetadata: MetadataQuads,
    appendingMetadata: MetadataQuads,
  ): Promise<MetadataQuads>;

  /**
   * Start a new iterator for the given source.
   * Once the iterator is done, it will either determine a new source, or it will close the linked iterator.
   * @param {ISourceState} startSource The start source state.
   * @param {boolean} firstPage If this is the first iterator that is being started.
   */
  protected startIterator(startSource: ISourceState, firstPage: boolean): void {
    // Delegate the quad pattern query to the given source
    const iterator = startSource.source!
      .match(this.subject, this.predicate, this.object, this.graph);
    this.currentIterators.push(iterator);
    let receivedMetadata = false;

    // Attach readers to the newly created iterator
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    (<any> iterator)._destination = this;
    iterator.on('error', (error: Error) => this.destroy(error));
    iterator.on('readable', () => this._fillBuffer());
    iterator.on('end', () => {
      this.currentIterators.splice(this.currentIterators.indexOf(iterator), 1);

      // If the metadata was already received, handle the next URL in the queue
      if (receivedMetadata) {
        this.startIteratorsForNextUrls(startSource.handledDatasets, true);
      }
    });

    // Listen for the metadata of the source
    // The metadata property is guaranteed to be set
    iterator.getProperty('metadata', (metadata: MetadataQuads) => {
      // Accumulate the metadata object
      this.accumulatedMetadata = this.accumulatedMetadata
        .then(previousMetadata => (async() => {
          if (!previousMetadata) {
            previousMetadata = startSource.metadata;
          }
          return this.accumulateMetadata(previousMetadata, metadata);
        })()
          .then(accumulatedMetadata => {
            // Also merge fields that were not explicitly accumulated
            const returnMetadata = { ...startSource.metadata, ...metadata, ...accumulatedMetadata };

            // Create new metadata state
            returnMetadata.state = new MetadataValidationState();

            // Emit metadata, and invalidate any metadata that was set before
            this.updateMetadata(returnMetadata);

            // Determine next urls, which will eventually become a next-next source.
            this.getSourceLinks(returnMetadata)
              .then((nextUrls: ILink[]) => Promise.all(nextUrls))
              .then(async(nextUrls: ILink[]) => {
                // Append all next URLs to our queue
                const linkQueue = await this.getLinkQueue();
                for (const nextUrl of nextUrls) {
                  linkQueue.push(nextUrl, startSource.link);
                }

                receivedMetadata = true;
                this.startIteratorsForNextUrls(startSource.handledDatasets, true);
              }).catch(error => this.destroy(error));

            return returnMetadata;
          })).catch(error => {
          this.destroy(error);
          return <MetadataQuads> {};
        });
    });
  }

  protected updateMetadata(metadataNew: MetadataQuads): void {
    const metadataToInvalidate = this.getProperty<MetadataQuads>('metadata');
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
      .then(linkQueue => {
        // Create as many new iterators as possible
        while (this.canStartNewIterator() && this.isRunning()) {
          const nextLink = linkQueue.pop();
          if (nextLink) {
            this.iteratorsPendingCreation++;
            this.getSourceCached(nextLink, handledDatasets)
              .then(nextSourceState => {
                this.iteratorsPendingCreation--;
                this.startIterator(nextSourceState, false);
              })
              .catch(error => this.destroy(error));
          } else {
            break;
          }
        }

        // Close, only if no other iterators are still running
        if (canClose && this.isCloseable(linkQueue)) {
          this.close();
        }
      })
      .catch(error => this.destroy(error));
  }

  protected isCloseable(linkQueue: ILinkQueue): boolean {
    return linkQueue.isEmpty() && !this.areIteratorsRunning();
  }
}

/**
 * A reusable sources state,
 * containing a cache of all source states.
 */
export interface ISourcesState {
  /**
   * A cache for source URLs to source states.
   */
  sources: LRUCache<string, Promise<ISourceState>>;
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
  source?: IQuadSource;
  /**
   * The source's initial metadata.
   */
  metadata: MetadataQuads;
  /**
   * All dataset identifiers that have been passed for this source.
   */
  handledDatasets: Record<string, boolean>;
}
