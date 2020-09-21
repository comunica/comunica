/* eslint-disable unicorn/filename-case */
import type { ActorInitSparql } from '@comunica/actor-init-sparql/lib/ActorInitSparql-browser';

/**
 * Create a new comunica engine from the default config.
 * @return {ActorInitSparql} A comunica engine.
 */
export function newEngine(): ActorInitSparql {
  return require('./engine-browser.js');
}
