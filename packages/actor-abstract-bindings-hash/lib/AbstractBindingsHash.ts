import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
  BindingsStream,
  IActorQueryOperationOutputBindings,
} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";
import {AbstractFilterHash, IActorInitRdfDereferencePagedArgs} from "./AbstractFilterHash";

/**
 * A comunica Hash Query Operation Actor.
 */
export abstract class AbstractBindingsHash<T extends Algebra.Operation> extends ActorQueryOperationTypedMediated<T>
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
     * Create a new filter function for the given hash algorithm and digest algorithm.
     * The given filter depends on the Algebraic operation
     *  @param {string} hashAlgorithm A hash algorithm.
     * @param {string} digestAlgorithm A digest algorithm.
     * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
     */
  public abstract newHashFilter(hashAlgorithm: string, digestAlgorithm: string)
    : (bindings: Bindings) => boolean;

  public async testOperation(pattern: T, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: T, context: ActionContext)
      : Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    const bindingsStream: BindingsStream = output.bindingsStream.filter(
      this.newHashFilter(this.hashAlgorithm, this.digestAlgorithm));
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };

  }
}
