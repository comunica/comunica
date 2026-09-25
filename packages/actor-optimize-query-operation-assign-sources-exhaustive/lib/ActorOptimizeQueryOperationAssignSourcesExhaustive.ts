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
import { Algebra, AlgebraFactory, algebraTransformer, algebraUtils } from '@comunica/utils-algebra';
import {
  assignOperationSource,
  doesShapeAcceptWholeServiceClause,
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
        operation: assignOperationSource(action.operation, sources[0]),
        context: action.context,
      };
    }
    return {
      operation: this.assignExhaustive(
        algebraFactory,
        action.operation,
        sources,
        serviceSources,
        false,
        await this.getWholeServiceClauses(action.operation, serviceSources, action.context),
      ),
      // We only keep queryString in the context if we only have a single source that accepts the full operation.
      // In that case, the queryString can be sent to the source as-is.
      context: action.context
        .delete(KeysInitQuery.queryString),
    };
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
   * @param wholeServiceClauses SERVICE clauses in the operation that must be evaluated as a whole by their source.
   */
  public assignExhaustive(
    factory: AlgebraFactory,
    operation: Algebra.Operation,
    sources: IQuerySourceWrapper[],
    serviceSources: Record<string, IQuerySourceWrapper>,
    withinService = false,
    wholeServiceClauses: Set<Algebra.Service> = new Set(),
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
        transform: (serviceOp, origServiceOp) => {
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
              if (wholeServiceClauses.has(origServiceOp)) {
                return assignOperationSource(serviceOp, source);
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

  /**
   * Obtain the SERVICE clauses in the given operation that must be evaluated as a whole by their source.
   * @param operation An operation.
   * @param serviceSources Mapping of SERVICE names to sources.
   * @param context The action context.
   */
  public async getWholeServiceClauses(
    operation: Algebra.Operation,
    serviceSources: Record<string, IQuerySourceWrapper>,
    context: IActionContext,
  ): Promise<Set<Algebra.Service>> {
    const wholeServiceClauses = new Set<Algebra.Service>();
    await algebraTransformer().visitNodeAsync(operation, {
      [Algebra.Types.SERVICE]: {
        preVisitor: () => ({ continue: false }),
        visitor: async(serviceOp) => {
          const source = serviceOp.name.termType === 'NamedNode' ? serviceSources[serviceOp.name.value] : undefined;
          if (source) {
            try {
              const shape = await source.source
                .getSelectorShape(source.context ? context.merge(source.context) : context);
              if (doesShapeAcceptWholeServiceClause(shape, serviceOp)) {
                wholeServiceClauses.add(serviceOp);
              }
            } catch {
              // Ignore unreachable sources
            }
          }
        },
      },
    });
    return wholeServiceClauses;
  }
}
