import type * as RDF from 'rdf-js';
import type { IVoidCardinalityProvider, IVoidDescription, IVoidGraph } from './ActorRdfMetadataExtractVoid';

export class VoidCardinalityProvider implements IVoidCardinalityProvider {
  public constructor(public data: IVoidDescription) {}

  public getCardinality(
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
  ): RDF.QueryResultCardinality {
    const value = this.getCardinalityRaw(subject, predicate, object, graph);
    return { type: 'estimate', value };
  }

  // Based on:
  // Hagedorn, Stefan, et al. "Resource Planning for SPARQL Query Execution on Data Sharing Platforms." COLD 1264 (2014)
  public getCardinalityRaw(
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
  ): number {
    // ?s rdf:type <o>
    if (predicate.termType !== 'Variable' && predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      subject.termType === 'Variable' && object.termType !== 'Variable') {
      return this.getClassPartitionEntities(object, graph);
    }

    // ?s ?p ?o
    if (subject.termType === 'Variable' && predicate.termType === 'Variable' && object.termType === 'Variable') {
      return this.getTriples(graph);
    }

    // <s> ?p ?o
    if (subject.termType !== 'Variable' && predicate.termType === 'Variable' && object.termType === 'Variable') {
      return this.getTriples(graph) / this.getDistinctSubjects(graph);
    }

    // ?s <p> ?o
    if (subject.termType === 'Variable' && predicate.termType !== 'Variable' && object.termType === 'Variable') {
      return this.getPredicateTriples(predicate, graph);
    }

    // ?s ?p <o>
    if (subject.termType === 'Variable' && predicate.termType === 'Variable' && object.termType !== 'Variable') {
      return this.getTriples(graph) / this.getDistinctObjects(graph);
    }

    // <s> <p> ?o
    if (subject.termType !== 'Variable' && predicate.termType !== 'Variable' && object.termType === 'Variable') {
      return this.getPredicateTriples(predicate, graph) / this.getPredicateSubjects(predicate, graph);
    }

    // <s> ?p <o>
    if (subject.termType !== 'Variable' && predicate.termType === 'Variable' && object.termType !== 'Variable') {
      return this.getTriples(graph) / (this.getDistinctSubjects(graph) * this.getDistinctObjects(graph));
    }

    // ?s <p> <o>
    if (subject.termType === 'Variable' && predicate.termType !== 'Variable' && object.termType !== 'Variable') {
      return this.getPredicateTriples(predicate, graph) / this.getPredicateObjects(predicate, graph);
    }

    // <s> <p> <o>
    if (subject.termType !== 'Variable' && predicate.termType !== 'Variable' && object.termType !== 'Variable') {
      return this.getPredicateTriples(predicate, graph) /
        (this.getPredicateSubjects(predicate, graph) * this.getPredicateObjects(predicate, graph));
    }

    // In all other cases, return infinity
    return Number.POSITIVE_INFINITY;
  }

  public getTriples(graph: RDF.Term): number {
    if (graph.termType === 'Variable' || graph.termType === 'DefaultGraph') {
      if (this.data.unionDefaultGraph) {
        let sum = 0;
        for (const dataGraph of Object.values(this.data.graphs)) {
          sum += dataGraph.triples;
        }
        return sum;
      }
      return this.data.graphs.DEFAULT?.triples || 0;
    }
    return this.data.graphs[graph.value]?.triples || 0;
  }

  public getDistinctSubjects(graph: RDF.Term): number {
    return this.getGraphValue(graph, g => g.distinctSubjects);
  }

  public getDistinctObjects(graph: RDF.Term): number {
    return this.getGraphValue(graph, g => g.distinctObjects);
  }

  public getPredicateTriples(predicate: RDF.Term, graph: RDF.Term): number {
    return this.getGraphValue(graph, g => g.propertyPartitions[predicate.value]?.triples);
  }

  public getPredicateSubjects(predicate: RDF.Term, graph: RDF.Term): number {
    return this.getGraphValue(graph, g => g.propertyPartitions[predicate.value]?.distinctSubjects);
  }

  public getPredicateObjects(predicate: RDF.Term, graph: RDF.Term): number {
    return this.getGraphValue(graph, g => g.propertyPartitions[predicate.value]?.distinctObjects);
  }

  public getClassPartitionEntities(object: RDF.Term, graph: RDF.Term): number {
    return this.getGraphValue(graph, g => g.classPartitions[object.value]?.entities);
  }

  protected getGraphValue(graph: RDF.Term, graphValueSelector: (voidGraph: IVoidGraph) => number | undefined): number {
    let voidGraph: IVoidGraph | undefined;
    if (graph.termType === 'Variable' || graph.termType === 'DefaultGraph') {
      if (this.data.unionDefaultGraph) {
        let sum = 0;
        for (const dataGraph of Object.values(this.data.graphs)) {
          sum += graphValueSelector(dataGraph) ?? 0;
        }
        return sum;
      }
      voidGraph = this.data.graphs.DEFAULT;
    } else {
      voidGraph = this.data.graphs[graph.value];
    }
    return voidGraph ? graphValueSelector(voidGraph) ?? 0 : 0;
  }
}
