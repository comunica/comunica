import type { IActionHashQuads, IActorHashQuadsOutput } from '@comunica/bus-hash-quads';
import { ActorHashQuads } from '@comunica/bus-hash-quads';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { sha1 } from 'hash.js';
import { quadToStringQuad } from 'rdf-string';

/**
 * A comunica Memento Http Actor.
 */
export class ActorHashQuadsSha1 extends ActorHashQuads {
  public async test(action: IActionHashQuads): Promise<TestResult<IActorTest>> {
    if (!action.allowHashCollisions) {
      return failTest(() => `Actor ${this.name} can not provide hash functions without hash collisions`);
    }
    return passTestVoid();
  }

  public async run(_action: IActionHashQuads): Promise<IActorHashQuadsOutput> {
    return {
      hashFunction: quad => sha1()
        .update(JSON.stringify(quadToStringQuad(quad)))
        .digest('hex'),
      hashCollisions: true,
    };
  }
}
