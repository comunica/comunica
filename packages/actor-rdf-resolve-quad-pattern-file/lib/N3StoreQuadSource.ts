import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {N3StoreIterator} from "./N3StoreIterator";

export class N3StoreQuadSource implements ILazyQuadSource {

  protected readonly store: any;

  constructor(store: any) {
    this.store = store;
  }

  public match(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
               graph?: RDF.Term | RegExp): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

  public matchLazy?(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
                    graph?: RDF.Term | RegExp): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("N3StoreQuadSource does not support matching by regular expressions.");
    }
    return new N3StoreIterator(this.store, subject, predicate, object, graph);
  }
}
