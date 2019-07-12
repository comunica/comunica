import {BufferedIterator, BufferedIteratorOptions} from "asynciterator";
import * as RDF from "rdf-js";

/**
 * An abstract quad iterator that can iterate over consecutive RDF sources.
 *
 * This iterator stores a queue of sources that need to be iterated over.
 * For each source, its collected metadata is maintained.
 */
export abstract class LinkedRdfSourcesAsyncRdfIterator extends BufferedIterator<RDF.Quad> implements RDF.Stream {

  public firstSource: Promise<{ source: RDF.Source, metadata: {[id: string]: any} }>;

  protected readonly subject: RDF.Term;
  protected readonly predicate: RDF.Term;
  protected readonly object: RDF.Term;
  protected readonly graph: RDF.Term;
  protected sources: RDF.Source[];
  protected metadatas: {[id: string]: any}[];
  protected nextMetadata: {[id: string]: any};

  private readonly firstUrl: string;
  private started: boolean;
  private iterating: boolean;

  constructor(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
              firstUrl: string, options?: BufferedIteratorOptions) {
    super(options);
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.graph = graph;
    this.sources = [];
    this.metadatas = [];
    this.firstUrl = firstUrl;
    this.started = false;
    this.iterating = false;
  }

  /**
   * This method can optionally called after constructing an instance
   * for allowing the first source to be cached.
   *
   * When calling without args, then the default logic will be followed to determine the first source.
   * When calling with an arg, then the given first source will be set instead of following the default logic.
   *
   * After calling this method, the `firstSource` field can be retrieved and optionally cached.
   *
   * @param {Promise<{source: Source; metadata: {[p: string]: any}}>} firstSource An optional promise resolving
   *                                                                              to the first source.
   */
  public loadFirstSource(firstSource?: Promise<{ source: RDF.Source, metadata: {[id: string]: any} }>) {
    this.firstSource = firstSource || this.getNextSource(this.firstUrl);
  }

  public _read(count: number, done: () => void) {
    if (!this.started) {
      this.started = true;
      if (!this.firstSource) {
        this.loadFirstSource();
      }
      this.firstSource
        .then(({ source, metadata }) => {
          this.startIterator(source, metadata, true);
          done();
        })
        .catch((e) => this.emit('error', e));
    } else if (!this.iterating && this.nextMetadata) {
      const nextMetadata = this.nextMetadata;
      this.nextMetadata = null;
      this.getNextUrls(nextMetadata)
        .then((nextUrls: string[]) => Promise.all(nextUrls.map((nextUrl) => this.getNextSource(nextUrl))))
        .then((newSources) => {
          if (newSources.length === 0 && this.sources.length === 0) {
            this.close();
          } else {
            for (const { source, metadata } of newSources) {
              this.sources.push(source);
              this.metadatas.push(metadata);
            }

            this.startIterator(this.sources[0], this.metadatas[0], false);
            this.sources.splice(0, 1);
            this.metadatas.splice(0, 1);
          }

          done();
        }).catch((e) => this.emit('error', e));
    } else {
      done();
    }
  }

  protected abstract getNextUrls(metadata: {[id: string]: any}): Promise<string[]>;

  protected abstract async getNextSource(url: string): Promise<{ source: RDF.Source, metadata: {[id: string]: any} }>;

  /**
   * Start a new iterator for the given source.
   * Once the iterator is done, it will either determine a new source, or it will close the iterator.
   * @param {Source} startSource An RDF source.
   * @param {{[id: string]: any} startMetadata The metadata of the source.
   * @param {boolean} emitMetadata If the metadata event should be emitted.
   */
  protected startIterator(startSource: RDF.Source, startMetadata: {[id: string]: any}, emitMetadata: boolean) {
    // Asynchronously execute the quad pattern query
    this.iterating = true;
    const it: RDF.Stream = startSource.match(this.subject, this.predicate, this.object, this.graph);

    // If the response emits metadata, override our metadata
    it.on('metadata', (metadata) => {
      startMetadata = metadata;
    });

    it.on('data', (quad: RDF.Quad) => {
      this._push(quad);
      this.readable = true;
    });
    it.on('error', (e: Error) => this.emit('error', e));
    it.on('end', () => {

      if (emitMetadata) {
        // Emit the metadata after all data has been processed.
        this.emit('metadata', startMetadata);
      }

      // Store the metadata for next ._read call
      this.nextMetadata = startMetadata;
      this.iterating = false;
      this.readable = true;
    });
  }
}
