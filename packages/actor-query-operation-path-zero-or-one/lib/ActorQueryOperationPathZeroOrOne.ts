import { ActorAbstractPath } from '@comunica/actor-abstract-path/lib/ActorAbstractPath';
import {
  ActorQueryOperation,
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from '@comunica/bus-query-operation';
import { ActionContext } from '@comunica/core';
import { SingletonIterator } from 'asynciterator';
import { Map } from 'immutable';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path ZeroOrOne Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrOne extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_ONE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.ZeroOrOnePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';

    const extra: Bindings[] = [];

    // Both subject and object non-variables
    if (!sVar && !oVar) {
      if (path.subject.equals(path.object)) {
        return { type: 'bindings', bindingsStream: new SingletonIterator(Bindings({})), variables: []};
      }
    }

    if (sVar && oVar) {
      throw new Error('ZeroOrOne path expressions with 2 variables not supported yet');
    }

    // Such connectivity matching does not introduce duplicates (it does not incorporate any count of the number
    // of ways the connection can be made) even if the repeated path itself would otherwise result in duplicates.
    // https://www.w3.org/TR/sparql11-query/#propertypaths
    if (!context || !context.get('isPathArbitraryLengthDistinct')) {
      context = context ?
        context.set('isPathArbitraryLengthDistinct', true) :
        Map.of('isPathArbitraryLengthDistinct', true);
      return ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
        operation: ActorAbstractPath.FACTORY.createDistinct(path),
        context,
      }));
    }

    context = context.set('isPathArbitraryLengthDistinct', false);

    if (sVar) {
      extra.push(Bindings({ [termToString(path.subject)]: path.object }));
    }

    if (oVar) {
      extra.push(Bindings({ [termToString(path.object)]: path.subject }));
    }

    const single = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate.path, path.object, path.graph),
    }));

    const bindingsStream = single.bindingsStream.prepend(extra);

    return { type: 'bindings', bindingsStream, variables: single.variables };
  }
}
