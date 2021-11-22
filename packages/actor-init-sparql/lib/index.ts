export {
  ActorInitSparqlBase,
  IActorInitSparqlBaseArgs,
} from './ActorInitSparqlBase';
export * from './ActorInitSparql';
export * from './HttpServiceSparqlEndpoint';
export {
  newEngine,
  bindingsStreamToGraphQl,
  IQueryResultBindings,
  IQueryResultQuads,
  IQueryResultBoolean,
  IQueryResult,
} from './index-browser';
export * from './cli/CliArgsHandlerBase';
export * from './cli/CliArgsHandlerHttp';
export * from './cli/CliArgsHandlerQuery';
export * from './cli/ICliArgsHandler';
export * from './MemoryPhysicalQueryPlanLogger';

// eslint-disable-next-line no-duplicate-imports
import type { ActorInitSparql } from './ActorInitSparql';
import type { IQueryOptions } from './QueryDynamic';
import { newEngineDynamicArged } from './QueryDynamic';

/**
 * Create a new dynamic comunica engine from a given config file.
 * @param {IQueryOptions} options Optional options on how to instantiate the query evaluator.
 * @return {Promise<QueryEngine>} A promise that resolves to a fully wired comunica engine.
 */
export function newEngineDynamic(options?: IQueryOptions): Promise<ActorInitSparql> {
  return newEngineDynamicArged(options || {}, __dirname, `${__dirname}/../config/config-default.json`);
}
