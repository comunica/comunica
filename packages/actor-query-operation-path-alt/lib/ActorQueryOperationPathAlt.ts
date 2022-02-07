import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { ActorQueryOperationUnion } from '@comunica/actor-query-operation-union';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IQueryOperationResultBindings, IQueryOperationResult,
  IActionContext, MetadataBindings } from '@comunica/types';
import { UnionIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Alt Query Operation Actor.
 */
export class ActorQueryOperationPathAlt extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ALT);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const predicate = <Algebra.Alt> operation.predicate;

    const subOperations: IQueryOperationResultBindings[] = (await Promise.all(predicate.input
      .map(subPredicate => this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY
          .createPath(operation.subject, subPredicate, operation.object, operation.graph),
      }))))
      .map(ActorQueryOperation.getSafeBindings);

    const bindingsStream = new UnionIterator(subOperations.map(op => op.bindingsStream), { autoStart: false });
    const metadata: (() => Promise<MetadataBindings>) = () =>
      Promise.all(subOperations.map(output => output.metadata()))
        .then(subMeta => ActorQueryOperationUnion.unionMetadata(subMeta, true));

    return {
      type: 'bindings',
      bindingsStream,
      metadata,
    };
  }
}
