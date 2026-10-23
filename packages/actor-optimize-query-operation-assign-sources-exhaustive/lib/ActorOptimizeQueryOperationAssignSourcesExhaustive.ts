import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import {
  assignOperationOriginalQueryString,
  assignOperationSource,
  passFullOperationToSource,
} from '@comunica/utils-query-operation';

/**
 * A comunica Assign Sources Exhaustive Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationAssignSourcesExhaustive extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const sources = action.context.get(KeysQueryOperation.querySources) ?? [];
    const serviceSources = action.context.get(KeysQueryOperation.serviceSources) ?? {};
    if (sources.length === 0 && Object.keys(serviceSources).length === 0) {
      return { operation: action.operation, context: action.context };
    }
    if (await passFullOperationToSource(action.operation, sources, action.context)) {
      return {
        operation: this.assignOriginalQueryString(assignOperationSource(action.operation, sources[0]), action.context),
        context: action.context,
      };
    }
    return {
      operation: this.assignExhaustive(algebraFactory, action.operation, sources, serviceSources),
      context: action.context,
    };
  }

  /**
   * Attach the original SPARQL query string to the given operation, so that its source can send it as-is.
   * Nothing is attached if the operation may differ from the query string, such as after applying initial bindings.
   * @param operation The full operation, which is equivalent to the parsed query string.
   * @param context The action context.
   * @return The operation, with the original query string attached if possible.
   */
  public assignOriginalQueryString(operation: Algebra.Operation, context: IActionContext): Algebra.Operation {
    const queryString = context.get(KeysInitQuery.queryString);
    if (!queryString || context.get(KeysInitQuery.queryFormat)?.language !== 'sparql' ||
      context.has(KeysInitQuery.initialBindings)) {
      return operation;
    }
    return assignOperationOriginalQueryString(operation, queryString);
  }

  /**
   * Assign the given sources to the leaves in the given query operation.
   * Leaves will be wrapped in a union operation and duplicated for every source.
   * The input operation will not be modified.
   * @param factory The algebra factory.
   * @param operation The input operation.
   * @param sources The sources to assign.
   * @param serviceSources Mapping of SERVICE names to sources.
   * @param withinService If we are assigning sources within the body of a SERVICE clause.
   */
  public assignExhaustive(
    factory: AlgebraFactory,
    operation: Algebra.Operation,
    sources: IQuerySourceWrapper[],
    serviceSources: Record<string, IQuerySourceWrapper>,
    withinService = false,
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.PATTERN]: {
        preVisitor: () => ({ continue: false }),
        transform: (patternOp) => {
          if (sources.length === 1) {
            return assignOperationSource(patternOp, sources[0]);
          }
          return factory.createUnion(sources
            .map(source => assignOperationSource(patternOp, source)));
        },
      },
      [Algebra.Types.SERVICE]: {
        preVisitor: () => ({ continue: false }),
        transform: (serviceOp) => {
          if (serviceOp.name.termType === 'NamedNode') {
            let source = serviceSources[serviceOp.name.value];
            if (source) {
              if (serviceOp.silent) {
                source = {
                  ...source,
                  context: (source.context ?? new ActionContext())
                    // Suppresses hard errors while dereferencing a SERVICE target that is a plain document.
                    .set(KeysInitQuery.lenient, true)
                    // Replaces errors from the source by a single empty solution.
                    .set(KeysQueryOperation.silent, true),
                };
              }
              const input = this.assignExhaustive(
                factory,
                serviceOp.input,
                [ source ],
                // Pass empty serviceSources, so that nested SERVICE clauses are delegated to this source.
                {},
                true,
              );
              return input;
            }
          }
          // Nested SERVICE clauses are delegated as-is to the source of the enclosing SERVICE clause,
          // which is responsible for resolving them.
          if (withinService && sources.length === 1) {
            return assignOperationSource(serviceOp, sources[0]);
          }
          return serviceOp;
        },
      },
      [Algebra.Types.CONSTRUCT]: {
        // The template holds quad patterns to produce, not patterns to match, so it gets no source.
        preVisitor: () => ({ ignoreKeys: new Set([ 'template', 'metadata' ]) }),
      },
      [Algebra.Types.LINK]: {
        preVisitor: () => ({ continue: false }),
        transform: (linkOp) => {
          if (sources.length === 1) {
            return assignOperationSource(linkOp, sources[0]);
          }
          return factory.createAlt(sources
            .map(source => assignOperationSource(linkOp, source)));
        },
      },
      [Algebra.Types.NPS]: {
        preVisitor: () => ({ continue: false }),
        transform: (npsOp) => {
          if (sources.length === 1) {
            return assignOperationSource(npsOp, sources[0]);
          }
          return factory.createAlt(sources
            .map(source => assignOperationSource(npsOp, source)));
        },
      },
      [Algebra.Types.DELETE_INSERT]: {
        // The delete and insert templates hold quad patterns to write, not to match, so they get no source.
        preVisitor: () => ({ ignoreKeys: new Set([ 'delete', 'insert', 'metadata' ]) }),
      },
    });
  }
}
