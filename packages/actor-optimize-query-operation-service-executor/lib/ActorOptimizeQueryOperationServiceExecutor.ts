import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationArgs,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { AsyncServiceExecutor, IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { QuerySourceServiceExecutor } from './QuerySourceServiceExecutor';

/**
 * A comunica SERVICE Executor Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationServiceExecutor extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const namedServices = ActorOptimizeQueryOperationServiceExecutor.getNamedServices(action.operation);
    const hasVariableServices = ActorOptimizeQueryOperationServiceExecutor.hasVariableServices(action.operation);
    if (namedServices.size === 0 && !hasVariableServices) {
      return { context: action.context, operation: action.operation };
    }
    ActorOptimizeQueryOperationServiceExecutor.validateServiceExecutorContext(action.context);

    let modified = false;
    const existingServiceSources = action.context.get(KeysQueryOperation.serviceSources);
    const serviceSources: Record<string, IQuerySourceWrapper> = existingServiceSources ?
        { ...existingServiceSources } :
        {};
    for (const [ service, serviceNamedNode ] of namedServices) {
      const serviceExecutor = await this.getServiceExecutor(serviceNamedNode, action.context);
      if (serviceExecutor) {
        serviceSources[service] = {
          ...serviceSources[service],
          source: new QuerySourceServiceExecutor(service, serviceExecutor),
        };
        modified = true;
      }
    }
    if (hasVariableServices && action.context.has(KeysInitQuery.serviceExecutors)) {
      const serviceExecutors = action.context.getSafe(KeysInitQuery.serviceExecutors);
      for (const [ service, serviceExecutor ] of Object.entries(serviceExecutors)) {
        serviceSources[service] = {
          ...serviceSources[service],
          source: new QuerySourceServiceExecutor(service, serviceExecutor),
        };
        modified = true;
      }
    }
    if (hasVariableServices && action.context.has(KeysInitQuery.serviceExecutorCreator)) {
      for (const serviceNamedNode of ActorOptimizeQueryOperationServiceExecutor
        .getVariableServiceValues(action.operation).values()) {
        const serviceExecutor = await this.getServiceExecutor(serviceNamedNode, action.context);
        if (serviceExecutor) {
          serviceSources[serviceNamedNode.value] = {
            ...serviceSources[serviceNamedNode.value],
            source: new QuerySourceServiceExecutor(serviceNamedNode.value, serviceExecutor),
          };
          modified = true;
        }
      }
    }

    return {
      context: modified ? action.context.set(KeysQueryOperation.serviceSources, serviceSources) : action.context,
      operation: action.operation,
    };
  }

  public static getNamedServices(operation: Algebra.Operation): Map<string, RDF.NamedNode> {
    const services: Map<string, RDF.NamedNode> = new Map();
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.SERVICE]: {
        // SERVICE inputs are delegated to that service, so nested SERVICE clauses must remain inside the input.
        preVisitor: () => ({ continue: false }),
        visitor: (serviceOperation) => {
          if (serviceOperation.name.termType === 'NamedNode') {
            services.set(serviceOperation.name.value, serviceOperation.name);
          }
        },
      },
    });
    return services;
  }

  public static hasVariableServices(operation: Algebra.Operation): boolean {
    let hasVariableServices = false;
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.SERVICE]: {
        preVisitor: () => ({ continue: false }),
        visitor: (serviceOperation) => {
          if (serviceOperation.name.termType === 'Variable') {
            hasVariableServices = true;
            return false;
          }
          return true;
        },
      },
    });
    return hasVariableServices;
  }

  public static getVariableServiceValues(operation: Algebra.Operation): Map<string, RDF.NamedNode> {
    const variables = new Set<string>();
    const services: Map<string, RDF.NamedNode> = new Map();
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.SERVICE]: {
        preVisitor: () => ({ continue: false }),
        visitor: (serviceOperation) => {
          if (serviceOperation.name.termType === 'Variable') {
            variables.add(serviceOperation.name.value);
          }
        },
      },
    });
    if (variables.size > 0) {
      algebraUtils.visitOperation(operation, {
        [Algebra.Types.VALUES]: {
          visitor: (valuesOperation) => {
            for (const bindings of valuesOperation.bindings) {
              for (const variable of variables) {
                const term = bindings[variable];
                if (term?.termType === 'NamedNode') {
                  services.set(term.value, term);
                }
              }
            }
          },
        },
      });
    }
    return services;
  }

  private static validateServiceExecutorContext(context: IActionContext): void {
    if (context.has(KeysInitQuery.serviceExecutorCreator) && context.has(KeysInitQuery.serviceExecutors)) {
      throw new Error('Illegal simultaneous usage of serviceExecutorCreator and serviceExecutors in context');
    }
  }

  public async getServiceExecutor(
    serviceNamedNode: RDF.NamedNode,
    context: IActionContext,
  ): Promise<AsyncServiceExecutor | undefined> {
    ActorOptimizeQueryOperationServiceExecutor.validateServiceExecutorContext(context);
    if (context.has(KeysInitQuery.serviceExecutorCreator)) {
      return context.getSafe(KeysInitQuery.serviceExecutorCreator)(serviceNamedNode);
    }
    if (context.has(KeysInitQuery.serviceExecutors)) {
      return context.getSafe(KeysInitQuery.serviceExecutors)[serviceNamedNode.value];
    }
  }
}
