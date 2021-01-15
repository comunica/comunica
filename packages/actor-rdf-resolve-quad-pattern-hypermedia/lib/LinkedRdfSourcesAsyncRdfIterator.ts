import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { AsyncIterator } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';
import LRUCache = require('lru-cache');
import type * as RDF from 'rdf-js';

/**
 * An abstract quad iterator that can iterate over consecutive RDF sources.
 *
 * This iterator stores a queue of sources that need to be iterated over.
 * For each source, its collected metadata is maintained.
 */
export abstract class LinkedRdfSourcesAsyncRdfIterator extends BufferedIterator<RDF.Quad> implements RDF.Stream {
  public sourcesState?: ISourcesState;

  protected readonly subject: RDF.Term;
  protected readonly predicate: RDF.Term;
  protected readonly object: RDF.Term;
  protected readonly graph: RDF.Term;
  protected nextSource: ISourceState | undefined;
  protected readonly linkQueue: ILink[];

  private readonly cacheSize: number;
  private readonly firstUrl: string;

  private started = false;
  private currentIterator: AsyncIterator<RDF.Quad> | undefined;

  public constructor(cacheSize: number, subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
    firstUrl: string) {
    super({ autoStart: true });
    this.cacheSize = cacheSize;
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.graph = graph;
    this.linkQueue = [];
    this.firstUrl = firstUrl;
  }

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
    this.sourcesState!.sources.set(link.url, source);
    return source;
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
          this.setCurrentIterator(sourceState, true);
          done();
        })
        .catch(error => {
          // We can safely ignore this error, since it handled in setSourcesState
          done();
        });
    } else if (this.currentIterator) {
      // If an iterator has been set, read from it.
      while (count > 0) {
        const read = this.currentIterator.read();
        if (read !== null) {
          count--;
          this._push(read);
        } else {
          break;
        }
      }
      done();
    } else {
      // This can occur during source loading.
      done();
    }
  }

  /**
   * Start a new iterator for the given source.
   * Once the iterator is done, it will either determine a new source, or it will close the linked iterator.
   * @param {ISourceState} startSource The start source state.
   * @param {boolean} emitMetadata If the metadata event should be emitted.
   */
  protected setCurrentIterator(startSource: ISourceState, emitMetadata: boolean): void {
    // Delegate the quad pattern query to the given source
    this.currentIterator = startSource.source!
      .match(this.subject, this.predicate, this.object, this.graph);
    let receivedMetadata = false;

    // Attach readers to the newly created iterator
    (<any> this.currentIterator)._destination = this;
    this.currentIterator.on('error', (error: Error) => this.destroy(error));
    this.currentIterator.on('readable', () => this._fillBuffer());
    this.currentIterator.on('end', () => {
      this.currentIterator = undefined;

      // If the metadata was already received, handle the next URL in the queue
      if (receivedMetadata) {
        this.handleNextUrl(startSource);
      }
    });

    // Listen for the metadata of the source
    // The metadata property is guaranteed to be set
    this.currentIterator.getProperty('metadata', (metadata: Record<string, any>) => {
      startSource.metadata = { ...startSource.metadata, ...metadata };

      // Emit metadata if needed
      if (emitMetadata) {
        this.setProperty('metadata', startSource.metadata);
      }

      // Determine next urls, which will eventually become a next-next source.
      this.getSourceLinks(startSource.metadata)
        .then((nextUrls: ILink[]) => Promise.all(nextUrls))
        .then(async(nextUrls: ILink[]) => {
          // Append all next URLs to our queue
          for (const nextUrl of nextUrls) {
            this.linkQueue.push(nextUrl);
          }

          // Handle the next queued URL if we don't have an active iterator (in which case it will be called later)
          receivedMetadata = true;
          if (!this.currentIterator) {
            this.handleNextUrl(startSource);
          }
        }).catch(error => this.destroy(error));
    });
  }

  /**
   * Check if a next URL is in the queue.
   * If yes, start a new iterator.
   * If no, close this iterator.
   * @param startSource
   */
  protected handleNextUrl(startSource: ISourceState): void {
    if (this.linkQueue.length === 0) {
      this.close();
    } else {
      this.getSourceCached(this.linkQueue[0], startSource.handledDatasets)
        .then(nextSourceState => this.setCurrentIterator(nextSourceState, false))
        .catch(error => this.destroy(error));
      this.linkQueue.shift();
    }
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
   * A source.
   */
  source?: IQuadSource;
  /**
   * The source's initial metadata.
   */
  metadata: Record<string, any>;
  /**
   * All dataset identifiers that have been passed for this source.
   */
  handledDatasets: Record<string, boolean>;
}
