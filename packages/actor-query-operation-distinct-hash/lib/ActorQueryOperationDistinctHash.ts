import {AbstractBindingsHash, AbstractFilterHash,
  IActorInitRdfDereferencePagedArgs} from "@comunica/actor-abstract-bindings-hash";
import {Bindings} from "@comunica/bus-query-operation";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Distinct Hash Query Operation Actor.
 */
export class ActorQueryOperationDistinctHash extends AbstractBindingsHash<Algebra.Distinct>
  implements IActorInitRdfDereferencePagedArgs {

  constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args, 'distinct');
  }

    /**
     * Create a new distinct filter function for the given hash algorithm and digest algorithm.
     * This will maintain an internal hash datastructure so that every bindings object only returns true once.
     * @param {string} hashAlgorithm A hash algorithm.
     * @param {string} digestAlgorithm A digest algorithm.
     * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
     */
  public newHashFilter(hashAlgorithm: string, digestAlgorithm: string)
        : (bindings: Bindings) => boolean {
    const hashes: {[id: string]: boolean} = {};
    return (bindings: Bindings) => {
      const hash: string = AbstractFilterHash.hash(hashAlgorithm, digestAlgorithm, bindings);
      return !(hash in hashes) && (hashes[hash] = true);
    };
  }
}
