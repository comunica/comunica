/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import { ActorInitQueryBase } from './ActorInitQueryBase';

/* istanbul ignore next */
if (typeof process === 'undefined') {
  // Polyfills process.nextTick for readable-stream
  globalThis.process = require('process/');
}

export class ActorInitQuery extends ActorInitQueryBase {}
