import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { Bindings, IQueryOperationResult, IActionContext } from '@comunica/types';
import { SingletonIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

/**
 * A comunica Path ZeroOrOne Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrOne extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_ONE_PATH);
  }

  public async runOperation(
    operation: Algebra.Path,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const predicate = <Algebra.ZeroOrOnePath> operation.predicate;

    const sVar = operation.subject.termType === 'Variable';
    const oVar = operation.object.termType === 'Variable';

    const extra: Bindings[] = [];

    // Both subject and object non-variables
    if (!sVar && !oVar && operation.subject.equals(operation.object)) {
      return {
        type: 'bindings',
        bindingsStream: new SingletonIterator(BF.bindings()),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 1 },
          canContainUndefs: false,
          variables: [],
        }),
      };
    }

    if (sVar && oVar) {
      throw new Error('ZeroOrOne path expressions with 2 variables not supported yet');
    }

    const distinct = await this.isPathArbitraryLengthDistinct(context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    if (operation.subject.termType === 'Variable') {
      extra.push(BF.bindings([[ operation.subject, operation.object ]]));
    }

    if (operation.object.termType === 'Variable') {
      extra.push(BF.bindings([[ operation.object, operation.subject ]]));
    }

    const single = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: ActorAbstractPath.FACTORY
        .createPath(operation.subject, predicate.path, operation.object, operation.graph),
    }));

    const bindingsStream = single.bindingsStream.prepend(extra);

    return {
      type: 'bindings',
      bindingsStream,
      metadata: single.metadata,
    };
  }
}
