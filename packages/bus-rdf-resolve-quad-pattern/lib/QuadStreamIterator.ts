import {BufferedIterator} from "asynciterator";
import * as RDF from "rdf-js";

/**
 * Wraps a regular quad stream in a quad async iterator.
 */
export class QuadStreamIterator extends BufferedIterator<RDF.Quad> implements RDF.Stream {

  public readonly stream: RDF.Stream;

  constructor(stream: RDF.Stream) {
    super();
    this.stream = stream;
  }

  public _begin(done: () => void) {
    this.stream.on('data', (quad) => this._push(quad));
    this.stream.on('error', (e) => this.emit('error', e));
    this.stream.on('end', () => this._push(null));
    done();
  }

}
