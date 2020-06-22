import {BufferedIterator} from "asynciterator";
import {Store} from "n3";
import * as RDF from "rdf-js";

export class N3StoreIterator extends BufferedIterator<RDF.Quad> {
  protected readonly store: Store;
  protected readonly subject: RDF.Term | null;
  protected readonly predicate: RDF.Term | null;
  protected readonly object: RDF.Term | null;
  protected readonly graph: RDF.Term | null;

  constructor(store: any, subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term) {
    super({ autoStart: false });
    this.store = store;
    this.subject = N3StoreIterator.nullifyVariables(subject);
    this.predicate = N3StoreIterator.nullifyVariables(predicate);
    this.object = N3StoreIterator.nullifyVariables(object);
    this.graph = N3StoreIterator.nullifyVariables(graph);
  }

  public static nullifyVariables(term?: RDF.Term): RDF.Term | null {
    return !term || term.termType === 'Variable' ? null : term;
  }

  public _read(count: number, done: () => void): void {
    this.store.forEach((quad: RDF.Quad) => this._push(quad),
      this.subject, this.predicate, this.object, this.graph);
    done();
    this.close();
  }

}
