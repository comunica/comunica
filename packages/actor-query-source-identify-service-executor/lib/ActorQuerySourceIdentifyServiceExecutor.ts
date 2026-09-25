import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, failTest, passTestVoidWithSideData } from '@comunica/core';
import type { ServiceExecutor } from '@comunica/types';
import { getServiceExecutor } from '@comunica/utils-query-operation';
import { QuerySourceServiceExecutor } from './QuerySourceServiceExecutor';

/**
 * A comunica Service Executor Query Source Identify Actor.
 * It identifies IRIs for which a custom SERVICE executor is registered in the query context
 * as sources that evaluate SERVICE clauses through that executor.
 */
export class ActorQuerySourceIdentifyServiceExecutor extends ActorQuerySourceIdentify<ServiceExecutor> {
  public constructor(args: IActorQuerySourceIdentifyArgs<ServiceExecutor>) {
    super(args);
  }

  public async test(action: IActionQuerySourceIdentify): Promise<TestResult<IActorTest, ServiceExecutor>> {
    const value = action.querySourceUnidentified.value;
    if (typeof value !== 'string') {
      return failTest(`${this.name} requires a query source with an IRI value.`);
    }
    const serviceExecutor = getServiceExecutor(value, action.context);
    if (serviceExecutor === undefined) {
      return failTest(`${this.name} requires a custom SERVICE executor to be registered for ${value}.`);
    }
    return passTestVoidWithSideData(serviceExecutor);
  }

  public async run(
    action: IActionQuerySourceIdentify,
    serviceExecutor: ServiceExecutor,
  ): Promise<IActorQuerySourceIdentifyOutput> {
    const value = <string> action.querySourceUnidentified.value;
    if (typeof (<unknown> serviceExecutor) !== 'function') {
      throw new TypeError(`The serviceExecutorCreator must synchronously return a SERVICE executor or undefined for ${value}, but returned ${typeof serviceExecutor}`);
    }
    return {
      querySource: {
        source: new QuerySourceServiceExecutor(value, serviceExecutor),
        context: action.querySourceUnidentified.context ?? new ActionContext(),
      },
    };
  }
}
