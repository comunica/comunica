import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
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

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Alt> path.predicate;

    const subOperations: IActorQueryOperationOutputBindings[] = (await Promise.all([
      this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate.left, path.object, path.graph),
      }),
      this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate.right, path.object, path.graph),
      }),
    ])).map(op => ActorQueryOperation.getSafeBindings(op));

    const bindingsStream = new UnionIterator(subOperations.map(op => op.bindingsStream), { autoStart: false });
    const variables = (<string[]> []).concat
      .apply([], subOperations.map(op => op.variables));

    return { type: 'bindings', bindingsStream, variables: [ ...new Set(variables) ], canContainUndefs: false };
  }
}
