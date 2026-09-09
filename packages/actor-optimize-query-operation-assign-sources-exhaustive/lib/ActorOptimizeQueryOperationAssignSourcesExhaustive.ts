import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, passTestVoid } from '@comunica/core';
import type {
  ComunicaDataFactory,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  IQuerySourceWrapper,
  ServiceExecutorCallback,
} from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import {
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
    const serviceExecutors = action.context.get(KeysQueryOperation.serviceExecutors) ??
      action.context.get(KeysInitQuery.serviceExecutors) ?? {};
    if (sources.length === 0 && Object.keys(serviceSources).length === 0 && Object.keys(serviceExecutors).length === 0) {
      return { operation: action.operation, context: action.context };
    }
    if (await passFullOperationToSource(action.operation, sources, action.context)) {
      return {
        operation: assignOperationSource(action.operation, sources[0]),
        context: action.context,
      };
    }
    return {
      operation: this.assignExhaustive(algebraFactory, action.operation, sources, serviceSources, serviceExecutors),
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
   * @param serviceExecutors Mapping of SERVICE names to custom executors.
   */
  public assignExhaustive(
    factory: AlgebraFactory,
    operation: Algebra.Operation,
    sources: IQuerySourceWrapper[],
    serviceSources: Record<string, IQuerySourceWrapper>,
    serviceExecutors: Record<string, ServiceExecutorCallback> = {},
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
            const serviceIri = serviceOp.name.value;
            let source = serviceSources[serviceIri];
            if (!source && serviceExecutors[serviceIri]) {
              const executor = serviceExecutors[serviceIri];
              const customSource: IQuerySource = {
                referenceValue: serviceIri,
                getFilterFactor: async() => 1,
                getSelectorShape: async() => ({
                  type: 'operation',
                  operation: {
                    type: Algebra.Types.SERVICE,
                  },
                }),
                queryBindings: (_op: Algebra.Operation, context: IActionContext, options?: IQueryBindingsOptions) => {
                  return executor(serviceOp, options?.joinBindings, context) as any;
                },
                queryQuads: () => {
                  throw new Error('SERVICE sources do not support quads queries.');
                },
                queryVoid: () => {
                  throw new Error('SERVICE sources do not support void queries.');
                },
                queryBoolean: async() => {
                  throw new Error('SERVICE sources do not support boolean queries.');
                },
                toString: () => `ServiceExecutorSource(${serviceIri})`,
              };
              source = { source: customSource };
            }
            if (source) {
              if (serviceOp.silent) {
                source = {
                  ...source,
                  context: (source.context ?? new ActionContext()).set(KeysInitQuery.lenient, true),
                };
              }
              return this.assignExhaustive(
                factory,
                serviceOp.input,
                [ source ],
                // Pass empty serviceSources and serviceExecutors to ensure nested SERVICE clauses are not transformed.
                {},
                {},
              );
            }
          }
          return serviceOp;
        },
      },
      [Algebra.Types.CONSTRUCT]: {
        preVisitor: () => ({ continue: false }),
        transform: constructOp => factory.createConstruct(
          this.assignExhaustive(factory, constructOp.input, sources, serviceSources, serviceExecutors),
          constructOp.template,
        ),
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
        preVisitor: () => ({ continue: false }),
        transform: delInsOp => factory.createDeleteInsert(
          delInsOp.delete,
          delInsOp.insert,
          delInsOp.where ? this.assignExhaustive(factory, delInsOp.where, sources, serviceSources, serviceExecutors) : undefined,
        ),
      },
    });
  }
}
