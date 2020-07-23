import { BufferedIterator, BufferedIteratorOptions } from 'asynciterator';
import LRUCache = require('lru-cache');
import * as RDF from 'rdf-js';

/**
 * An abstract quad iterator that can iterate over consecutive RDF sources.
 *
 * This iterator stores a queue of sources that need to be iterated over.
 * For each source, its collected metadata is maintained.
 */
export abstract class LinkedRdfSourcesAsyncRdfIterator extends BufferedIterator<RDF.Quad> implements RDF.Stream {
  public sourcesState?: ISourcesState;

  protected readonly subject?: RDF.Term;
  protected readonly predicate?: RDF.Term;
  protected readonly object?: RDF.Term;
  protected readonly graph?: RDF.Term;
  protected nextUrls: string[];
  protected nextSource?: ISourceState;

  private readonly cacheSize: number;
  private readonly firstUrl: string;
  private started: boolean;
  private iterating: boolean;

  public constructor(cacheSize: number, subject: RDF.Term | undefined, predicate: RDF.Term | undefined,
    object: RDF.Term | undefined, graph: RDF.Term | undefined,
    firstUrl: string, options?: BufferedIteratorOptions) {
    super(options);
    this.cacheSize = cacheSize;
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.graph = graph;
    this.nextUrls = [];
    this.firstUrl = firstUrl;
    this.started = false;
    this.iterating = false;
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
      this.getNextSourceCached(this.firstUrl, {})
        .catch(error => this.destroy(error));
    }
  }

  public _read(count: number, done: () => void): void {
    if (!this.started) {
      this.started = true;
      if (!this.sourcesState) {
        this.setSourcesState();
      }
      (<Promise<ISourceState>> (<ISourcesState> this.sourcesState).sources.get(this.firstUrl))
        .then(sourceState => {
          this.startIterator(sourceState, true);
          done();
        })
        .catch(error => this.emit('error', error));
    } else if (!this.iterating && this.nextSource) {
      const nextSource = this.nextSource;
      this.nextSource = undefined;
      this.getNextUrls(nextSource.metadata)
        .then((nextUrls: string[]) => Promise.all(nextUrls))
        .then(async(nextUrls: string[]) => {
          if (nextUrls.length === 0 && this.nextUrls.length === 0) {
            this.close();
          } else {
            for (const nextUrl of nextUrls) {
              this.nextUrls.push(nextUrl);
            }

            const nextSourceState = await this.getNextSourceCached(this.nextUrls[0], nextSource.handledDatasets);
            this.startIterator(nextSourceState, false);
            this.nextUrls.splice(0, 1);
          }

          done();
        }).catch(error => this.emit('error', error));
    } else {
      done();
    }
  }

  protected abstract getNextUrls(metadata: {[id: string]: any}): Promise<string[]>;

  protected abstract async getNextSource(url: string, handledDatasets: {[type: string]: boolean}):
  Promise<ISourceState>;

  protected getNextSourceCached(url: string, handledDatasets: {[type: string]: boolean}): Promise<ISourceState> {
    let source = (<ISourcesState> this.sourcesState).sources.get(url);
    if (source) {
      return source;
    }
    source = this.getNextSource(url, handledDatasets);
    (<ISourcesState> this.sourcesState).sources.set(url, source);
    return source;
  }

  /**
   * Start a new iterator for the given source.
   * Once the iterator is done, it will either determine a new source, or it will close the iterator.
   * @param {ISourceState} startSource The start source state.
   * @param {boolean} emitMetadata If the metadata event should be emitted.
   */
  protected startIterator(startSource: ISourceState, emitMetadata: boolean): void {
    // Asynchronously execute the quad pattern query
    this.iterating = true;
    const it: RDF.Stream = (<RDF.Source> startSource.source)
      .match(this.subject, this.predicate, this.object, this.graph);
    let currentMetadata = startSource.metadata;
    let ended = false;

    // If the response emits metadata, override our metadata
    // For example, this will always be called for QPF sources (if not, then something is going wrong)
    it.on('metadata', metadata => {
      if (ended) {
        (<any> this).destroy(new Error('Received metadata AFTER the source iterator was ended.'));
      }
      currentMetadata = { ...currentMetadata, ...metadata };
    });

    it.on('data', (quad: RDF.Quad) => {
      this._push(quad);
      this.readable = true;
    });
    it.on('error', (error: Error) => this.destroy(error));
    it.prependListener('end', () => {
      ended = true;

      if (emitMetadata) {
        // Emit the metadata after all data has been processed.
        this.emit('metadata', currentMetadata);
      }

      // Store the metadata for next ._read call
      this.nextSource = {
        handledDatasets: { ...startSource.handledDatasets },
        metadata: currentMetadata,
        source: undefined,
      };
      this.iterating = false;
      this.readable = true;
    });
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
  source?: RDF.Source;
  /**
   * The source's initial metadata.
   */
  metadata: {[id: string]: any};
  /**
   * All dataset identifiers that have been passed for this source.
   */
  handledDatasets: {[type: string]: boolean};
}
