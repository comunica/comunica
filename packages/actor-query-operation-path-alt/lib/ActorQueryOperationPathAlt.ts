import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation, getMetadata,
} from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { UnionIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Alt Query Operation Actor.
 */
export class ActorQueryOperationPathAlt extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ALT);
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the cardinality metadata value is properly calculated.
   * @param {{[p: string]: any}[]} metadatas Array of metadata.
   * @return {{[p: string]: any}} Union of the metadata.
   */
  public static unionMetadata(metadatas: Record<string, any>[]): Record<string, any> {
    let cardinality = 0;
    for (const metadata of metadatas) {
      if ((metadata.cardinality && Number.isFinite(metadata.cardinality)) || metadata.cardinality === 0) {
        cardinality += metadata.cardinality;
      } else {
        cardinality = Number.POSITIVE_INFINITY;
        break;
      }
    }
    return { cardinality };
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Alt> path.predicate;

    const subOperations: IActorQueryOperationOutputBindings[] = (await Promise.all(predicate.input
      .map(subPredicate => this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(path.subject, subPredicate, path.object, path.graph),
      }))))
      .map(ActorQueryOperation.getSafeBindings);

    const bindingsStream = new UnionIterator(subOperations.map(op => op.bindingsStream), { autoStart: false });
    const metadata: (() => Promise<Record<string, any>>) | undefined = subOperations.every(output => output.metadata) ?
      () =>
        Promise.all(subOperations.map(output => getMetadata(output)))
          .then(ActorQueryOperationPathAlt.unionMetadata) :
      undefined;
    const variables = (<string[]> []).concat
      .apply([], subOperations.map(op => op.variables));

    return {
      type: 'bindings',
      bindingsStream,
      variables: [ ...new Set(variables) ],
      metadata,
      canContainUndefs: false,
    };
  }
}
