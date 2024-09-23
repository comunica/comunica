import type { IActionHashQuads, IActorHashQuadsOutput } from '@comunica/bus-hash-quads';
import { ActorHashQuads } from '@comunica/bus-hash-quads';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const MurmurHash3 = require('imurmurhash');

/**
 * A comunica Murmur Hash Quads Actor.
 */
export class ActorHashQuadsMurmur extends ActorHashQuads {
  public async test(_action: IActionHashQuads): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(_action: IActionHashQuads): Promise<IActorHashQuadsOutput> {
    return {
      hashFunction: (quad) => {
        const hash = MurmurHash3(quad.subject.value);
        hash.hash(quad.predicate.value);
        hash.hash(quad.object.value);
        hash.hash(quad.graph.value);
        return hash.result();
      },
    };
  }
}
