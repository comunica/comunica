import { ActorInitQueryBase } from './ActorInitQueryBase';

/* istanbul ignore next */
// TODO: remove in next major. Kept as a fallback for bundlers that do not polyfill `process`.
if (typeof process === 'undefined') {
  // Polyfills process.nextTick for readable-stream
  globalThis.process = require('process/');
}

export class ActorInitQuery extends ActorInitQueryBase {}
