import {ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {createHash, getHashes, Hash} from "crypto";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Distinct Hash Query Operation Actor.
 */
export class ActorQueryOperationDistinctHash extends ActorQueryOperationTypedMediated<Algebra.Distinct>
  implements IActorInitRdfDereferencePagedArgs {

  public readonly hashAlgorithm: string;
  public readonly digestAlgorithm: string;

  constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args, 'distinct');
    if (!ActorQueryOperationDistinctHash.doesHashAlgorithmExist(this.hashAlgorithm)) {
      throw new Error("The given hash algorithm is not present in this version of Node: " + this.hashAlgorithm);
    }
    if (!ActorQueryOperationDistinctHash.doesDigestAlgorithmExist(this.digestAlgorithm)) {
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
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public static newDistinctHashFilter(hashAlgorithm: string, digestAlgorithm: string): (bindings: Bindings) => boolean {
    const hashes: {[id: string]: boolean} = {};
    return (bindings: Bindings) => {
      const hash: string = ActorQueryOperationDistinctHash.hash(hashAlgorithm, digestAlgorithm, bindings);
      return !(hash in hashes) && (hashes[hash] = true);
    };
  }

  public async testOperation(pattern: Algebra.Distinct, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Distinct, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    const bindingsStream: BindingsStream = output.bindingsStream.filter(
      ActorQueryOperationDistinctHash.newDistinctHashFilter(this.hashAlgorithm, this.digestAlgorithm));
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}

export interface IActorInitRdfDereferencePagedArgs extends IActorQueryOperationTypedMediatedArgs {
  hashAlgorithm: string;
  digestAlgorithm: string;
}
