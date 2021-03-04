import type { IActorInitRdfDereferencePagedArgs } from '@comunica/actor-abstract-bindings-hash';
import { AbstractBindingsHash, AbstractFilterHash } from '@comunica/actor-abstract-bindings-hash';
import type { Bindings } from '@comunica/types';
import LRU = require('lru-cache');
import type { Algebra } from 'sparqlalgebrajs';
/**
 * A comunica Reduced Hash Query Operation Actor.
 */
export class ActorQueryOperationReducedHash extends AbstractBindingsHash<Algebra.Reduced>
  implements IActorInitRdfBindingHashArgs {
  public readonly cacheSize: number;

  public constructor(args: IActorInitRdfBindingHashArgs) {
    super(args, 'reduced');
  }

  /**
   * Create a new distinct filter function for the given hash algorithm and digest algorithm.
   * This will maintain an internal hash datastructure so that every bindings object only returns true once.
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public newHashFilter(): (bindings: Bindings) => boolean {
    const hashes = new LRU<string, boolean>({ max: this.cacheSize });
    return (bindings: Bindings) => {
      const hash: string = AbstractFilterHash.hash(bindings);
      return !hashes.has(hash) && hashes.set(hash, true);
    };
  }
}

export interface IActorInitRdfBindingHashArgs extends IActorInitRdfDereferencePagedArgs {
  cacheSize: number;
}
