import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { QueryResultCardinality } from './IMetadata';

/**
 * A custom executor that evaluates SERVICE clauses targeting a given IRI, instead of querying that IRI as a source.
 */
export interface IServiceExecutor {
  /**
   * Evaluate the given SERVICE clause.
   * @param serviceOperation The SERVICE clause to evaluate.
   * @param bindings The bindings that the clause is joined with, if it is evaluated as part of a bind-join.
   * @param context The query context.
   * @return The solutions of the clause, as an iterable of bindings or as a bindings stream.
   */
  execute: (
    serviceOperation: Algebra.Service,
    bindings: RDF.Bindings | undefined,
    context: IActionContext,
  ) => Promise<BindingsStream | Iterable<RDF.Bindings>>;
  /**
   * Provide metadata about the solutions of the given SERVICE clause before it is evaluated,
   * such as their cardinality, which the query planner uses to plan joins.
   * An infinite cardinality is assumed if none is provided.
   * @param serviceOperation The SERVICE clause.
   * @param context The query context.
   */
  getMetadata?: (serviceOperation: Algebra.Service, context: IActionContext) => Promise<IServiceExecutorMetadata>;
}

/**
 * Metadata that a custom SERVICE executor can provide about the solutions of a SERVICE clause.
 */
export interface IServiceExecutorMetadata {
  /**
   * The number of solutions, exact or estimated.
   */
  cardinality?: QueryResultCardinality;
}

/**
 * A callback that creates the custom executor for a given SERVICE target IRI.
 * @param serviceNamedNode The IRI of a SERVICE target.
 * @return The executor for the target, or undefined if the target must be queried as a regular source.
 */
export type ServiceExecutorCreator = (serviceNamedNode: RDF.NamedNode) => IServiceExecutor | undefined;
