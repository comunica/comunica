import {BufferedIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {IStringQuad, stringQuadToQuad, termToString} from "rdf-string";

export class N3StoreIterator extends BufferedIterator<RDF.Quad> {
  protected readonly store: any;
  protected readonly subject?: string;
  protected readonly predicate?: string;
  protected readonly object?: string;
  protected readonly graph?: string;

  constructor(store: any, subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term) {
    super();
    this.store = store;
    this.subject = N3StoreIterator.termToString(subject);
    this.predicate = N3StoreIterator.termToString(predicate);
    this.object = N3StoreIterator.termToString(object);
    this.graph = N3StoreIterator.termToString(graph);
  }

  public static termToString(term: RDF.Term): string {
    return !term || term.termType === 'Variable' || term.termType === 'BlankNode' ? null : termToString(term);
  }

  public _read(count: number, done: () => void): void {
    this.store.forEachByIRI((quad: IStringQuad) => {
      this._push(stringQuadToQuad(quad));
    }, this.subject, this.predicate, this.object, this.graph);
    done();
    this.close();
  }

}
