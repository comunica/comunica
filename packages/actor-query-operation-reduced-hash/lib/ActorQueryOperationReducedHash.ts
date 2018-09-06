import {
    ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
    IActorQueryOperationOutput, IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {createHash, getHashes, Hash} from "crypto";
import LRU = require("lru-cache");
import {Algebra} from "sparqlalgebrajs";
/**
 * A comunica Reduced Hash Query Operation Actor.
 */
export class ActorQueryOperationReducedHash extends ActorQueryOperationTypedMediated<Algebra.Reduced>
  implements IActorInitRdfReducedHashArgs {

  public readonly hashAlgorithm: string;
  public readonly digestAlgorithm: string;
  public readonly cachesize: number;

  constructor(args: IActorInitRdfReducedHashArgs) {
    super(args, 'reduced');
    if (!ActorQueryOperationReducedHash.doesHashAlgorithmExist(this.hashAlgorithm)) {
      throw new Error("The given hash algorithm is not present in this version of Node: " + this.hashAlgorithm);
    }
    if (!ActorQueryOperationReducedHash.doesDigestAlgorithmExist(this.digestAlgorithm)) {
      throw new Error("The given digest algorithm is not present in this version of Node: " + this.digestAlgorithm);
    }
  }

  /**
   * Check if the given hash algorithm (such as sha1) exists.
   * @param {string} hashAlgorithm A hash algorithm.
   * @return {boolean} If it exists.
   */
  public static doesHashAlgorithmExist(hashAlgorithm: string): boolean {
    return getHashes().indexOf(hashAlgorithm) >= 0;
  }

  /**
   * Check if the given digest (such as base64) algorithm exists.
   * @param {string} digestAlgorithm A digest algorithm.
   * @return {boolean} If it exists.
   */
  public static doesDigestAlgorithmExist(digestAlgorithm: string): boolean {
    return [ "latin1", "hex", "base64" ].indexOf(digestAlgorithm) >= 0;
  }

  /**
   * Create a string-based hash of the given object.
   * @param {string} hashAlgorithm A hash algorithm.
   * @param {string} digestAlgorithm A digest algorithm.
   * @param object The object to hash.
   * @return {string} The object's hash.
   */
  public static hash(hashAlgorithm: string, digestAlgorithm: string, object: any): string {
    const hash: Hash = createHash(hashAlgorithm);
    hash.update(require('json-stable-stringify')(object));
    return hash.digest(<any> digestAlgorithm);
  }

  /**
   * Create a new distinct filter function for the given hash algorithm and digest algorithm.
   * This will maintain an internal hash datastructure so that every bindings object only returns true once.
   *  @param {string} hashAlgorithm A hash algorithm.
   * @param {string} digestAlgorithm A digest algorithm.
   * @param {number} cachesize Max number of cashed hashes.
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public static newReducedHashFilter(hashAlgorithm: string, digestAlgorithm: string, cachesize: number)
      : (bindings: Bindings) => boolean {
    const hashes = new LRU<string, boolean>({ max: cachesize });
    return (bindings: Bindings) => {
      const hash: string = ActorQueryOperationReducedHash.hash(hashAlgorithm, digestAlgorithm, bindings);
      return !(hashes.has(hash)) && hashes.set(hash, true);
    };
  }

  public async testOperation(pattern: Algebra.Reduced, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Reduced, context: ActionContext) {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    const bindingsStream: BindingsStream = output.bindingsStream.filter(
        ActorQueryOperationReducedHash.newReducedHashFilter(this.hashAlgorithm, this.digestAlgorithm, this.cachesize));
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}

export interface IActorInitRdfReducedHashArgs extends IActorQueryOperationTypedMediatedArgs {
  hashAlgorithm: string;
  digestAlgorithm: string;
  cachesize: number;
}
