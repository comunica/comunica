import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, FragmentSelectorShape, IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
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
    const serviceShapes = await this.getServiceShapes(serviceSources, action.context);
    if (!this.hasWholeServiceClauses(action.operation, serviceShapes) &&
      await passFullOperationToSource(action.operation, sources, action.context)) {
      return {
        operation: assignOperationSource(action.operation, sources[0]),
        context: action.context,
      };
    }
    return {
      operation: this.assignExhaustive(algebraFactory, action.operation, sources, serviceSources, false, serviceShapes),
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
   * @param serviceShapes Mapping of SERVICE names to the selector shapes of their sources, if these could be obtained.
   */
  public assignExhaustive(
    factory: AlgebraFactory,
    operation: Algebra.Operation,
    sources: IQuerySourceWrapper[],
    serviceSources: Record<string, IQuerySourceWrapper>,
    withinService = false,
    serviceShapes: Record<string, FragmentSelectorShape> = {},
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
              if (this.isWholeServiceClause(serviceOp, serviceShapes)) {
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
   * Obtain the selector shapes of the given SERVICE sources.
   * @param serviceSources Mapping of SERVICE names to sources.
   * @param context The action context.
   */
  public async getServiceShapes(
    serviceSources: Record<string, IQuerySourceWrapper>,
    context: IActionContext,
  ): Promise<Record<string, FragmentSelectorShape>> {
    const serviceShapes: Record<string, FragmentSelectorShape> = {};
    await Promise.all(Object.entries(serviceSources).map(async([ service, source ]) => {
      try {
        serviceShapes[service] = await source.source
          .getSelectorShape(source.context ? context.merge(source.context) : context);
      } catch {
        // Ignore unreachable sources
      }
    }));
    return serviceShapes;
  }

  /**
   * Check if the given operation contains a SERVICE clause that must be evaluated as a whole by its source.
   * @param operation An operation.
   * @param serviceShapes Mapping of SERVICE names to the selector shapes of their sources.
   */
  public hasWholeServiceClauses(
    operation: Algebra.Operation,
    serviceShapes: Record<string, FragmentSelectorShape>,
  ): boolean {
    let found = false;
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.SERVICE]: {
        preVisitor: (serviceOp) => {
          if (this.isWholeServiceClause(serviceOp, serviceShapes)) {
            found = true;
            return { shortcut: true };
          }
          return { continue: false };
        },
      },
    });
    return found;
  }

  /**
   * Check if the given SERVICE clause must be evaluated as a whole by its source.
   * @param serviceOp A SERVICE clause.
   * @param serviceShapes Mapping of SERVICE names to the selector shapes of their sources.
   */
  public isWholeServiceClause(
    serviceOp: Algebra.Service,
    serviceShapes: Record<string, FragmentSelectorShape>,
  ): boolean {
    if (serviceOp.name.termType !== 'NamedNode') {
      return false;
    }
    const shape = serviceShapes[serviceOp.name.value];
    return shape !== undefined && doesShapeAcceptWholeServiceClause(shape, serviceOp);
  }
}
