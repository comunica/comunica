import { Readable } from 'stream';
import * as RDF from 'rdf-js';

/**
 * A wrapper around an RDF source that emits totalItems metadata *before* the end event.
 */
export class RdfSourceMetadata<Q extends RDF.BaseQuad = RDF.Quad> implements RDF.Source<Q> {
  private readonly source: RDF.Source;

  public constructor(source: RDF.Source) {
    this.source = source;
  }

  public match(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp,
    object?: RDF.Term | RegExp, graph?: RDF.Term | RegExp): RDF.Stream<Q> {
    const streamOut = new Readable({ objectMode: true });
    streamOut._read = () => {
      streamOut._read = () => {
        // Do nothing
      };
      const streamIn = this.source.match(subject, predicate, object, graph);
      let totalItems = 0;
      streamIn.on('error', error => {
        streamOut.emit('error', error);
      });
      streamIn.on('data', quad => {
        totalItems++;
        streamOut.push(quad);
      });
      streamIn.on('end', () => {
        streamOut.emit('metadata', { totalItems });
        streamOut.push(null);
      });
    };
    return streamOut;
  }
}
