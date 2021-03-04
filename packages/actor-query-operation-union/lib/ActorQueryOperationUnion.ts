import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { BindingsStream, IActorQueryOperationOutputBindings } from '@comunica/types';
import { UnionIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

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
    const withDuplicates = variables.reduce((acc, it) => [ ...acc, ...it ], []);
    return [ ...new Set(withDuplicates) ];
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the totalItems metadata value is properly calculated.
   * @param {{[p: string]: any}[]} metadatas Array of metadata.
   * @return {{[p: string]: any}} Union of the metadata.
   */
  public static unionMetadata(metadatas: Record<string, any>[]): Record<string, any> {
    let totalItems = 0;
    for (const metadata of metadatas) {
      if (metadata.totalItems && Number.isFinite(metadata.totalItems)) {
        totalItems += metadata.totalItems;
      } else {
        totalItems = Number.POSITIVE_INFINITY;
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
    const metadata: (() => Promise<Record<string, any>>) | undefined = outputs[0].metadata && outputs[1].metadata ?
      () =>
        Promise.all([
          (<() => Promise<Record<string, any>>>outputs[0].metadata)(),
          (<() => Promise<Record<string, any>>>outputs[1].metadata)(),
        ]).then(ActorQueryOperationUnion.unionMetadata) :
      undefined;
    const variables: string[] = ActorQueryOperationUnion.unionVariables(
      outputs.map((output: IActorQueryOperationOutputBindings) => output.variables),
    );
    const canContainUndefs = outputs.reduce((acc, val) => acc || val.canContainUndefs, false);
    return { type: 'bindings', bindingsStream, metadata, variables, canContainUndefs };
  }
}
