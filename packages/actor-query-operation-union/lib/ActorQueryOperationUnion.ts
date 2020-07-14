import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  BindingsStream,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from '@comunica/bus-query-operation';
import { ActionContext, IActorTest } from '@comunica/core';
import { UnionIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Union Query Operation Actor.
 */
export class ActorQueryOperationUnion extends ActorQueryOperationTypedMediated<Algebra.Union> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
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
    let totalItems = 0;
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

  public async testOperation(pattern: Algebra.Union, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Union, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const outputs: IActorQueryOperationOutputBindings[] = (await Promise.all([
      this.mediatorQueryOperation.mediate({ operation: pattern.left, context }),
      this.mediatorQueryOperation.mediate({ operation: pattern.right, context }),
    ])).map(ActorQueryOperation.getSafeBindings);

    const bindingsStream: BindingsStream = new UnionIterator(outputs.map(
      (output: IActorQueryOperationOutputBindings) => output.bindingsStream,
    ), { autoStart: false });
    const metadata: (() => Promise<{[id: string]: any}>) | undefined = outputs[0].metadata && outputs[1].metadata ?
      () =>
        Promise.all([
          (<() => Promise<{ [id: string]: any }>>outputs[0].metadata)(),
          (<() => Promise<{ [id: string]: any }>>outputs[1].metadata)(),
        ]).then(ActorQueryOperationUnion.unionMetadata) :
      undefined;
    const variables: string[] = ActorQueryOperationUnion.unionVariables(
      outputs.map((output: IActorQueryOperationOutputBindings) => output.variables),
    );
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
