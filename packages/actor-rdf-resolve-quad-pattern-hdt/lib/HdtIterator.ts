import {BufferedIterator, BufferedIteratorOptions} from "asynciterator";
import {blankNode, defaultGraph, literal, namedNode, triple, variable} from "rdf-data-model";
import * as RDF from "rdf-js";
import * as RdfString from "rdf-string";
import {IStringQuad} from "rdf-string/lib/TermUtil";

export class HdtIterator extends BufferedIterator<RDF.Quad> {

  protected readonly hdtDocument: any;
  protected readonly subject?: string;
  protected readonly predicate?: string;
  protected readonly object?: string;

  protected position: number;

  constructor(hdtDocument: any, subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, options?: any) {
    super(options);
    this.hdtDocument = hdtDocument;
    this.subject = RdfString.termToString(subject);
    this.predicate = RdfString.termToString(predicate);
    this.object = RdfString.termToString(object);
    this.position = options && options.offset || 0;
  }

  public _read(count: number, done: () => void): void {
    if (this.hdtDocument.closed) {
      this.close();
      return done();
    }
    this.hdtDocument.searchTriples(this.subject, this.predicate, this.object,
      { offset: this.position, limit: count },
      (error: Error, triples: IStringQuad[], totalItems: number) => {
        if (error) {
          this.emit('error', error);
          return done();
        } else {
          this.emit('totalItems', totalItems);
          triples.map((t) => RdfString.stringQuadToQuad(t)).forEach((t) => this._push(t));
        }
        if (triples.length < count) {
          this.close();
        }
        done();
      });
    this.position += count;
  }

}
