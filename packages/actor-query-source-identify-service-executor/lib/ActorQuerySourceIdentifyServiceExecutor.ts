import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, failTest, passTestVoidWithSideData } from '@comunica/core';
import type { ComunicaDataFactory, IServiceExecutor } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { getServiceExecutor } from '@comunica/utils-query-operation';
import { QuerySourceServiceExecutor } from './QuerySourceServiceExecutor';

/**
 * A comunica Service Executor Query Source Identify Actor.
 * It identifies IRIs for which a custom SERVICE executor is registered in the query context
 * as sources that evaluate SERVICE clauses through that executor.
 */
export class ActorQuerySourceIdentifyServiceExecutor extends ActorQuerySourceIdentify<IServiceExecutor> {
  public constructor(args: IActorQuerySourceIdentifyArgs<IServiceExecutor>) {
    super(args);
  }

  public async test(action: IActionQuerySourceIdentify): Promise<TestResult<IActorTest, IServiceExecutor>> {
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
    serviceExecutor: IServiceExecutor,
  ): Promise<IActorQuerySourceIdentifyOutput> {
    const value = <string> action.querySourceUnidentified.value;
    if (!serviceExecutor || typeof (<unknown> serviceExecutor) !== 'object' ||
      typeof serviceExecutor.execute !== 'function') {
      throw new TypeError(`The custom SERVICE executor for ${value} must be an object with an execute function, but got ${typeof serviceExecutor}. A serviceExecutorCreator must return executors synchronously.`);
    }
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    return {
      querySource: {
        source: new QuerySourceServiceExecutor(value, serviceExecutor, dataFactory, new AlgebraFactory(dataFactory)),
        context: action.querySourceUnidentified.context ?? new ActionContext(),
      },
    };
  }
}
