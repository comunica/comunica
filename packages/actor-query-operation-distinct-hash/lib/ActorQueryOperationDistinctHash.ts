<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import {AbstractBindingHash, IActorInitRdfDereferencePagedArgs} from "@comunica/actor-abstract-bindings-hash";
import {Bindings} from "@comunica/bus-query-operation";
import {Algebra} from "sparqlalgebrajs";
=======
import {Bindings} from "@comunica/bus-query-operation";
import {Algebra} from "sparqlalgebrajs";
import {AbstractBindingHash} from "../../actor-abstract-bindings-hash";
import {IActorInitRdfBindingHashArgs} from "../../actor-query-operation-reduced-hash";
>>>>>>> config fixed
=======
import {AbstractBindingHash, IActorInitRdfBindingHashArgs} from "@comunica/actor-abstract-bindings-hash";
=======
import {AbstractBindingHash, IActorInitRdfDereferencePagedArgs} from "@comunica/actor-abstract-bindings-hash";
>>>>>>> removing cacheSize from abstract-binding-hash
import {Bindings} from "@comunica/bus-query-operation";
import {Algebra} from "sparqlalgebrajs";
>>>>>>> requested changes

/**
 * A comunica Distinct Hash Query Operation Actor.
 */
export class ActorQueryOperationDistinctHash extends AbstractBindingHash<Algebra.Distinct>
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
      const hash: string = ActorQueryOperationDistinctHash.hash(hashAlgorithm, digestAlgorithm, bindings);
      return !(hash in hashes) && (hashes[hash] = true);
    };
  }
}
