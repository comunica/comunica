import {BufferedIterator} from "asynciterator";
import * as HDT from "hdt";
import * as RDF from "rdf-js";
import * as RdfString from "rdf-string";

export class HdtIterator extends BufferedIterator<RDF.Quad> {

  protected readonly hdtDocument: HDT.Document;
  protected readonly subject?: string;
  protected readonly predicate?: string;
  protected readonly object?: string;

  protected position: number;

  constructor(hdtDocument: HDT.Document, subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, options?: any) {
    super(options || { autoStart: false });
    this.hdtDocument = hdtDocument;
    this.subject = RdfString.termToString(subject);
    this.predicate = RdfString.termToString(predicate);
    this.object = RdfString.termToString(object);
    this.position = options && options.offset || 0;

    this.on('newListener', (eventName) => {
      if (eventName === 'totalItems') {
        setImmediate(() => this._fillBuffer());
      }
    });
  }

  public _read(count: number, done: () => void): void {
    if ((<any> this.hdtDocument).closed) {
      this.close();
      return done();
    }
    this.hdtDocument.searchTriples(this.subject, this.predicate, this.object,
      { offset: this.position, limit: count })
      .then((searchResult: HDT.SearchResult) => {
        this.emit('totalItems', searchResult.totalCount);
        searchResult.triples.map((t) => RdfString.stringQuadToQuad(t)).forEach((t) => this._push(t));
        if (searchResult.triples.length < count) {
          this.close();
        }
        done();
      })
      .catch((error) => {
        this.emit('error', error);
        return done();
      });
    this.position += count;
  }

}
