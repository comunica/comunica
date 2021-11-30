import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { BindingsStream, IActorQueryOperationOutputBindings, IMetadata } from '@comunica/types';
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
    return [ ...new Set(variables.flat()) ];
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the cardinality metadata value is properly calculated.
   * @param {{[p: string]: any}[]} metadatas Array of metadata.
   * @return {{[p: string]: any}} Union of the metadata.
   */
  public static unionMetadata(metadatas: IMetadata[]): IMetadata {
    let cardinality = 0;
    for (const metadata of metadatas) {
      if ((metadata.cardinality && Number.isFinite(metadata.cardinality)) || metadata.cardinality === 0) {
        cardinality += metadata.cardinality;
      } else {
        cardinality = Number.POSITIVE_INFINITY;
        break;
      }
    }
    return {
      cardinality,
      canContainUndefs: metadatas.some(metadata => metadata.canContainUndefs),
    };
  }

  public async testOperation(pattern: Algebra.Union, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Union, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const outputs: IActorQueryOperationOutputBindings[] = (await Promise.all(pattern.input
      .map(subOperation => this.mediatorQueryOperation.mediate({ operation: subOperation, context }))))
      .map(ActorQueryOperation.getSafeBindings);

    const bindingsStream: BindingsStream = new UnionIterator(outputs.map(
      (output: IActorQueryOperationOutputBindings) => output.bindingsStream,
    ), { autoStart: false });

    const metadata: () => Promise<IMetadata> = () => Promise.all(outputs.map(output => output.metadata()))
      .then(ActorQueryOperationUnion.unionMetadata);
    const variables: string[] = ActorQueryOperationUnion.unionVariables(
      outputs.map((output: IActorQueryOperationOutputBindings) => output.variables),
    );
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
