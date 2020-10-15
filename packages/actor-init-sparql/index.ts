export * from './lib/ActorInitSparql';
export * from './lib/HttpServiceSparqlEndpoint';
export {
  newEngine,
  evaluateQuery,
  bindingsStreamToGraphQl,
  IQueryResultBindings,
  IQueryResultQuads,
  IQueryResultBoolean,
  IQueryResult,
} from './index-browser';

// eslint-disable-next-line no-duplicate-imports
import type { ActorInitSparql } from './lib/ActorInitSparql';
import type { IQueryOptions } from './lib/QueryDynamic';
import { newEngineDynamicArged } from './lib/QueryDynamic';

/**
 * Create a new dynamic comunica engine from a given config file.
 * @param {IQueryOptions} options Optional options on how to instantiate the query evaluator.
 * @return {Promise<QueryEngine>} A promise that resolves to a fully wired comunica engine.
 */
export function newEngineDynamic(options?: IQueryOptions): Promise<ActorInitSparql> {
  return newEngineDynamicArged(options || {}, __dirname, `${__dirname}/config/config-default.json`);
}
