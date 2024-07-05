import type { IActionHashQuads, IActorHashQuadsOutput } from '@comunica/bus-hash-quads';
import { ActorHashQuads } from '@comunica/bus-hash-quads';
import type { IActorTest } from '@comunica/core';
import { sha1 } from 'hash.js';
import { quadToStringQuad } from 'rdf-string';

/**
 * A comunica Memento Http Actor.
 */
export class ActorHashQuadsSha1 extends ActorHashQuads {
  public async test(action: IActionHashQuads): Promise<IActorTest> {
    if (!action.allowHashCollisions) {
      throw new Error(`Actor ${this.name} can not provide hash functions without hash collisions`);
    }
    return true;
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
