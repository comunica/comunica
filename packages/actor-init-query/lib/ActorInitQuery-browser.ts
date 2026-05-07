import { ActorInitQueryBase } from './ActorInitQueryBase';

/* istanbul ignore next */
if (typeof process === 'undefined') {
  // Polyfills process.nextTick for readable-stream
  globalThis.process = require('process/');
}

/**
 * A comunica Query Init Actor that is safe for use in browser environments.
 */
export class ActorInitQuery extends ActorInitQueryBase {}
