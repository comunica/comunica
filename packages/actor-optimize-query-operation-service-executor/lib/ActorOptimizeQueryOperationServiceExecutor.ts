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
    const services = ActorOptimizeQueryOperationServiceExecutor.getServices(action.operation);
    if (services.size === 0) {
      return { context: action.context, operation: action.operation };
    }

    let modified = false;
    const existingServiceSources = action.context.get(KeysQueryOperation.serviceSources);
    const serviceSources: Record<string, IQuerySourceWrapper> = existingServiceSources ?
        { ...existingServiceSources } :
        {};
    for (const [ service, serviceNamedNode ] of services) {
      const serviceExecutor = await this.getServiceExecutor(serviceNamedNode, action.context);
      if (serviceExecutor) {
        serviceSources[service] = {
          ...serviceSources[service],
          source: new QuerySourceServiceExecutor(service, serviceExecutor),
        };
        modified = true;
      }
    }

    return {
      context: modified ? action.context.set(KeysQueryOperation.serviceSources, serviceSources) : action.context,
      operation: action.operation,
    };
  }

  public static getServices(operation: Algebra.Operation): Map<string, RDF.NamedNode> {
    const services: Map<string, RDF.NamedNode> = new Map();
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.SERVICE]: {
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

  public async getServiceExecutor(
    serviceNamedNode: RDF.NamedNode,
    context: IActionContext,
  ): Promise<AsyncServiceExecutor | undefined> {
    if (context.has(KeysInitQuery.serviceExecutorCreator) && context.has(KeysInitQuery.serviceExecutors)) {
      throw new Error('Illegal simultaneous usage of serviceExecutorCreator and serviceExecutors in context');
    }
    if (context.has(KeysInitQuery.serviceExecutorCreator)) {
      return context.getSafe(KeysInitQuery.serviceExecutorCreator)(serviceNamedNode);
    }
    if (context.has(KeysInitQuery.serviceExecutors)) {
      return context.getSafe(KeysInitQuery.serviceExecutors)[serviceNamedNode.value];
    }
  }
}
