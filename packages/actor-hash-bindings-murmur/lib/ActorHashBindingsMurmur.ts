import type { IActionHashBindings, IActorHashBindingsOutput } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import type { TestResult, IActorTest } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const MurmurHash3 = require('imurmurhash');

/**
 * A comunica Murmur Hash Bindings Actor.
 */
export class ActorHashBindingsMurmur extends ActorHashBindings {
  public async test(action: IActionHashBindings): Promise<TestResult<IActorTest>> {
    if (!action.allowHashCollisions) {
      return failTest(`Actor ${this.name} can not provide hash functions without hash collisions`);
    }
    return passTestVoid();
  }

  public async run(_action: IActionHashBindings): Promise<IActorHashBindingsOutput> {
    return {
      hashFunction: (bindings, variables) => {
        let hash = MurmurHash3();
        for (const variable of variables) {
          hash = hash.hash(bindings.get(variable)?.value ?? 'UNDEF');
        }
        return hash.result();
      },
      hashCollisions: true,
    };
  }
}
