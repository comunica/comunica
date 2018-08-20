import {ActorAbstractPath} from "@comunica/actor-abstract-path";
import {
  ActorQueryOperation,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {RoundRobinUnionIterator} from "asynciterator-union";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Path Alt Query Operation Actor.
 */
export class ActorQueryOperationPathAlt extends ActorAbstractPath {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ALT);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
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
    ])).map((op) => ActorQueryOperation.getSafeBindings(op));

    const bindingsStream = new RoundRobinUnionIterator(subOperations.map((op) => op.bindingsStream));
    const variables = require('lodash.uniq')([].concat.apply([], subOperations.map((op) => op.variables)));

    return { type: 'bindings', bindingsStream, variables };
  }

}
