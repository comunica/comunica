import type { Algebra } from 'sparqlalgebrajs';
import type { QueryResultCardinality } from './IMetadata';

/**
 * Abstraction to allow grouping of metadata by dataset, in case multiple datasets
 * expose their metadata through the same source URI and thus the same stream.
 */
export interface IDataset {
  /**
   * The unique URI of this dataset.
   */
  uri: string;
  /**
   * The URI from which this dataset was discovered.
   */
  source: string;
  /**
   * The regular expression that will be matched by all resource URIs within this dataset.
   * This is equivalent to void:uriPatternRegex from the VoID specification.
   */
  resourceUriPattern?: RegExp;
  /**
   * The exhaustive list of vocabularies used within this dataset, if provided.
   * For VoID datasets, this is the collection of all void:vocabulary values.
   */
  vocabularies?: string[];
  /**
   * Calculate the cardinality of the given operation within this dataset.
   * @param {Algebra.Operation} operation SPARQL algebra operation.
   * @returns {QueryResultCardinality} Upper bound for the cardinality.
   */
  getCardinality: (operation: Algebra.Operation) => Promise<QueryResultCardinality>;
}
