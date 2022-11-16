import type { IActionHashBindings, IActorHashBindingsOutput } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActorTest } from '@comunica/core';
import { sha1 } from 'hash.js';
import { termToString } from 'rdf-string';

const canonicalize = require('canonicalize');

/**
 * A comunica Memento Http Actor.
 */
export class ActorHashBindingsSha1 extends ActorHashBindings {
  public async test(action: IActionHashBindings): Promise<IActorTest> {
    if (!action.allowHashCollisions) {
      throw new Error(`Actor ${this.name} can not provide hash functions without hash collisions`);
    }
    return true;
  }

  public async run(action: IActionHashBindings): Promise<IActorHashBindingsOutput> {
    return {
      hashFunction: bindings => sha1()
        .update(canonicalize(Object.fromEntries([ ...bindings ]
          .map(([ key, value ]) => [ termToString(key), termToString(value) ]))))
        .digest('hex'),
      hashCollisions: true,
    };
  }
}
