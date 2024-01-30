import type { Algebra } from 'sparqlalgebrajs';
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
}

/**
 * A joinable entry with resolved metadata.
 */
export type IJoinEntryWithMetadata = IJoinEntry & { metadata: MetadataBindings };
