import {BufferedIterator, BufferedIteratorOptions} from "asynciterator";
import {blankNode, defaultGraph, literal, namedNode, triple, variable} from "rdf-data-model";
import * as RDF from "rdf-js";
import * as RdfString from "rdf-string";
import {IStringQuad} from "rdf-string/lib/TermUtil";
import {VersionContext} from "./ActorRdfResolveQuadPatternOstrich";

export class OstrichIterator extends BufferedIterator<RDF.Quad> {

  protected readonly ostrichDocument: any;
  protected readonly versionContext: VersionContext;
  protected readonly subject?: string;
  protected readonly predicate?: string;
  protected readonly object?: string;

  protected position: number;

  constructor(ostrichDocument: any, versionContext: VersionContext,
              subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, options?: any) {
    super(options || { autoStart: false });
    this.ostrichDocument = ostrichDocument;
    this.versionContext = versionContext;
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
    if (this.ostrichDocument.closed) {
      this.close();
      return done();
    }
    this.query(count, (error: Error, triples: IStringQuad[], totalItems: number) => {
      if (error) {
        this.emit('error', error);
        return done();
      } else {
        this.emit('totalItems', totalItems);
        triples
          .map((t) => RdfString.stringQuadToQuad(t))
          .forEach((t) => this._push(t));
      }
      if (triples.length < count) {
        this.close();
      }
      done();
    });
    this.position += count;
  }

  protected query(count: number, done: (error: Error, triples: IStringQuad[], totalItems: number) => void) {
    if (this.versionContext.type === 'version-materialization') {
      this.ostrichDocument.searchTriplesVersionMaterialized(this.subject, this.predicate, this.object,
        { offset: this.position, limit: count, version: this.versionContext.version }, done);
    } else if (this.versionContext.type === 'delta-materialization') {
      this.ostrichDocument.searchTriplesDeltaMaterialized(this.subject, this.predicate, this.object,
        { limit: count, offset: this.position,
          versionEnd: this.versionContext.versionEnd, versionStart: this.versionContext.versionStart }, done);
    } else {
      this.ostrichDocument.searchTriplesVersion(this.subject, this.predicate, this.object,
        { offset: this.position, limit: count }, done);
    }
  }

}
