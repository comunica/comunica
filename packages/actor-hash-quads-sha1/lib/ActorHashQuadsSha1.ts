import type { IActionHashQuads, IActorHashQuadsOutput } from '@comunica/bus-hash-quads';
import { ActorHashQuads } from '@comunica/bus-hash-quads';
import type { IActorTest } from '@comunica/core';
import { sha1 } from 'hash.js';
import { termToString } from 'rdf-string';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const canonicalize = require('canonicalize');

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
      hashFunction: quads => {
        return sha1()
        .update(canonicalize(Object.entries(quads)))
        .digest('hex')
      },
      hashCollisions: true,
    };
  }
}
