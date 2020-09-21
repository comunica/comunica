import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import { N3StoreIterator } from './N3StoreIterator';

export class N3StoreQuadSource implements IQuadSource {
  protected readonly store: any;

  public constructor(store: any) {
    this.store = store;
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    return new N3StoreIterator(this.store, subject, predicate, object, graph);
  }
}
