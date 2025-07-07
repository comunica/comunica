import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';

export class RdfJsDatasetWrapper implements RDF.Source {
  private readonly dataset: RDF.DatasetCore;

  public constructor(dataset: RDF.DatasetCore) {
    this.dataset = dataset;
  }

  public match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ): RDF.Stream<RDF.Quad> {
    const datasetMatch: RDF.DatasetCore = this.dataset.match(subject, predicate, object, graph);

    const quads = [ ...datasetMatch ];

    return <RDF.Stream<RDF.Quad>>(new ArrayIterator(quads, { autoStart: false }));
  }
}
