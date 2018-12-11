import {ActorAbstractPath} from "@comunica/actor-abstract-path/lib/ActorAbstractPath";
import {
  ActorQueryOperation,
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {SingletonIterator} from "asynciterator";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Path ZeroOrOne Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrOne extends ActorAbstractPath {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_ONE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.ZeroOrOnePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';

    const extra: Bindings[] = [];

    // both subject and object non-variables
    if (!sVar && !oVar) {
      if (path.subject.equals(path.object)) {
        return { type: 'bindings', bindingsStream: new SingletonIterator(Bindings({})), variables: [] };
      }
    }

    if (sVar && oVar) {
      throw new Error('ZeroOrOne path expressions with 2 variables not supported yet');
    }

    if (sVar) {
      extra.push(Bindings({ [termToString(path.subject)]: path.object}));
    }

    if (oVar) {
      extra.push(Bindings({ [termToString(path.object)]: path.subject}));
    }

    const single = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate.path, path.object, path.graph),
    }));

    const bindingsStream = single.bindingsStream.prepend(extra);

    return { type: 'bindings', bindingsStream, variables: single.variables };
  }

}
