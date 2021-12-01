/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
export * from './ActorInitSparqlBase';
export { bindingsStreamToGraphQl } from '@comunica/actor-sparql-serialize-tree';
import type { ActorInitSparql } from './ActorInitSparql-browser';
export { ActorInitSparql } from './ActorInitSparql-browser';

/**
 * Create a new comunica engine from the default config.
 * @return {ActorInitSparql} A comunica engine.
 */
export function newEngine(): ActorInitSparql {
  return require('../engine-default.js');
}
