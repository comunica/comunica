import {Bindings} from "@comunica/bus-query-operation";
import LRU = require("lru-cache");
import {Algebra} from "sparqlalgebrajs";
import {AbstractBindingHash, IActorInitRdfDereferencePagedArgs} from "../../actor-abstract-bindings-hash";

/**
 * A comunica Reduced Hash Query Operation Actor.
 */
export class ActorQueryOperationReducedHash extends AbstractBindingHash<Algebra.Reduced>
  implements IActorInitRdfBindingHashArgs {
  public readonly cacheSize: number;

  constructor(args: IActorInitRdfBindingHashArgs) {
    super(args, 'reduced');
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
    const hashes = new LRU<string, boolean>({ max: this.cacheSize });
    return (bindings: Bindings) => {
      const hash: string = ActorQueryOperationReducedHash.hash(hashAlgorithm, digestAlgorithm, bindings);
      return !(hashes.has(hash)) && hashes.set(hash, true);
    };
  }
}

export interface IActorInitRdfBindingHashArgs extends IActorInitRdfDereferencePagedArgs {
  hashAlgorithm: string;
  digestAlgorithm: string;
  cacheSize: number;
}
