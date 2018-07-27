import {ActorQueryOperation, ActorQueryOperationTypedMediated,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {ActionContext, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Join Query Operation Actor.
 */
export class ActorQueryOperationJoin extends ActorQueryOperationTypedMediated<Algebra.Join> {

  public readonly mediatorJoin: Mediator<ActorRdfJoin,
    IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  constructor(args: IActorQueryOperationJoinArgs) {
    super(args, 'join');
  }

  public async testOperation(pattern: Algebra.Join, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Join, context: ActionContext)
    : Promise<IActorQueryOperationOutput> {
    const left = this.mediatorQueryOperation.mediate({ operation: pattern.left, context });
    const right = this.mediatorQueryOperation.mediate({ operation: pattern.right, context });

    return this.mediatorJoin.mediate({
      entries: [ActorQueryOperation.getSafeBindings(await left), ActorQueryOperation.getSafeBindings(await right)],
    });
  }

}

export interface IActorQueryOperationJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorJoin: Mediator<ActorRdfJoin, IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
