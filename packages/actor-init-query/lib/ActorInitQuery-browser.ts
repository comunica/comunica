/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import { ActorInitQueryBase } from './ActorInitQueryBase';

/* istanbul ignore next */
if (typeof process === 'undefined') {
  // Polyfills process.nextTick for readable-stream
  global.process = require('process'); // eslint-disable-line import/no-nodejs-modules
}

export class ActorInitQuery extends ActorInitQueryBase {}
