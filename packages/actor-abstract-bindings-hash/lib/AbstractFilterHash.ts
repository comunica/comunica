import {
  ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {createHash, getHashes, Hash} from "crypto";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Hash Query Operation Actor.
 */
export abstract class AbstractFilterHash<T extends Algebra.Operation> extends ActorQueryOperationTypedMediated<T>
    implements IActorInitRdfDereferencePagedArgs {

  public readonly hashAlgorithm: string;
  public readonly digestAlgorithm: string;

  constructor(args: IActorInitRdfDereferencePagedArgs, operator: string) {
    super(args, operator);
    if (!AbstractFilterHash.doesHashAlgorithmExist(this.hashAlgorithm)) {
      throw new Error("The given hash algorithm is not present in this version of Node: " + this.hashAlgorithm);
    }
    if (!AbstractFilterHash.doesDigestAlgorithmExist(this.digestAlgorithm)) {
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
    return ["latin1", "hex", "base64"].indexOf(digestAlgorithm) >= 0;
  }

    /**
     * Create a string-based hash of the given object.
     * @param {string} hashAlgorithm A hash algorithm.
     * @param {string} digestAlgorithm A digest algorithm.
     * @param bindings The bindings to hash.
     * @return {string} The object's hash.
     */
  public static hash(hashAlgorithm: string, digestAlgorithm: string, bindings: Bindings): string {
    const hash: Hash = createHash(hashAlgorithm);
    hash.update(require('json-stable-stringify')(bindings.map(termToString)));
    return hash.digest(<any> digestAlgorithm);
  }

  public abstract async runOperation(pattern: T, context: ActionContext)
        : Promise<IActorQueryOperationOutputBindings>;
}

export interface IActorInitRdfDereferencePagedArgs extends IActorQueryOperationTypedMediatedArgs {
  hashAlgorithm: string;
  digestAlgorithm: string;
}
