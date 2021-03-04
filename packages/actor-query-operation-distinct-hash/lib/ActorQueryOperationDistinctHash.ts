import type { IActorInitRdfDereferencePagedArgs } from '@comunica/actor-abstract-bindings-hash';
import { AbstractBindingsHash, AbstractFilterHash } from '@comunica/actor-abstract-bindings-hash';
import type { Bindings } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Distinct Hash Query Operation Actor.
 */
export class ActorQueryOperationDistinctHash extends AbstractBindingsHash<Algebra.Distinct>
  implements IActorInitRdfDereferencePagedArgs {
  public constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args, 'distinct');
  }

  /**
     * Create a new distinct filter function for the given hash algorithm and digest algorithm.
     * This will maintain an internal hash datastructure so that every bindings object only returns true once.
     * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
     */
  public newHashFilter(): (bindings: Bindings) => boolean {
    const hashes: Record<string, boolean> = {};
    return (bindings: Bindings) => {
      const hash: string = AbstractFilterHash.hash(bindings);
      // eslint-disable-next-line no-return-assign
      return !(hash in hashes) && (hashes[hash] = true);
    };
  }
}
