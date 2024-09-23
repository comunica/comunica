import type { IActionHashBindings, IActorHashBindingsOutput } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { sha1 } from 'hash.js';

/**
 * A comunica Memento Http Actor.
 */
export class ActorHashBindingsSha1 extends ActorHashBindings {
  public async test(action: IActionHashBindings): Promise<TestResult<IActorTest>> {
    if (!action.allowHashCollisions) {
      return failTest(`Actor ${this.name} can not provide hash functions without hash collisions`);
    }
    return passTestVoid();
  }

  public async run(_action: IActionHashBindings): Promise<IActorHashBindingsOutput> {
    return {
      hashFunction: (bindings, variables) => {
        let hash = sha1();
        for (const variable of variables) {
          hash = hash.update(bindings.get(variable)?.value);
        }
        return hash.digest()[0];
      },
      hashCollisions: true,
    };
  }
}
