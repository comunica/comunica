import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { MetadataBindings } from './IMetadata';
import type { IQueryOperationResultBindings } from './IQueryOperationResult';

/**
 * A joinable entry.
 */
export interface IJoinEntry {
  /**
   * A (lazy) resolved bindings stream, from which metadata may be obtained.
   */
  output: IQueryOperationResultBindings;
  /**
   * The original query operation from which the bindings stream was produced.
   */
  operation: Algebra.Operation;
  /**
   * If the operation is not the original operation,
   * but is only created to simulate the output stream.
   * If this field is set, this usually means that the output should be directly used,
   * while using the operation would lead to sub-optimal performance.
   * This is for example set in bind-join-like actors.
   */
  operationModified?: true;
  /**
   * If pushing the join into the given operation must be preferred over using the output stream directly.
   * This will for example prefer bind-join-like actors.
   */
  operationRequired?: true;
}

/**
 * A joinable entry with resolved metadata.
 */
export type IJoinEntryWithMetadata = IJoinEntry & { metadata: MetadataBindings };

/**
 * A filter over the results of a join, which the join may already apply to intermediate results.
 */
export interface IJoinFilter {
  /**
   * The join operation of which the results are filtered.
   */
  join: Algebra.Operation;
  /**
   * The variables that the filter depends on.
   */
  variables: RDF.Variable[];
  /**
   * Check if bindings in which all variables of the filter are bound may pass it.
   * Bindings for which this is false certainly do not pass it.
   */
  test: (bindings: RDF.Bindings) => boolean;
}

/**
 * Represents a logical join type.
 */
export type LogicalJoinType = 'inner' | 'optional' | 'minus';
