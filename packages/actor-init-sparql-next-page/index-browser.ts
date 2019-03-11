export * from './lib/ActorInitSparql-browser';
export {bindingsStreamToGraphQl} from "@comunica/actor-sparql-serialize-tree";

import {ActorInitSparql} from './lib/ActorInitSparql-browser';

/**
 * Create a new comunica engine from the default config.
 * @return {ActorInitSparql} A comunica engine.
 */
export function newEngine(): ActorInitSparql {
  return require('./engine-default.js');
}

// TODO: remove in 2.0.0, this is just here for backwards-compatibility
export function evaluateQuery(query: string, context?: any): any {
  return newEngine().query(query, context);
}
