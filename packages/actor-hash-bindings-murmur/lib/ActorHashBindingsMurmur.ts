import type { IActionHashBindings, IActorHashBindingsOutput } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const MurmurHash3 = require('imurmurhash');

/**
 * A comunica Murmur Hash Bindings Actor.
 */
export class ActorHashBindingsMurmur extends ActorHashBindings {
  public async test(_action: IActionHashBindings): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(_action: IActionHashBindings): Promise<IActorHashBindingsOutput> {
    return {
      hashFunction: (bindings, variables) => {
        let hash = MurmurHash3();
        for (const variable of variables) {
          hash = hash.hash(bindings.get(variable)?.value ?? 'UNDEF');
        }
        // Convert the uint32 to an int32, so it remains a small integer
        // eslint-disable-next-line unicorn/prefer-math-trunc
        return hash.result() | 0;
      },
    };
  }
}
