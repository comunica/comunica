import {ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";
import {RoundRobinUnionIterator} from "./RoundRobinUnionIterator";

/**
 * A comunica Union Query Operation Actor.
 */
export class ActorQueryOperationUnion extends ActorQueryOperationTypedMediated<Algebra.Union> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'union');
  }

  /**
   * Takes the union of the given double array variables.
   * Uniqueness is guaranteed.
   * @param {string[][]} variables Double array of variables to take the union of.
   * @return {string[]} The union of the given variables.
   */
  public static unionVariables(variables: string[][]): string[] {
    return require('lodash.union').apply({}, variables);
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the totalItems metadata value is properly calculated.
   * @param {{[p: string]: any}[]} metadatas Array of metadata.
   * @return {{[p: string]: any}} Union of the metadata.
   */
  public static unionMetadata(metadatas: {[id: string]: any}[]): {[id: string]: any} {
    let totalItems: number = 0;
    for (const metadata of metadatas) {
      if (metadata.totalItems && isFinite(metadata.totalItems)) {
        totalItems += metadata.totalItems;
      } else {
        totalItems = Infinity;
        break;
      }
    }
    return { totalItems };
  }

  public async testOperation(pattern: Algebra.Union, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Union, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutput> {
    const outputs: IActorQueryOperationOutput[] = await Promise.all([
      this.mediatorQueryOperation.mediate({ operation: pattern.left, context }),
      this.mediatorQueryOperation.mediate({ operation: pattern.right, context }),
    ]);
    const bindingsStream: BindingsStream = new RoundRobinUnionIterator(outputs.map(
      (output: IActorQueryOperationOutput) => output.bindingsStream));
    const metadata: Promise<{[id: string]: any}> = pattern.left.metadata && pattern.right.metadata
      ? Promise.all([pattern.left.metadata, pattern.right.metadata]).then(ActorQueryOperationUnion.unionMetadata)
      : null;
    const variables: string[] = ActorQueryOperationUnion.unionVariables(
      outputs.map((output: IActorQueryOperationOutput) => output.variables));
    return { bindingsStream, metadata, variables };
  }

}
