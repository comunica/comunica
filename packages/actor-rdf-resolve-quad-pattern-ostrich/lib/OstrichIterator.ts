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

  protected reading: boolean;

  constructor(ostrichDocument: any, versionContext: VersionContext,
              subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, options?: any) {
    super(options);
    this.ostrichDocument = ostrichDocument;
    this.versionContext = versionContext;
    this.subject = RdfString.termToString(subject);
    this.predicate = RdfString.termToString(predicate);
    this.object = RdfString.termToString(object);

    this.reading = false;
  }

  public _read(count: number, done: () => void): void {
    if (this.ostrichDocument.closed) {
      this.close();
      return done();
    }
    if (this.reading) {
      return done();
    }
    this.reading = true;
    this.query((error: Error, triples: IStringQuad[]) => {
      if (error) {
        this.emit('error', error);
        return done();
      } else {
        triples
          .map((t) => RdfString.stringQuadToQuad(t))
          .forEach((t) => this._push(t));
        this.close();
      }
      done();
    });
  }

  protected query(done: (error: Error, triples: IStringQuad[], totalItems: number) => void) {
    if (this.versionContext.type === 'version-materialization') {
      this.ostrichDocument.searchTriplesVersionMaterialized(this.subject, this.predicate, this.object,
        { version: this.versionContext.version }, done);
    } else if (this.versionContext.type === 'delta-materialization') {
      this.ostrichDocument.searchTriplesDeltaMaterialized(this.subject, this.predicate, this.object,
        { versionEnd: this.versionContext.versionEnd, versionStart: this.versionContext.versionStart }, done);
    } else {
      this.ostrichDocument.searchTriplesVersion(this.subject, this.predicate, this.object, {}, done);
    }
  }

}
