import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { RDF_TYPE } from './Definitions';
import type { IVoidDataset } from './Types';

/**
 * Estimate triple pattern cardinality, by first applying heuristics based on void:uriPatternRegex
 * and void:vocabulary data when available, before performing estimations using the formulae.
 */
export function estimatePatternCardinality(
  dataset: IVoidDataset,
  pattern: Algebra.Pattern,
): RDF.QueryResultCardinality {
  const estimate: RDF.QueryResultCardinality = { type: 'exact', value: 0 };
  if (matchPatternVocabularies(dataset, pattern) && matchPatternResourceUris(dataset, pattern)) {
    const value = estimatePatternCardinalityRaw(dataset, pattern);
    if (value > 0) {
      estimate.value = value;
      estimate.type = 'estimate';
    }
  }
  return estimate;
}

/**
 * Test whether the given albegra pattern could produce answers from a dataset with the specified resourceUriPattern.
 * Specifically, if both subject and object are IRIs, but neither matches the resourceUriPattern,
 * then the dataset does not contain any RDF resources that would satisfy the pattern.
 */
export function matchPatternResourceUris(dataset: IVoidDataset, pattern: Algebra.Pattern): boolean {
  return (
    !dataset.uriRegexPattern ||
    (pattern.subject.termType !== 'NamedNode' || dataset.uriRegexPattern.test(pattern.subject.value)) ||
    (pattern.object.termType !== 'NamedNode' || dataset.uriRegexPattern.test(pattern.object.value))
  );
}

/**
 * Test whether the given algebra pattern could produce answers from a dataset with the specified vocabularies.
 * Specifically, if the predicate if an IRI but it does not use any of the specifiec vocabularies,
 * then the pattern cannot be answered by the dataset.
 */
export function matchPatternVocabularies(dataset: IVoidDataset, pattern: Algebra.Pattern): boolean {
  if (dataset.vocabularies !== undefined && pattern.predicate.termType === 'NamedNode') {
    return dataset.vocabularies.some(vc => pattern.predicate.value.startsWith(vc));
  }
  return true;
}

/**
 * Estimate the triple pattern cardinality using the formulae from Hagedorn, Stefan, et al.
 * "Resource Planning for SPARQL Query Execution on Data Sharing Platforms." COLD 1264 (2014)
 */
export function estimatePatternCardinalityRaw(dataset: IVoidDataset, pattern: Algebra.Pattern): number {
  // ?s rdf:type <o> (from the original paper)
  // ?s rdf:type _:o (also accounted for)
  if (
    pattern.subject.termType === 'Variable' &&
    pattern.predicate.termType === 'NamedNode' &&
    pattern.predicate.value === RDF_TYPE &&
    (pattern.object.termType === 'NamedNode' || pattern.object.termType === 'BlankNode')
  ) {
    return getClassPartitionEntities(dataset, pattern.object);
  }
  // ?s ?p ?o (from the original paper)
  if (
    pattern.subject.termType === 'Variable' &&
    pattern.predicate.termType === 'Variable' &&
    pattern.object.termType === 'Variable'
  ) {
    return dataset.triples;
  }
  // <s> ?p ?o (from the original paper)
  // _:s ?p ?o (also accounted for)
  // <s> ?p "o"
  // _:s ?p "o"
  if (
    (pattern.subject.termType === 'NamedNode' || pattern.subject.termType === 'BlankNode') &&
    pattern.predicate.termType === 'Variable' &&
    (pattern.object.termType === 'Variable' || pattern.object.termType === 'Literal')
  ) {
    const distinctSubjects = getDistinctSubjects(dataset);
    if (distinctSubjects > 0) {
      return dataset.triples / distinctSubjects;
    }
  }
  // ?s <p> ?o (from the original paper)
  // ?s <p> "o" (also accounted for)
  if (
    pattern.subject.termType === 'Variable' &&
    pattern.predicate.termType === 'NamedNode' &&
    (pattern.object.termType === 'Variable' || pattern.object.termType === 'Literal')
  ) {
    return getPredicateTriples(dataset, pattern.predicate);
  }
  // ?s ?p <o> (from the original paper)
  // ?s ?p _:o (also accounted for)
  // ?s ?p "o"
  if (
    pattern.subject.termType === 'Variable' &&
    pattern.predicate.termType === 'Variable' &&
    (
      pattern.object.termType === 'NamedNode' ||
      pattern.object.termType === 'BlankNode' ||
      pattern.object.termType === 'Literal'
    )
  ) {
    const distinctObjects = getDistinctObjects(dataset);
    if (distinctObjects > 0) {
      return dataset.triples / distinctObjects;
    }
  }
  // <s> <p> ?o (from the original paper)
  // _:s <p> ?o (also accounted for)
  // <s> <p> "o"
  // _:s <p> "o"
  if (
    (pattern.subject.termType === 'NamedNode' || pattern.subject.termType === 'BlankNode') &&
    pattern.predicate.termType === 'NamedNode' &&
    (pattern.object.termType === 'Variable' || pattern.object.termType === 'Literal')
  ) {
    const predicateTriples = getPredicateTriples(dataset, pattern.predicate);
    const predicateSubjects = getPredicateSubjects(dataset, pattern.predicate);
    return predicateSubjects > 0 ? predicateTriples / predicateSubjects : predicateTriples;
  }
  // <s> ?p <o> (from the original paper)
  // _:s ?p _:o (also accounted for)
  // _:s ?p <o>
  // <s> ?p _:o
  if (
    (pattern.subject.termType === 'NamedNode' || pattern.subject.termType === 'BlankNode') &&
    pattern.predicate.termType === 'Variable' &&
    (pattern.object.termType === 'NamedNode' || pattern.object.termType === 'BlankNode')
  ) {
    const distinctSubjects = getDistinctSubjects(dataset);
    const distinctObjects = getDistinctObjects(dataset);
    if (distinctSubjects > 0 && distinctObjects > 0) {
      return dataset.triples / (distinctSubjects * distinctObjects);
    }
  }
  // ?s <p> <o> (from the original paper)
  // ?s <p> _:o (also accounted for)
  if (
    pattern.subject.termType === 'Variable' &&
    pattern.predicate.termType === 'NamedNode' &&
    (pattern.object.termType === 'NamedNode' || pattern.object.termType === 'BlankNode')
  ) {
    const predicateTriples = getPredicateTriples(dataset, pattern.predicate);
    const predicateObjects = getPredicateObjects(dataset, pattern.predicate);
    return predicateObjects > 0 ? predicateTriples / predicateObjects : predicateTriples;
  }
  // <s> <p> <o> (from the original paper)
  // _:s <p> _:o (also accounted for)
  // <s> <p> _:o
  // _:s <p> <o>
  if (
    (pattern.subject.termType === 'NamedNode' || pattern.subject.termType === 'BlankNode') &&
    pattern.predicate.termType === 'NamedNode' &&
    (pattern.object.termType === 'NamedNode' || pattern.object.termType === 'BlankNode')
  ) {
    const predicateTriples = getPredicateTriples(dataset, pattern.predicate);
    const predicateSubjects = getPredicateSubjects(dataset, pattern.predicate);
    const predicateObjects = getPredicateObjects(dataset, pattern.predicate);
    return predicateSubjects > 0 && predicateObjects > 0 ?
      predicateTriples / (predicateSubjects * predicateObjects) :
      predicateTriples;
  }

  // In all other cases, return the total triple count as absolute upper bound
  return dataset.triples;
}

/**
 * Attempts to retrieve void:distinctObjects, falls back to void:entities.
 * Returns the total triple count as fallback upper bound.
 */
export function getDistinctObjects(dataset: IVoidDataset): number {
  return dataset.distinctObjects ?? dataset.entities ?? dataset.triples;
}

/**
 * Attempts to retrieve void:distinctSubjects, falls back to void:entities.
 * Returns the total triple count as fallback upper bound.
 */
export function getDistinctSubjects(dataset: IVoidDataset): number {
  return dataset.distinctSubjects ?? dataset.entities ?? dataset.triples;
}

/**
 * Attempts to retrieve void:distinctObjects from a void:propertyPartition.
 * Returns 0 when property partitions are available but the specific property is not.
 * Falls back to total triple count as upper bound without any property partitions.
 */
export function getPredicateObjects(dataset: IVoidDataset, predicate: RDF.NamedNode): number {
  if (dataset.propertyPartitions) {
    const partition = dataset.propertyPartitions[predicate.value];
    return partition?.distinctObjects ?? partition?.triples ?? 0;
  }
  return dataset.triples;
}

/**
 * Attempts to retrieve void:distinctSubjects from a void:propertyPartition.
 * Returns 0 when property partitions are available but the specific property is not.
 * Falls back to total triple count as upper bound without any property partitions.
 */
export function getPredicateSubjects(dataset: IVoidDataset, predicate: RDF.NamedNode): number {
  if (dataset.propertyPartitions) {
    const partition = dataset.propertyPartitions[predicate.value];
    return partition?.distinctSubjects ?? partition?.triples ?? 0;
  }
  return dataset.triples;
}

/**
 * Attempts to retrieve void:triples from a void:propertyPartition.
 * Returns 0 when property partitions are available but the specific property is not.
 * Falls back to total triple count as upper bound without any property partitions.
 */
export function getPredicateTriples(dataset: IVoidDataset, predicate: RDF.NamedNode): number {
  if (dataset.propertyPartitions) {
    return dataset.propertyPartitions[predicate.value]?.triples ?? 0;
  }
  return dataset.triples;
}

/**
 * Attempts to retrieve void:entities from a void:classPartition.
 * Returns 0 when class partitions are available but the specified class is not.
 * Falls back to estimation using void:entities and void:classes on the dataset,
 * and finally total dataset triple count as upper bound.
 */
export function getClassPartitionEntities(dataset: IVoidDataset, object: RDF.NamedNode | RDF.BlankNode): number {
  if (dataset.classPartitions) {
    return dataset.classPartitions[object.value]?.entities ?? 0;
  }
  if (dataset.entities !== undefined && dataset.classes) {
    return dataset.entities / dataset.classes;
  }
  return dataset.triples;
}
