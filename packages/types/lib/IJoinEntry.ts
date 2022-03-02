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
}

/**
 * A joinable entry with resolved metadata.
 */
export type IJoinEntryWithMetadata = IJoinEntry & { metadata: MetadataBindings };
