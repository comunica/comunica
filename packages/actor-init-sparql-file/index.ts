import type { ActorInitSparql } from '@comunica/actor-init-sparql/lib/ActorInitSparql-browser';
import type { IQueryOptions } from '@comunica/actor-init-sparql/lib/QueryDynamic';
import { newEngineDynamicArged } from '@comunica/actor-init-sparql/lib/QueryDynamic';

/**
 * Create a new comunica engine from the default config.
 * @return {ActorInitSparql} A comunica engine.
 */
export function newEngine(): ActorInitSparql {
  return require('./engine-default.js');
}

/**
 * Create a new dynamic comunica engine from a given config file.
 * @param {IQueryOptions} options Optional options on how to instantiate the query evaluator.
 * @return {Promise<QueryEngine>} A promise that resolves to a fully wired comunica engine.
 */
export function newEngineDynamic(options?: IQueryOptions): Promise<ActorInitSparql> {
  return newEngineDynamicArged(options ?? {}, __dirname, `${__dirname}/config/config-default.json`);
}
