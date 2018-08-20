import {ActorAbstractPath} from "@comunica/actor-abstract-path";
import {
  ActorQueryOperation,
  Bindings, IActorQueryOperationOutput, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {ActionContext, Mediator} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Path Seq Query Operation Actor.
 */
export class ActorQueryOperationPathSeq extends ActorAbstractPath {

  public readonly mediatorJoin: Mediator<ActorRdfJoin,
    IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  constructor(args: IActorQueryOperationPathSeq) {
    super(args, Algebra.types.SEQ);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Seq> path.predicate;
    const blank = this.generateBlankNode(path);
    const blankName = termToString(blank);

    const subOperations: IActorQueryOperationOutputBindings[] = (await Promise.all([
      this.mediatorQueryOperation.mediate({
        context, operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate.left, blank, path.graph),
      }),
      this.mediatorQueryOperation.mediate({
        context, operation: ActorAbstractPath.FACTORY.createPath(blank, predicate.right, path.object, path.graph),
      }),
    ])).map((op) => ActorQueryOperation.getSafeBindings(op));

    const join = ActorQueryOperation.getSafeBindings(await this.mediatorJoin.mediate({ entries: subOperations }));
    // remove the generated blank nodes from the bindings
    const bindingsStream = join.bindingsStream.transform<Bindings>({
      transform: (item, next) => {
        bindingsStream._push(item.delete(blankName));
        next(null);
      },
    });

    return { type: 'bindings', bindingsStream, variables: join.variables };
  }

}

export interface IActorQueryOperationPathSeq extends IActorQueryOperationTypedMediatedArgs {
  mediatorJoin: Mediator<ActorRdfJoin, IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
